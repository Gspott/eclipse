import { formatShortTime } from "../lib/format";
import { degreesToCardinal } from "../lib/solar";
import type { LocationSummary, SiteScore } from "../lib/types";

type SiteCardProps = {
  summary: LocationSummary;
  score: SiteScore;
};

export function SiteCard({ summary, score }: SiteCardProps) {
  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Ficha del lugar</p>
          <h2>{summary.eclipseType === "total" ? "Total" : "Parcial"}</h2>
        </div>
        <span className={`score-pill score-${score.label.toLowerCase()}`}>{score.label}</span>
      </div>
      <div className="info-grid">
        <div className="metric-card">
          <span>Inicio</span>
          <strong>{formatShortTime(summary.partialStart)}</strong>
        </div>
        <div className="metric-card">
          <span>Máximo</span>
          <strong>{formatShortTime(summary.maximum)}</strong>
        </div>
        <div className="metric-card">
          <span>Fin</span>
          <strong>{formatShortTime(summary.partialEnd)}</strong>
        </div>
        <div className="metric-card">
          <span>Puesta</span>
          <strong>{formatShortTime(summary.sunset)}</strong>
        </div>
        <div className="metric-card">
          <span>Altura máx.</span>
          <strong>{summary.maxSunAltitude.toFixed(1)}°</strong>
        </div>
        <div className="metric-card">
          <span>Azimut máx.</span>
          <strong>
            {degreesToCardinal(summary.maxSunAzimuth)} {summary.maxSunAzimuth.toFixed(0)}°
          </strong>
        </div>
      </div>
      <p className="muted">
        Duración totalidad: {summary.totalityDurationSec > 0 ? `${summary.totalityDurationSec}s` : "no aplica"} ·
        Banda aprox.: {summary.bandDistanceKm} km · Confianza {summary.confidenceLabel}
      </p>
      <p>{summary.note}</p>
      <ul className="plain-list">
        {score.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}
