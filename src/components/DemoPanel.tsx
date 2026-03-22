import { SAMPLE_LOCATIONS } from "../data/locations";
import { formatShortTime } from "../lib/format";
import type {
  ContactMoment,
  LocationSummary,
  ManualLocation,
  OrientationOverrideState
} from "../lib/types";

type DemoPanelProps = {
  demoEnabled: boolean;
  setDemoEnabled: (value: boolean) => void;
  manualLocation: ManualLocation;
  setManualLocation: (value: ManualLocation) => void;
  contacts: ContactMoment[];
  summary: LocationSummary;
  orientationOverride: OrientationOverrideState;
  setOrientationOverride: (value: OrientationOverrideState) => void;
  selectedTimeMs: number;
  setSelectedTimeMs: (value: number) => void;
  setUseCurrentTime: (value: boolean) => void;
};

const START_MS = new Date("2026-08-12T18:30:00+02:00").getTime();
const END_MS = new Date("2026-08-12T21:30:00+02:00").getTime();

export function DemoPanel({
  demoEnabled,
  setDemoEnabled,
  manualLocation,
  setManualLocation,
  contacts,
  summary,
  orientationOverride,
  setOrientationOverride,
  selectedTimeMs,
  setSelectedTimeMs,
  setUseCurrentTime
}: DemoPanelProps) {
  return (
    <section className="panel-stack">
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Modo demo</p>
            <h2>Prueba sin sensores reales</h2>
          </div>
          <button className={demoEnabled ? "primary-button" : "ghost-button"} onClick={() => setDemoEnabled(!demoEnabled)}>
            {demoEnabled ? "Demo activa" : "Activar demo"}
          </button>
        </div>
        <div className="sample-grid">
          {SAMPLE_LOCATIONS.map((sample) => (
            <button
              key={sample.label}
              className={manualLocation.label === sample.label ? "contact-chip active" : "contact-chip"}
              onClick={() => setManualLocation(sample)}
            >
              {sample.label}
            </button>
          ))}
        </div>
        <p className="muted">
          Aquí puedes fijar ubicación, hora y orientación simuladas para validar HUD, scoring y horizonte sin cámara.
        </p>
      </div>

      <div className="panel-card slider-card">
        <h3>Tiempo simulado</h3>
        <label>
          Hora eclipse
          <input
            type="range"
            min={START_MS}
            max={END_MS}
            step={60000}
            value={selectedTimeMs}
            onChange={(event) => {
              setUseCurrentTime(false);
              setSelectedTimeMs(Number(event.target.value));
            }}
          />
        </label>
        <p className="muted">{formatShortTime(selectedTimeMs)}</p>
      </div>

      <div className="panel-card slider-card">
        <h3>Orientación simulada</h3>
        <label>
          Heading {orientationOverride.heading.toFixed(1)}°
          <input
            type="range"
            min={220}
            max={340}
            step={0.5}
            value={orientationOverride.heading}
            onChange={(event) =>
              setOrientationOverride({
                ...orientationOverride,
                enabled: true,
                source: "simulated",
                heading: Number(event.target.value)
              })
            }
          />
        </label>
        <label>
          Pitch {orientationOverride.pitch.toFixed(1)}°
          <input
            type="range"
            min={-10}
            max={30}
            step={0.5}
            value={orientationOverride.pitch}
            onChange={(event) =>
              setOrientationOverride({
                ...orientationOverride,
                enabled: true,
                source: "simulated",
                pitch: Number(event.target.value)
              })
            }
          />
        </label>
        <label>
          Roll {orientationOverride.roll.toFixed(1)}°
          <input
            type="range"
            min={-45}
            max={45}
            step={1}
            value={orientationOverride.roll}
            onChange={(event) =>
              setOrientationOverride({
                ...orientationOverride,
                enabled: true,
                source: "simulated",
                roll: Number(event.target.value)
              })
            }
          />
        </label>
      </div>

      <div className="panel-card">
        <h3>Resumen demo</h3>
        <div className="info-grid">
          <div className="metric-card">
            <span>Tipo</span>
            <strong>{summary.eclipseType}</strong>
          </div>
          <div className="metric-card">
            <span>Altura máx.</span>
            <strong>{summary.maxSunAltitude.toFixed(1)}°</strong>
          </div>
          <div className="metric-card">
            <span>Azimut máx.</span>
            <strong>{summary.maxSunAzimuth.toFixed(0)}°</strong>
          </div>
          <div className="metric-card">
            <span>Totalidad</span>
            <strong>{summary.totalityDurationSec}s</strong>
          </div>
        </div>
        <div className="contact-strip">
          {contacts.map((contact) => (
            <span key={contact.id} className={contact.emphasis ? "contact-chip active" : "contact-chip"}>
              {contact.label} {formatShortTime(contact.timestamp)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
