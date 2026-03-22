import type { MouseEvent } from "react";
import { SAMPLE_LOCATIONS } from "../data/locations";
import { buildLocationSummary } from "../lib/eclipse";
import { degreesToCardinal } from "../lib/solar";
import type { LocationSummary, ManualLocation } from "../lib/types";

type SimpleMapPanelProps = {
  location: ManualLocation;
  onLocationSelect: (location: ManualLocation) => void;
  summary: LocationSummary;
  closestLocation: ManualLocation;
};

const MAP_BOUNDS = {
  minLat: 35.5,
  maxLat: 44.2,
  minLon: -9.7,
  maxLon: 3.5
};

function project(latitude: number, longitude: number) {
  return {
    x: ((longitude - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) * 100,
    y: 100 - ((latitude - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100
  };
}

export function SimpleMapPanel({ location, onLocationSelect, summary, closestLocation }: SimpleMapPanelProps) {
  const handleMapClick = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const longitude = MAP_BOUNDS.minLon + x * (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon);
    const latitude = MAP_BOUNDS.maxLat - y * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
    onLocationSelect({
      label: `Punto manual ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      latitude,
      longitude,
      source: "map"
    });
  };

  const current = project(location.latitude, location.longitude);
  const currentSummary = buildLocationSummary(location.latitude, location.longitude);

  return (
    <section className="panel-stack">
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Mapa simple</p>
            <h2>Exploración previa</h2>
          </div>
          <button className="ghost-button" onClick={() => onLocationSelect(closestLocation)}>
            Ir a {closestLocation.label}
          </button>
        </div>
        <svg viewBox="0 0 100 100" className="simple-map" onClick={handleMapClick}>
          <rect x="0" y="0" width="100" height="100" rx="5" fill="#101926" />
          <path
            d="M10 18 L18 14 L27 18 L37 16 L48 18 L56 16 L67 21 L79 28 L85 38 L90 52 L87 62 L80 71 L70 79 L59 84 L47 82 L34 76 L25 71 L16 58 L11 43 Z"
            fill="#253448"
            stroke="#93a8be"
            strokeWidth="0.6"
          />
          {SAMPLE_LOCATIONS.map((sample) => {
            const point = project(sample.latitude, sample.longitude);
            return (
              <g
                key={sample.label}
                onClick={(event) => {
                  event.stopPropagation();
                  onLocationSelect(sample);
                }}
              >
                <circle cx={point.x} cy={point.y} r="1.4" fill="#f7b955" />
              </g>
            );
          })}
          <circle cx={current.x} cy={current.y} r="2" fill="#7be0ff" />
        </svg>
      </div>

      <div className="panel-card">
        <h3>Lectura rápida</h3>
        <div className="info-grid">
          <div className="metric-card">
            <span>Punto</span>
            <strong>{location.label}</strong>
          </div>
          <div className="metric-card">
            <span>Tipo</span>
            <strong>{currentSummary.eclipseType}</strong>
          </div>
          <div className="metric-card">
            <span>Altura máx.</span>
            <strong>{currentSummary.maxSunAltitude.toFixed(1)}°</strong>
          </div>
          <div className="metric-card">
            <span>Dirección</span>
            <strong>{degreesToCardinal(currentSummary.maxSunAzimuth)}</strong>
          </div>
        </div>
        <p>{summary.note}</p>
      </div>
    </section>
  );
}
