import { useEffect, useRef, useState } from "react";
import type { CalibrationState, OrientationOverrideState, OrientationReading } from "../lib/types";

type DeviceOrientationWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type OrientationOptions = {
  smoothingFactor: number;
  fpsCap: number;
  override: OrientationOverrideState | null;
  paused: boolean;
};

function normalizeHeading(value: number) {
  return ((value % 360) + 360) % 360;
}

function signedHeadingDelta(target: number, current: number) {
  return ((target - current + 540) % 360) - 180;
}

function blendHeading(current: number, next: number, alpha: number) {
  return normalizeHeading(current + signedHeadingDelta(next, current) * alpha);
}

function deriveConfidence(params: {
  permission: OrientationReading["permission"];
  heading: number | null;
  pitch: number | null;
  jitterDeg: number;
  eventRateHz: number;
  staleMs: number;
}) {
  const { permission, heading, pitch, jitterDeg, eventRateHz, staleMs } = params;
  if (permission !== "granted" || heading === null || pitch === null) {
    return { confidence: "low" as const, accuracy: "none" as const, sensorScore: 10 };
  }

  let sensorScore = 100;
  if (staleMs > 1500) sensorScore -= 35;
  if (eventRateHz < 3) sensorScore -= 20;
  if (eventRateHz < 1) sensorScore -= 25;
  if (jitterDeg > 6) sensorScore -= 28;
  else if (jitterDeg > 3) sensorScore -= 14;
  if (Math.abs(pitch) > 88) sensorScore -= 12;

  sensorScore = Math.max(0, Math.min(100, sensorScore));
  if (sensorScore >= 78) {
    return { confidence: "high" as const, accuracy: "good" as const, sensorScore };
  }
  if (sensorScore >= 50) {
    return { confidence: "medium" as const, accuracy: "medium" as const, sensorScore };
  }
  return { confidence: "low" as const, accuracy: "low" as const, sensorScore };
}

