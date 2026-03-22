import { degreesToCardinal } from "../lib/solar";
import type { ManualLocation, SunPosition } from "../lib/types";

type ScoutingStatus = {
  label: "VISIBLE" | "JUSTO" | "TAPADO";
  tone: "ok" | "warn" | "bad";
  hint: string;
};

type SimulationViewProps = {
  location: ManualLocation;
  sunAt1930: SunPosition;
  sunAt2030: SunPosition;
  trajectorySamples: SunPosition[];
  scoutingStatus: ScoutingStatus;
  onAdjustHorizon: () => void | Promise<void>;
  onToggleMode: () => void;
};

export function SimulationView({
  location,
  sunAt1930,
  sunAt2030,
  scoutingStatus,
  onAdjustHorizon,
  onToggleMode
}: SimulationViewProps) {
  const p1930 = {
    x: 18,
    y: 86 - Math.max(0, sunAt1930.altitudeDeg) * 5
  };
  const p2030 = {
    x: 78,
    y: 86 - Math.max(0, sunAt2030.altitudeDeg) * 5
  };

  return (
    <section className="simulation-card scouting-sim-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Modo simulación</p>
          <h2>Talveila y alrededores</h2>
        </div>
        <span className={`score-pill score-${scoutingStatus.tone}`}>{scoutingStatus.label}</span>
      </div>

      <svg viewBox="0 0 100 100" className="sky-plot" role="img" aria-label="Trayectoria solar">
        <rect x="0" y="0" width="100" height="100" rx="5" fill="#111820" />
        <line x1="0" y1="86" x2="100" y2="86" stroke="#dfe7ee" strokeWidth="1" />
        <line x1={p1930.x} y1={p1930.y} x2={p2030.x} y2={p2030.y} stroke="#ffd05d" strokeWidth="2.2" />
        <circle cx={p1930.x} cy={p1930.y} r="2.4" fill="#f7b955" />
        <circle cx={p2030.x} cy={p2030.y} r="2.8" fill="#ffd05d" />
        <text x={p1930.x - 8} y={p1930.y - 4} fill="#ffffff" fontSize="4">
          19:30
        </text>
        <text x={p2030.x - 8} y={p2030.y - 4} fill="#ffffff" fontSize="4">
          20:30
        </text>
      </svg>

      <div className="simulation-grid">
        <div className="metric-card">
          <span>20:30</span>
          <strong>{sunAt2030.altitudeDeg.toFixed(1)}°</strong>
        </div>
        <div className="metric-card">
          <span>Dirección</span>
          <strong>{degreesToCardinal(sunAt2030.azimuthDeg)}</strong>
        </div>
        <div className="metric-card">
          <span>19:30</span>
          <strong>{sunAt1930.altitudeDeg.toFixed(1)}°</strong>
        </div>
        <div className="metric-card">
          <span>Lugar</span>
          <strong>{location.label}</strong>
        </div>
      </div>
      <p>{scoutingStatus.hint}</p>
      <div className="action-bar">
        <button className="primary-button" onClick={onAdjustHorizon}>
          Ajustar horizonte
        </button>
        <button className="ghost-button" onClick={onToggleMode}>
          Cámara
        </button>
      </div>
    </section>
  );
}
