import type { CalibrationState, OrientationReading, SunPosition } from "./types";

export function normalizeAngle(value: number) {
  let result = ((value + 180) % 360 + 360) % 360 - 180;
  if (result < -180) {
    result += 360;
  }
  return result;
}

const HEMISPHERE_CLIP_DEG = 95;
const VERTICAL_CLIP_PAD_DEG = 8;

export type ProjectedTarget = {
  x: number;
  y: number;
  withinFrame: boolean;
  inFrontHemisphere: boolean;
  withinVerticalClip: boolean;
  shouldRender: boolean;
  deltaAz: number;
  deltaAlt: number;
  angularError: number;
  roll: number;
};

export function projectSunToViewport(
  sun: SunPosition,
  orientation: OrientationReading,
  calibration: CalibrationState,
  width: number,
  height: number
): ProjectedTarget {
  const heading = orientation.heading ?? 0;
  const pitch = orientation.pitch ?? 0;
  const roll = orientation.roll ?? 0;

  const deltaAz = normalizeAngle(sun.azimuthDeg - heading);
  const deltaAlt = sun.altitudeDeg - (pitch + calibration.pitchOffsetDeg);

  const halfHFov = calibration.horizontalFovDeg / 2;
  const halfVFov = calibration.verticalFovDeg / 2;
  const inFrontHemisphere = Math.abs(deltaAz) <= HEMISPHERE_CLIP_DEG;
  const withinVerticalClip = Math.abs(deltaAlt - calibration.horizonOffsetDeg) <= halfVFov + VERTICAL_CLIP_PAD_DEG;

  const x = width / 2 + (Math.tan((deltaAz * Math.PI) / 180) / Math.tan((halfHFov * Math.PI) / 180)) * (width / 2);
  const y =
    height / 2 -
    (Math.tan(((deltaAlt - calibration.horizonOffsetDeg) * Math.PI) / 180) / Math.tan((halfVFov * Math.PI) / 180)) *
      (height / 2);

  const withinFrame = inFrontHemisphere && withinVerticalClip && x >= 0 && x <= width && y >= 0 && y <= height;
  const angularError = Math.sqrt(deltaAz * deltaAz + deltaAlt * deltaAlt);

  return {
    x,
    y,
    withinFrame,
    inFrontHemisphere,
    withinVerticalClip,
    shouldRender: inFrontHemisphere && withinVerticalClip,
    deltaAz,
    deltaAlt,
    angularError,
    roll
  };
}

export function buildProjectedPath(
  targets: SunPosition[],
  orientation: OrientationReading,
  calibration: CalibrationState,
  width: number,
  height: number
) {
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];

  targets.forEach((target) => {
    const projected = projectSunToViewport(target, orientation, calibration, width, height);
    const visible = projected.shouldRender && projected.withinFrame;

    if (visible) {
      current.push({ x: projected.x, y: projected.y });
      return;
    }

    if (current.length >= 2) {
      segments.push(current);
    }
    current = [];
  });

  if (current.length >= 2) {
    segments.push(current);
  }

  return segments;
}

export function buildHorizonPath(
  orientation: OrientationReading,
  calibration: CalibrationState,
  width: number,
  height: number
) {
  const correctedHeading = orientation.heading ?? 0;
  const targets: SunPosition[] = [];
  for (let offset = -90; offset <= 90; offset += 6) {
    targets.push({
      azimuthDeg: correctedHeading + offset,
      altitudeDeg: 0,
      hourAngleDeg: 0,
      declinationDeg: 0
    });
  }
  return buildProjectedPath(targets, orientation, calibration, width, height);
}
