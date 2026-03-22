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

export function projectSunToViewport(
  sun: SunPosition,
  orientation: OrientationReading,
  calibration: CalibrationState,
  width: number,
  height: number
) {
  const heading = orientation.heading ?? 0;
  const pitch = orientation.pitch ?? 0;
  const roll = orientation.roll ?? 0;

  const deltaAz = normalizeAngle(sun.azimuthDeg - (heading + calibration.azimuthOffsetDeg));
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
