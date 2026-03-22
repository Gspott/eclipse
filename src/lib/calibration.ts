import type { CalibrationState, ManualLocation } from "./types";

export function buildLocationKey(location: ManualLocation) {
  return `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
}

export function mergeCalibrationForLocation(
  active: CalibrationState,
  saved: Record<string, CalibrationState>,
  location: ManualLocation
) {
  const local = saved[buildLocationKey(location)];
  return local ?? active;
}
