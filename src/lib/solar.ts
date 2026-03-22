import type { SunPosition } from "./types";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function normalizeDeg(value: number) {
  return ((value % 360) + 360) % 360;
}

function toJulianDay(date: Date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function getTimezoneOffsetHours(date: Date) {
  return -date.getTimezoneOffset() / 60;
}

export function getSunPosition(latitude: number, longitude: number, date: Date): SunPosition {
  const jd = toJulianDay(date);
  const t = (jd - 2451545.0) / 36525;

  const meanLongitude = normalizeDeg(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
  const meanAnomaly = normalizeDeg(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
  const eccentricity = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;

  const equationOfCenter =
    Math.sin(meanAnomaly * RAD) * (1.914602 - 0.004817 * t - 0.000014 * t * t) +
    Math.sin(2 * meanAnomaly * RAD) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * meanAnomaly * RAD) * 0.000289;

  const trueLongitude = meanLongitude + equationOfCenter;
  const omega = 125.04 - 1934.136 * t;
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * Math.sin(omega * RAD);

  const meanObliquity =
    23 +
    (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(omega * RAD);

  const declination = Math.asin(Math.sin(obliquity * RAD) * Math.sin(apparentLongitude * RAD)) * DEG;

  const y = Math.tan((obliquity / 2) * RAD) ** 2;
  const eqTimeMinutes =
    4 *
    DEG *
    (y * Math.sin(2 * meanLongitude * RAD) -
      2 * eccentricity * Math.sin(meanAnomaly * RAD) +
      4 * eccentricity * y * Math.sin(meanAnomaly * RAD) * Math.cos(2 * meanLongitude * RAD) -
      0.5 * y * y * Math.sin(4 * meanLongitude * RAD) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomaly * RAD));

  const minutes =
    date.getHours() * 60 +
    date.getMinutes() +
    date.getSeconds() / 60 +
    date.getMilliseconds() / 60000;
  const trueSolarTime = normalizeDeg((minutes + eqTimeMinutes + 4 * longitude - 60 * getTimezoneOffsetHours(date)) / 4) * 4;
  const hourAngle = (trueSolarTime / 4 < 0 ? trueSolarTime / 4 + 180 : trueSolarTime / 4 - 180);

  const latitudeRad = latitude * RAD;
  const declinationRad = declination * RAD;
  const hourAngleRad = hourAngle * RAD;

  const cosZenith =
    Math.sin(latitudeRad) * Math.sin(declinationRad) +
    Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith))) * DEG;
  const altitudeDeg = 90 - zenith;

  const azimuth =
    Math.atan2(
      Math.sin(hourAngleRad),
      Math.cos(hourAngleRad) * Math.sin(latitudeRad) - Math.tan(declinationRad) * Math.cos(latitudeRad)
    ) *
      DEG +
    180;

  return {
    altitudeDeg,
    azimuthDeg: normalizeDeg(azimuth),
    hourAngleDeg: hourAngle,
    declinationDeg: declination
  };
}

export function findSunset(latitude: number, longitude: number, baseDate: Date) {
  const probe = new Date(baseDate);
  probe.setHours(18, 0, 0, 0);
  let lastAbove = probe.getTime();

  for (let minute = 0; minute <= 240; minute += 2) {
    const sample = new Date(probe.getTime() + minute * 60000);
    const altitude = getSunPosition(latitude, longitude, sample).altitudeDeg;
    if (altitude > -0.3) {
      lastAbove = sample.getTime();
    } else {
      break;
    }
  }

  return lastAbove;
}

export function degreesToCardinal(azimuthDeg: number) {
  const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return directions[Math.round(normalizeDeg(azimuthDeg) / 45) % 8];
}

export function formatDeg(value: number, digits = 1) {
  return `${value.toFixed(digits)}°`;
}
