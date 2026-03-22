import { useEffect, useMemo, useRef } from "react";
import { LiveView } from "./components/LiveView";
import { SafetyNotice } from "./components/SafetyNotice";
import { SimulationView } from "./components/SimulationView";
import { ECLIPSE_SCOUTING_TIMES, TALVEILA_CENTER } from "./data/scouting";
import { useCamera } from "./hooks/useCamera";
import { useDeviceOrientation } from "./hooks/useDeviceOrientation";
import { useGeolocation } from "./hooks/useGeolocation";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { usePageVisibility } from "./hooks/usePageVisibility";
import { getSunPosition, degreesToCardinal } from "./lib/solar";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_CALIBRATION,
  type AppSettings,
  type CalibrationState,
  type ManualLocation,
  type OrientationOverrideState
} from "./lib/types";

export default function App() {
  const [mode, setMode] = useLocalStorage<"camera" | "simulation">("scouting-mode", "camera");
  const [theme, setTheme] = useLocalStorage<"day" | "night">("theme", "day");
  const [calibration, setCalibration] = useLocalStorage<CalibrationState>("active-calibration", DEFAULT_CALIBRATION);
  const [settings] = useLocalStorage<AppSettings>("app-settings", {
    ...DEFAULT_APP_SETTINGS,
    smoothingFactor: 0.18,
    fpsCap: 16,
    alignmentThresholdDeg: 2.2,
    lowPowerMode: true,
    hapticsEnabled: false
  });
  const [orientationOverride] = useLocalStorage<OrientationOverrideState>("orientation-override", {
    enabled: false,
    heading: 290,
    pitch: 6,
    roll: 0,
    source: "manual"
  });
  const [fallbackLocation] = useLocalStorage<ManualLocation>("manual-location", TALVEILA_CENTER);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pageVisible = usePageVisibility();

  const geo = useGeolocation(TALVEILA_CENTER);
  const orientation = useDeviceOrientation(calibration, {
    smoothingFactor: settings.smoothingFactor,
    fpsCap: settings.fpsCap,
    override: orientationOverride.enabled ? orientationOverride : null,
    paused: !pageVisible
  });
  const camera = useCamera(videoRef);
  const activeLocation = geo.location ?? fallbackLocation;

  const sunAt1930 = useMemo(
    () => getSunPosition(activeLocation.latitude, activeLocation.longitude, ECLIPSE_SCOUTING_TIMES.precheck),
    [activeLocation.latitude, activeLocation.longitude]
  );
  const sunAt2030 = useMemo(
    () => getSunPosition(activeLocation.latitude, activeLocation.longitude, ECLIPSE_SCOUTING_TIMES.maximum),
    [activeLocation.latitude, activeLocation.longitude]
  );

  const scoutingStatus = useMemo<{ label: "VISIBLE" | "JUSTO" | "TAPADO"; tone: "ok" | "warn" | "bad"; hint: string }>(() => {
    if (sunAt2030.altitudeDeg > 1.5) {
      return {
        label: "VISIBLE",
        tone: "ok" as const,
        hint: "Si la loma queda por debajo del punto de las 20:30, el sitio sirve."
      };
    }
    if (sunAt2030.altitudeDeg > 0.2) {
      return {
        label: "JUSTO",
        tone: "warn" as const,
        hint: "Cualquier loma baja puede taparlo cerca del máximo."
      };
    }
    return {
      label: "TAPADO",
      tone: "bad" as const,
      hint: "Con horizonte real a 0°, el Sol ya llega demasiado bajo."
    };
  }, [sunAt2030.altitudeDeg]);

  const fallbackToSimulation =
    mode === "simulation" ||
    orientation.permission !== "granted" ||
    orientation.confidence === "low" ||
    camera.permission === "denied";

  const adjustDirection = () => {
    if (orientation.heading === null) {
      return;
    }
    setCalibration({
      ...calibration,
      azimuthOffsetDeg: ((sunAt2030.azimuthDeg - orientation.heading + 540) % 360) - 180,
      lastSolarCalibrationTs: Date.now(),
      estimatedPrecisionDeg: Math.max(1, Math.min(8, orientation.jitterDeg + 1.5))
    });
  };

  useEffect(() => {
    if (!pageVisible || mode !== "camera" || camera.stream || camera.permission === "denied") {
      return;
    }
    camera.start().catch(() => undefined);
  }, [camera.permission, camera.stream, mode, pageVisible]);

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">12 agosto 2026 · Talveila, Soria</p>
          <h1>Scout Eclipse Talveila</h1>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={() => setTheme(theme === "day" ? "night" : "day")}>
            {theme === "day" ? "Modo noche" : "Modo día"}
          </button>
          <button className="ghost-button" onClick={() => setMode(mode === "camera" ? "simulation" : "camera")}>
            {mode === "camera" ? "Modo simulación" : "Modo cámara"}
          </button>
        </div>
      </header>

      <SafetyNotice />

      <main className="layout without-panel scouting-layout">
        <section className="viewer-column">
          {fallbackToSimulation ? (
            <SimulationView
              location={activeLocation}
              sunAt1930={sunAt1930}
              sunAt2030={sunAt2030}
              scoutingStatus={scoutingStatus}
            />
          ) : (
            <LiveView
              videoRef={videoRef}
              camera={camera}
              orientation={orientation}
              calibration={calibration}
              location={activeLocation}
              sunAt1930={sunAt1930}
              sunAt2030={sunAt2030}
              scoutingStatus={scoutingStatus}
            />
          )}
        </section>

        <section className="panel-card scouting-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Lectura rápida</p>
              <h2>{scoutingStatus.label}</h2>
            </div>
            <span className={`score-pill score-${scoutingStatus.tone}`}>{degreesToCardinal(sunAt2030.azimuthDeg)}</span>
          </div>
          <div className="info-grid">
            <div className="metric-card">
              <span>19:30</span>
              <strong>{sunAt1930.altitudeDeg.toFixed(1)}°</strong>
            </div>
            <div className="metric-card">
              <span>20:30</span>
              <strong>{sunAt2030.altitudeDeg.toFixed(1)}°</strong>
            </div>
            <div className="metric-card">
              <span>Dirección</span>
              <strong>{degreesToCardinal(sunAt2030.azimuthDeg)}</strong>
            </div>
            <div className="metric-card">
              <span>Ubicación</span>
              <strong>{geo.location ? "GPS" : "Talveila"}</strong>
            </div>
          </div>
          <p>{scoutingStatus.hint}</p>
          <div className="action-bar">
            <button className="primary-button" onClick={adjustDirection}>
              Ajustar dirección
            </button>
            <button className="ghost-button" onClick={() => setMode(mode === "camera" ? "simulation" : "camera")}>
              {mode === "camera" ? "Modo simulación" : "Modo cámara"}
            </button>
          </div>
          <p className="muted">
            Usa “Ajustar dirección” apuntando hacia la referencia visual donde esperas el Sol de las 20:30. La corrección
            queda guardada.
          </p>
          {orientation.permission !== "granted" && (
            <p className="muted">
              En iPhone/Safari la brújula necesita permiso desde un toque. Si falla, la app sigue en modo simulación.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
