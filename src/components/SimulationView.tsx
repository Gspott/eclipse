import { useMemo } from "react";
import { buildContactMoments } from "../lib/eclipse";
import { formatShortTime } from "../lib/format";
import { getHorizonElevationAt } from "../lib/horizon";
import { degreesToCardinal, getSunPosition } from "../lib/solar";
import type { HorizonProfile, LocationSummary, ManualLocation, SunPosition } from "../lib/types";

type SimulationViewProps = {
  location: ManualLocation;
  sun: SunPosition;
  summary: LocationSummary;
  selectedDate: Date;
  horizonProfile: HorizonProfile;
};

const START_TS = new Date("2026-08-12T18:30:00+02:00").getTime();
const END_TS = new Date("2026-08-12T21:20:00+02:00").getTime();

export function SimulationView({ location, sun, summary, selectedDate, horizonProfile }: SimulationViewProps) {
  const contacts = buildContactMoments(location.latitude, location.longitude, summary);

  const track = useMemo(() => {
    const samples: { x: number; y: number; timestamp: number; azimuthDeg: number; altitudeDeg: number; visible: boolean }[] = [];
    for (let timestamp = START_TS; timestamp <= END_TS; timestamp += 120000) {
      const position = getSunPosition(location.latitude, location.longitude, new Date(timestamp));
      const horizonElevation = getHorizonElevationAt(horizonProfile, position.azimuthDeg) ?? 0;
      samples.push({
        x: ((timestamp - START_TS) / (END_TS - START_TS)) * 100,
        y: 92 - (position.altitudeDeg / 18) * 76,
        timestamp,
        azimuthDeg: position.azimuthDeg,
        altitudeDeg: position.altitudeDeg,
        visible: position.altitudeDeg - horizonElevation > 0
      });
    }
    return samples;
  }, [horizonProfile, location.latitude, location.longitude]);

  const horizonCurve = track.map((point) => {
    const horizonElevation = getHorizonElevationAt(horizonProfile, point.azimuthDeg) ?? 0;
    return {
      x: point.x,
      y: 92 - (horizonElevation / 18) * 76
    };
  });

  const activeX = ((selectedDate.getTime() - START_TS) / (END_TS - START_TS)) * 100;
  const activeY = 92 - (sun.altitudeDeg / 18) * 76;
  const maxX = ((summary.maximum - START_TS) / (END_TS - START_TS)) * 100;
  const maxY = 92 - (summary.maxSunAltitude / 18) * 76;

  return (
    <section className="simulation-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Modo simulación</p>
          <h2>Trayectoria solar y horizonte</h2>
        </div>
        <p className="muted">{formatShortTime(selectedDate.getTime())}</p>
      </div>
      <svg viewBox="0 0 100 100" className="sky-plot" role="img" aria-label="Simulación del cielo">
        <defs>
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5c7c93" />
            <stop offset="100%" stopColor="#111820" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#skyGradient)" rx="4" />
        <line x1="0" y1="92" x2="100" y2="92" stroke="#dfe7ee" strokeWidth="1" />
        {horizonCurve.length >= 2 && (
          <polyline
            points={horizonCurve.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")}
            fill="none"
            stroke="#ff7a59"
            strokeWidth="1.4"
          />
        )}
        <polyline
          points={track.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")}
          fill="none"
          stroke="#f7b955"
          strokeWidth="1.8"
        />
        {track
          .filter((point) => !point.visible)
          .map((point) => <circle key={point.timestamp} cx={point.x} cy={point.y} r="0.8" fill="#ff7a59" />)}
        <circle cx={activeX} cy={activeY} r="2.2" fill="#ffd05d" />
        <circle cx={maxX} cy={maxY} r="1.8" fill="#7be0ff" />
        <text x={Math.max(2, activeX - 10)} y={Math.max(8, activeY - 4)} fill="#ffffff" fontSize="4">
          Ahora
        </text>
        <text x={Math.max(2, maxX - 12)} y={Math.max(8, maxY - 4)} fill="#7be0ff" fontSize="4">
          Máximo
        </text>
      </svg>
      <div className="simulation-grid">
        <div className="metric-card">
          <span>Dirección</span>
          <strong>{degreesToCardinal(sun.azimuthDeg)}</strong>
        </div>
        <div className="metric-card">
          <span>Azimut</span>
          <strong>{sun.azimuthDeg.toFixed(1)}°</strong>
        </div>
        <div className="metric-card">
          <span>Altura</span>
          <strong>{sun.altitudeDeg.toFixed(1)}°</strong>
        </div>
        <div className="metric-card">
          <span>Máximo</span>
          <strong>{summary.maxSunAltitude.toFixed(1)}°</strong>
        </div>
      </div>
      <div className="contact-strip">
        {contacts.map((contact) => (
          <button key={contact.id} className={contact.emphasis ? "contact-chip active" : "contact-chip"}>
            {contact.label} {formatShortTime(contact.timestamp)}
          </button>
        ))}
      </div>
    </section>
  );
}
