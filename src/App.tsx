import { useEffect, useMemo, useRef } from "react";
import { LiveView } from "./components/LiveView";
import { SafetyNotice } from "./components/SafetyNotice";
import { SimulationView } from "./components/SimulationView";
import { ECLIPSE_SCOUTING_TIMES, TALVEILA_CENTER } from "./data/scouting";
import { useCamera } from "./hooks/useCamera";
import { useDeviceOrientation } from "./hooks/useDeviceOrientation";
import { useGeolocation } from "./hooks/useGeolocation";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { usePageVisibility } from "./hooks/usePageVisibility";
import { getSunPosition } from "./lib/solar";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_CALIBRATION,
  type AppSettings,
  type CalibrationState,
  type ManualLocation,
  type OrientationOverrideState
} from "./lib/types";

export default function App() {
  const [mode, setMode] = useLocalStorage<"camera" | "simulation">("scouting-mode", "camera");
  const [calibration, setCalibration] = useLocalStorage<CalibrationState>("active-calibration", DEFAULT_CALIBRATION);
  const [settings] = useLocalStorage<AppSettings>("app-settings", {
    ...DEFAULT_APP_SETTINGS,
    smoothingFactor: 0.18,
    fpsCap: 16,
    alignmentThresholdDeg: 2.2,
    lowPowerMode: true,
    hapticsEnabled: false
  });
  const [orientationOverride] = useLocalStorage<OrientationOverrideState>("orientation-override", {
    enabled: false,
    heading: 290,
    pitch: 6,
    roll: 0,
    source: "manual"
  });
  const [fallbackLocation] = useLocalStorage<ManualLocation>("manual-location", TALVEILA_CENTER);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pageVisible = usePageVisibility();

  const geo = useGeolocation(TALVEILA_CENTER);
  const orientation = useDeviceOrientation(calibration, {
    smoothingFactor: settings.smoothingFactor,
    fpsCap: settings.fpsCap,
    override: orientationOverride.enabled ? orientationOverride : null,
    paused: !pageVisible
  });
  const camera = useCamera(videoRef);
  const activeLocation = geo.location ?? fallbackLocation;

  const sunAt1930 = useMemo(
    () => getSunPosition(activeLocation.latitude, activeLocation.longitude, ECLIPSE_SCOUTING_TIMES.precheck),
    [activeLocation.latitude, activeLocation.longitude]
  );
  const sunAt2030 = useMemo(
    () => getSunPosition(activeLocation.latitude, activeLocation.longitude, ECLIPSE_SCOUTING_TIMES.maximum),
    [activeLocation.latitude, activeLocation.longitude]
  );
  const trajectorySamples = useMemo(() => {
    const samples = [];
    const start = ECLIPSE_SCOUTING_TIMES.precheck.getTime();
    const end = ECLIPSE_SCOUTING_TIMES.maximum.getTime();
    for (let timestamp = start; timestamp <= end; timestamp += 5 * 60000) {
      samples.push(getSunPosition(activeLocation.latitude, activeLocation.longitude, new Date(timestamp)));
    }
    return samples;
  }, [activeLocation.latitude, activeLocation.longitude]);

  const scoutingStatus = useMemo<{ label: "VISIBLE" | "JUSTO" | "TAPADO"; tone: "ok" | "warn" | "bad"; hint: string }>(() => {
    const marginDeg = sunAt2030.altitudeDeg;
    if (marginDeg > 3) {
      return {
        label: "VISIBLE",
        tone: "ok" as const,
        hint: "Si la loma queda por debajo del punto de las 20:30, el sitio sirve."
      };
    }
    if (marginDeg >= 0) {
      return {
        label: "JUSTO",
        tone: "warn" as const,
        hint: "Cualquier loma baja puede taparlo cerca del máximo."
      };
    }
    return {
      label: "TAPADO",
      tone: "bad" as const,
      hint: "Con horizonte real a 0°, el Sol ya llega demasiado bajo."
    };
  }, [sunAt2030.altitudeDeg]);

  const fallbackToSimulation = mode === "simulation" || orientation.permission !== "granted" || camera.permission === "denied";

  const adjustHorizon = async () => {
    if (orientation.permission !== "granted") {
      await orientation.requestPermission();
    }
    if (orientation.pitch === null) {
      return;
    }
    setCalibration({
      ...calibration,
      azimuthOffsetDeg: 0,
      pitchOffsetDeg: -orientation.pitch,
      lastSolarCalibrationTs: Date.now(),
      estimatedPrecisionDeg: Math.max(1, Math.min(8, orientation.jitterDeg + 1.5))
    });
  };

  useEffect(() => {
    if (!pageVisible || mode !== "camera" || camera.stream || camera.permission === "denied") {
      return;
    }
    camera.start().catch(() => undefined);
  }, [camera.permission, camera.stream, mode, pageVisible]);

  return (
    <div className="app-shell theme-day">
      <header className="topbar">
        <div>
          <p className="eyebrow">12 agosto 2026 · Talveila, Soria</p>
          <h1>Scout Eclipse Talveila</h1>
        </div>
        <span className="pill">19:30 → 20:30</span>
      </header>

      <SafetyNotice />

      <main className="layout without-panel scouting-layout">
        <section className="viewer-column">
          {fallbackToSimulation ? (
            <SimulationView
              location={activeLocation}
              sunAt1930={sunAt1930}
              sunAt2030={sunAt2030}
              trajectorySamples={trajectorySamples}
              scoutingStatus={scoutingStatus}
              onAdjustHorizon={adjustHorizon}
              onToggleMode={() => setMode(mode === "camera" ? "simulation" : "camera")}
            />
          ) : (
            <LiveView
              videoRef={videoRef}
              camera={camera}
              orientation={orientation}
              calibration={calibration}
              location={activeLocation}
              sunAt1930={sunAt1930}
              sunAt2030={sunAt2030}
              trajectorySamples={trajectorySamples}
              scoutingStatus={scoutingStatus}
              onAdjustHorizon={adjustHorizon}
              onToggleMode={() => setMode(mode === "camera" ? "simulation" : "camera")}
            />
          )}
        </section>
      </main>
    </div>
  );
}