export function useDeviceOrientation(
  calibration: CalibrationState,
  options: OrientationOptions
): OrientationReading {
  const [permission, setPermission] = useState<OrientationReading["permission"]>("idle");
  const [reading, setReading] = useState<OrientationReading>({
    heading: null,
    pitch: null,
    roll: null,
    accuracy: "none",
    confidence: "low",
    sensorScore: 0,
    jitterDeg: 0,
    eventRateHz: 0,
    staleMs: 0,
    permission: "idle",
    available: typeof window !== "undefined" && "DeviceOrientationEvent" in window,
    source: "sensor",
    requestPermission: async () => undefined
  });

  const filteredRef = useRef<{ heading: number | null; pitch: number | null; roll: number | null }>({
    heading: null,
    pitch: null,
    roll: null
  });
  const recentTimesRef = useRef<number[]>([]);
  const recentJitterRef = useRef<number[]>([]);
  const lastEmittedAtRef = useRef(0);
  const lastSensorAtRef = useRef(0);

  const requestPermission = async () => {
    if (!("DeviceOrientationEvent" in window)) {
      setPermission("unsupported");
      return;
    }
    const OrientationEventCtor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    try {
      if (OrientationEventCtor.requestPermission) {
        const result = await OrientationEventCtor.requestPermission();
        setPermission(result === "granted" ? "granted" : "denied");
        return;
      }
      setPermission("granted");
    } catch {
      setPermission("denied");
    }
  };

  useEffect(() => {
    if (options.override?.enabled) {
      setReading({
        heading: options.override.heading,
        pitch: options.override.pitch,
        roll: options.override.roll,
        accuracy: "good",
        confidence: options.override.source === "simulated" ? "high" : "medium",
        sensorScore: options.override.source === "simulated" ? 100 : 70,
        jitterDeg: 0,
        eventRateHz: 0,
        staleMs: 0,
        permission: "granted",
        available: true,
        source: options.override.source,
        requestPermission
      });
      return;
    }

    setReading((current) => ({ ...current, permission, requestPermission, source: "sensor" }));
  }, [options.override, permission]);

  useEffect(() => {
    if (options.override?.enabled || options.paused) {
      return;
    }

    if (!("DeviceOrientationEvent" in window)) {
      setReading((current) => ({
        ...current,
        permission: "unsupported",
        available: false,
        requestPermission
      }));
      return;
    }

    const minInterval = 1000 / Math.max(5, options.fpsCap);
    const alpha = Math.min(1, Math.max(0.02, options.smoothingFactor));

    const onOrientation = (event: Event) => {
      const now = performance.now();
      const readingEvent = event as DeviceOrientationWithCompass;
      const nextHeading =
        typeof readingEvent.webkitCompassHeading === "number"
          ? normalizeHeading(readingEvent.webkitCompassHeading)
          : readingEvent.alpha !== null
            ? normalizeHeading(360 - readingEvent.alpha)
            : null;
      const nextPitch = readingEvent.beta ?? null;
      const nextRoll = readingEvent.gamma ?? null;

      if (nextHeading === null || nextPitch === null || nextRoll === null) {
        return;
      }

      const previous = filteredRef.current;
      filteredRef.current = {
        heading:
          previous.heading === null ? nextHeading : blendHeading(previous.heading, nextHeading, alpha),
        pitch: previous.pitch === null ? nextPitch : previous.pitch + (nextPitch - previous.pitch) * alpha,
        roll: previous.roll === null ? nextRoll : previous.roll + (nextRoll - previous.roll) * alpha
      };

      recentTimesRef.current = [...recentTimesRef.current.slice(-15), now];
      const lastPitch = previous.pitch ?? nextPitch;
      const lastHeading = previous.heading ?? nextHeading;
      const jitterSample = Math.hypot(signedHeadingDelta(nextHeading, lastHeading), nextPitch - lastPitch);
      recentJitterRef.current = [...recentJitterRef.current.slice(-19), jitterSample];
      lastSensorAtRef.current = now;

      if (now - lastEmittedAtRef.current < minInterval) {
        return;
      }
      lastEmittedAtRef.current = now;

      const timeSpan =
        recentTimesRef.current.length > 1
          ? (recentTimesRef.current[recentTimesRef.current.length - 1] - recentTimesRef.current[0]) / 1000
          : 0;
      const eventRateHz = timeSpan > 0 ? (recentTimesRef.current.length - 1) / timeSpan : 0;
      const jitterDeg =
        recentJitterRef.current.reduce((sum, value) => sum + value, 0) /
        Math.max(1, recentJitterRef.current.length);
      const staleMs = Math.max(0, performance.now() - lastSensorAtRef.current);
      const derived = deriveConfidence({
        permission,
        heading: filteredRef.current.heading,
        pitch: filteredRef.current.pitch,
        jitterDeg,
        eventRateHz,
        staleMs
      });

      setReading({
        heading: filteredRef.current.heading,
        pitch: filteredRef.current.pitch,
        roll: filteredRef.current.roll,
        accuracy: derived.accuracy,
        confidence: derived.confidence,
        sensorScore: derived.sensorScore,
        jitterDeg,
        eventRateHz,
        staleMs,
        permission,
        available: true,
        source: "sensor",
        requestPermission
      });
    };

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, [calibration, options.fpsCap, options.override, options.paused, options.smoothingFactor, permission]);

  useEffect(() => {
    if (options.override?.enabled) {
      return;
    }
    const interval = window.setInterval(() => {
      setReading((current) => {
        if (current.source !== "sensor") {
          return current;
        }
        const staleMs = Math.max(0, performance.now() - lastSensorAtRef.current);
        const derived = deriveConfidence({
          permission,
          heading: current.heading,
          pitch: current.pitch,
          jitterDeg: current.jitterDeg,
          eventRateHz: current.eventRateHz,
          staleMs
        });
        return {
          ...current,
          staleMs,
          confidence: derived.confidence,
          accuracy: derived.accuracy,
          sensorScore: derived.sensorScore,
          permission,
          requestPermission
        };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [options.override, permission]);

  return reading;
}
