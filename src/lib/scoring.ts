import { getHorizonElevationAt } from "./horizon";
import { degreesToCardinal, getSunPosition } from "./solar";
import type { HorizonProfile, SiteScore } from "./types";

type ScoreInput = {
  latitude: number;
  longitude: number;
  maximumTimestamp: number;
  sunAltitudeAtMax: number;
  maxAzimuth: number;
  totality: boolean;
  sunsetMinutesAfterMax: number;
  obstacleElevationDeg: number;
  horizonMarginDeg: number;
  horizonProfile: HorizonProfile;
};

function evaluateVisibleWindow(
  latitude: number,
  longitude: number,
  maximumTimestamp: number,
  horizonProfile: HorizonProfile
) {
  let visibleMinutes = 0;
  let stableVisibleRun = 0;
  let currentRun = 0;
  let minMargin = Number.POSITIVE_INFINITY;

  for (let minute = -15; minute <= 15; minute += 1) {
    const sun = getSunPosition(latitude, longitude, new Date(maximumTimestamp + minute * 60000));
    const horizonElevation = getHorizonElevationAt(horizonProfile, sun.azimuthDeg) ?? 0;
    const margin = sun.altitudeDeg - horizonElevation;
    minMargin = Math.min(minMargin, margin);
    if (margin > 0.2) {
      visibleMinutes += 1;
      currentRun += 1;
      stableVisibleRun = Math.max(stableVisibleRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return {
    visibleMinutes,
    stableVisibleRun,
    minMargin: Number.isFinite(minMargin) ? minMargin : 0
  };
}

export function getSiteScore(input: ScoreInput): SiteScore {
  let score = 55;
  const reasons: string[] = [];
  const windowScore = evaluateVisibleWindow(
    input.latitude,
    input.longitude,
    input.maximumTimestamp,
    input.horizonProfile
  );

  if (input.totality) {
    score += 20;
    reasons.push("Dentro de la franja aproximada de totalidad.");
  } else {
    reasons.push("Punto fuera de totalidad: conviene valorar desplazamiento.");
  }

  if (input.sunAltitudeAtMax > 10) {
    score += 16;
    reasons.push(`Sol relativamente cómodo para ser atardecer: ${input.sunAltitudeAtMax.toFixed(1)}°.`);
  } else if (input.sunAltitudeAtMax > 5) {
    score += 8;
    reasons.push(`Sol bajo pero todavía utilizable: ${input.sunAltitudeAtMax.toFixed(1)}°.`);
  } else {
    score -= 12;
    reasons.push(`El Sol cae a solo ${input.sunAltitudeAtMax.toFixed(1)}°.`);
  }

  if (input.horizonMarginDeg > 2.5) {
    score += 14;
    reasons.push("Margen limpio sobre el horizonte perfilado.");
  } else if (input.horizonMarginDeg > 0) {
    score += 2;
    reasons.push("Margen justo respecto al perfil del horizonte.");
  } else {
    score -= 22;
    reasons.push(`Una obstrucción de ${input.obstacleElevationDeg.toFixed(1)}° ya lo taparía.`);
  }

  if (input.sunsetMinutesAfterMax < 25) {
    score -= 8;
    reasons.push("Queda poco margen hasta la puesta.");
  } else {
    score += 4;
    reasons.push("Hay margen razonable antes de la puesta.");
  }

  if (windowScore.visibleMinutes >= 24) {
    score += 10;
    reasons.push("Tramo visible amplio alrededor del máximo.");
  } else if (windowScore.visibleMinutes >= 14) {
    score += 4;
    reasons.push("El Sol se mantiene visible buena parte del tramo crítico.");
  } else {
    score -= 10;
    reasons.push("El relieve compromete el tramo útil alrededor del máximo.");
  }

  if (windowScore.stableVisibleRun >= 12) {
    score += 5;
    reasons.push("Visibilidad estable sin cortes bruscos.");
  } else if (windowScore.stableVisibleRun < 6) {
    score -= 6;
    reasons.push("La visibilidad cerca del máximo es inestable.");
  }

  reasons.push(`Dirección principal: ${degreesToCardinal(input.maxAzimuth)}.`);
  reasons.push(`Ventana visible estimada: ${windowScore.visibleMinutes} min.`);
  reasons.push(`Margen mínimo estimado: ${windowScore.minMargin.toFixed(1)}°.`);

  if (score >= 85) {
    return { label: "Excelente", numeric: score, reasons };
  }
  if (score >= 68) {
    return { label: "Bueno", numeric: score, reasons };
  }
  if (score >= 50) {
    return { label: "Justo", numeric: score, reasons };
  }
  return { label: "Malo", numeric: score, reasons };
}
