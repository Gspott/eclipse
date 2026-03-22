import { SAMPLE_LOCATIONS } from "../data/locations";
import { degreesToCardinal, findSunset, getSunPosition } from "./solar";
import type { ContactMoment, LocationSummary, ManualLocation } from "./types";

const TOTALITY_AXIS = [
  { latitude: 43.544, longitude: -6.535 },
  { latitude: 42.81, longitude: -4.84 },
  { latitude: 41.79, longitude: -1.12 },
  { latitude: 40.37, longitude: 0.41 }
];

const BAND_HALF_WIDTH_KM = 80;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const x = (bLon - aLon) * 85;
  const y = (bLat - aLat) * 111.32;
  return Math.sqrt(x * x + y * y);
}

function projectToAxis(latitude: number, longitude: number) {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestAlong = 0;
  let accumulated = 0;
  let totalLength = 0;

  for (let index = 0; index < TOTALITY_AXIS.length - 1; index += 1) {
    totalLength += distanceKm(
      TOTALITY_AXIS[index].latitude,
      TOTALITY_AXIS[index].longitude,
      TOTALITY_AXIS[index + 1].latitude,
      TOTALITY_AXIS[index + 1].longitude
    );
  }

  for (let index = 0; index < TOTALITY_AXIS.length - 1; index += 1) {
    const a = TOTALITY_AXIS[index];
    const b = TOTALITY_AXIS[index + 1];
    const ax = a.longitude * 85;
    const ay = a.latitude * 111.32;
    const bx = b.longitude * 85;
    const by = b.latitude * 111.32;
    const px = longitude * 85;
    const py = latitude * 111.32;
    const abx = bx - ax;
    const aby = by - ay;
    const ab2 = abx * abx + aby * aby;
    const t = clamp(((px - ax) * abx + (py - ay) * aby) / ab2, 0, 1);
    const projX = ax + abx * t;
    const projY = ay + aby * t;
    const dx = px - projX;
    const dy = py - projY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const segmentLength = Math.sqrt(ab2);

    if (dist < bestDistance) {
      bestDistance = dist;
      bestAlong = accumulated + segmentLength * t;
    }
    accumulated += segmentLength;
  }

  return {
    distanceKm: bestDistance,
    alongRatio: totalLength > 0 ? bestAlong / totalLength : 0
  };
}

export function buildLocationSummary(latitude: number, longitude: number): LocationSummary {
  const maximum = new Date("2026-08-12T20:28:00+02:00").getTime() + projectToAxis(latitude, longitude).alongRatio * 5 * 60000;
  const projection = projectToAxis(latitude, longitude);
  const totalityFactor = clamp(1 - projection.distanceKm / BAND_HALF_WIDTH_KM, 0, 1);
  const eclipseType = totalityFactor > 0.02 ? "total" : "partial";
  const totalityDurationSec = eclipseType === "total" ? Math.round(18 + totalityFactor * 92) : 0;
  const partialStart = maximum - (54 + (1 - projection.alongRatio) * 3) * 60000;
  const partialEnd = maximum + (48 - projection.alongRatio * 9) * 60000;
  const maxDate = new Date(maximum);
  const sunAtMax = getSunPosition(latitude, longitude, maxDate);
  const sunset = findSunset(latitude, longitude, new Date("2026-08-12T18:00:00+02:00"));
  const sunsetOffsetMinutes = Math.round((sunset - maximum) / 60000);

  const outsideBandNote =
    eclipseType === "total"
      ? "Dentro de una aproximación local de la banda de totalidad en España."
      : projection.distanceKm < 110
        ? "Muy cerca del borde de totalidad. La visibilidad real depende mucho del punto exacto."
        : "Fuera de la banda aproximada de totalidad. El eclipse seguirá siendo profundo y muy bajo sobre el O/ONO.";

  return {
    eclipseType,
    partialStart,
    maximum,
    partialEnd,
    totalStart: eclipseType === "total" ? maximum - (totalityDurationSec * 500) : undefined,
    totalEnd: eclipseType === "total" ? maximum + (totalityDurationSec * 500) : undefined,
    totalityDurationSec,
    maxSunAltitude: sunAtMax.altitudeDeg,
    maxSunAzimuth: sunAtMax.azimuthDeg,
    sunset,
    sunsetOffsetMinutes,
    bandDistanceKm: Math.round(projection.distanceKm),
    confidenceLabel:
      eclipseType === "total"
        ? projection.distanceKm < 30
          ? "alta"
          : "media"
        : projection.distanceKm < 110
          ? "media-baja"
          : "media",
    note: outsideBandNote
  };
}

export function buildContactMoments(
  latitude: number,
  longitude: number,
  summary: LocationSummary
): ContactMoment[] {
  const moments: ContactMoment[] = [
    { id: "partialStart", label: "Inicio parcial", timestamp: summary.partialStart },
    { id: "maximum", label: "Máximo", timestamp: summary.maximum, emphasis: true },
    { id: "partialEnd", label: "Fin parcial", timestamp: summary.partialEnd },
    { id: "sunset", label: "Puesta", timestamp: summary.sunset }
  ];

  if (summary.totalStart && summary.totalEnd) {
    moments.splice(1, 0, { id: "totalStart", label: "Totalidad", timestamp: summary.totalStart });
    moments.splice(3, 0, { id: "totalEnd", label: "Fin totalidad", timestamp: summary.totalEnd });
  }

  return moments.sort((a, b) => a.timestamp - b.timestamp);
}

export function getClosestSampleLocation(latitude: number, longitude: number): ManualLocation {
  return SAMPLE_LOCATIONS.reduce((best, current) => {
    const currentDistance = distanceKm(latitude, longitude, current.latitude, current.longitude);
    const bestDistance = distanceKm(latitude, longitude, best.latitude, best.longitude);
    return currentDistance < bestDistance ? current : best;
  });
}

export function getQuickDirectionLabel(azimuthDeg: number) {
  return `${degreesToCardinal(azimuthDeg)} (${azimuthDeg.toFixed(0)}°)`;
}
