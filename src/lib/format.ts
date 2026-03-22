export function formatLocalTime(timestamp: number) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}

export function formatShortTime(timestamp: number) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export function formatCoords(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}
