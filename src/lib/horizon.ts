import type {
  CalibrationState,
  FrozenFrame,
  HorizonAssessment,
  HorizonAzimuthPoint,
  HorizonPoint,
  HorizonProfile,
  SectorObstacle,
  SunPosition
} from "./types";

export function normalizeAzimuth(azimuthDeg: number) {
  return ((azimuthDeg % 360) + 360) % 360;
}

export function getSectorObstacleForAzimuth(sectors: SectorObstacle[], azimuthDeg: number) {
  return sectors.find((sector) => {
    const delta = Math.abs((((azimuthDeg - sector.centerAzimuthDeg + 540) % 360) - 180));
    return delta <= sector.widthDeg / 2;
  });
}

export function sortHorizonPoints(points: HorizonPoint[]) {
  return [...points].sort((a, b) => a.x - b.x);
}

export function interpolateHorizonY(points: HorizonPoint[], x: number) {
  if (points.length < 2) {
    return null;
  }
  const sorted = sortHorizonPoints(points);
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const a = sorted[index];
    const b = sorted[index + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + (b.y - a.y) * t;
    }
  }
  return null;
}

export function sortAzimuthPoints(points: HorizonAzimuthPoint[]) {
  return [...points].sort((a, b) => a.azimuthDeg - b.azimuthDeg);
}

export function getHorizonElevationAt(profile: HorizonProfile, azimuthDeg: number) {
  const sorted = sortAzimuthPoints(profile.azimuthPoints);
  if (sorted.length >= 2) {
    const target = normalizeAzimuth(azimuthDeg);
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const a = sorted[index];
      const b = sorted[index + 1];
      if (target >= a.azimuthDeg && target <= b.azimuthDeg) {
        const t = (target - a.azimuthDeg) / (b.azimuthDeg - a.azimuthDeg || 1);
        return a.elevationDeg + (b.elevationDeg - a.elevationDeg) * t;
      }
    }
    if (target < sorted[0].azimuthDeg) {
      return sorted[0].elevationDeg;
    }
    return sorted[sorted.length - 1].elevationDeg;
  }

  return getSectorObstacleForAzimuth(profile.manualObstacles, azimuthDeg)?.elevationDeg ?? null;
}

export function assessSunVisibility(sun: SunPosition, profile: HorizonProfile): HorizonAssessment {
  const horizonElevationDeg = getHorizonElevationAt(profile, sun.azimuthDeg);
  if (horizonElevationDeg === null) {
    return {
      state: "unknown",
      marginDeg: null,
      horizonElevationDeg: null,
      label: "Sin horizonte calibrado"
    };
  }

  const marginDeg = sun.altitudeDeg - horizonElevationDeg;
  if (marginDeg > 0.5) {
    return {
      state: "visible",
      marginDeg,
      horizonElevationDeg,
      label: `Visible · margen ${marginDeg.toFixed(1)}°`
    };
  }
  if (marginDeg > -0.4) {
    return {
      state: "grazing",
      marginDeg,
      horizonElevationDeg,
      label: "Rozando horizonte"
    };
  }
  return {
    state: "hidden",
    marginDeg,
    horizonElevationDeg,
    label: `Oculto por relieve · ${Math.abs(marginDeg).toFixed(1)}°`
  };
}

export function viewportPointToAzimuthElevation(
  point: { x: number; y: number },
  frame: FrozenFrame,
  calibration: CalibrationState
) {
  const cx = frame.width / 2;
  const cy = frame.height / 2;
  const nx = (point.x - cx) / cx;
  const ny = (point.y - cy) / cy;
  const azimuthDeg =
    normalizeAzimuth(
      frame.heading +
        calibration.azimuthOffsetDeg +
        (Math.atan(nx * Math.tan((calibration.horizontalFovDeg * Math.PI) / 360)) * 180) / Math.PI
    );
  const elevationDeg =
    frame.pitch +
    calibration.pitchOffsetDeg -
    (Math.atan(ny * Math.tan((calibration.verticalFovDeg * Math.PI) / 360)) * 180) / Math.PI;

  return {
    azimuthDeg,
    elevationDeg
  };
}
