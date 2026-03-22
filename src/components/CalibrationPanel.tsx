import { formatLocalTime } from "../lib/format";
import type {
  AppSettings,
  CameraState,
  CalibrationState,
  ManualLocation,
  OrientationOverrideState,
  OrientationReading,
  SunPosition
} from "../lib/types";

type CalibrationPanelProps = {
  calibration: CalibrationState;
  setCalibration: (value: CalibrationState) => void;
  saveCalibrationForLocation: () => void;
  orientation: OrientationReading;
  camera: CameraState;
  location: ManualLocation;
  lockOrientation: "portrait" | "landscape" | "auto";
  applyOrientationLock: (value: "portrait" | "landscape" | "auto") => Promise<void>;
  alignWithSunNow: () => void;
  resetSolarAlignment: () => void;
  sun: SunPosition;
  settings: AppSettings;
  setSettings: (value: AppSettings) => void;
  orientationOverride: OrientationOverrideState;
  setOrientationOverride: (value: OrientationOverrideState) => void;
};

export function CalibrationPanel({
  calibration,
  setCalibration,
  saveCalibrationForLocation,
  orientation,
  camera,
  location,
  lockOrientation,
  applyOrientationLock,
  alignWithSunNow,
  resetSolarAlignment,
  sun,
  settings,
  setSettings,
  orientationOverride,
  setOrientationOverride
}: CalibrationPanelProps) {
  const update = <K extends keyof CalibrationState>(key: K, value: CalibrationState[K]) => {
    setCalibration({
      ...calibration,
      [key]: value
    });
  };

  const updateSettings = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings({
      ...settings,
      [key]: value
    });
  };

  return (
    <section className="panel-stack">
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Calibración iPhone</p>
            <h2>Secuencia recomendada</h2>
          </div>
          <button className="primary-button" onClick={saveCalibrationForLocation}>
            Guardar aquí
          </button>
        </div>
        <ol className="steps-list">
          <li>Permisos: geolocalización, cámara y orientación.</li>
          <li>Selecciona cámara trasera y confirma encuadre y horizonte.</li>
          <li>Usa “Alinear con el Sol ahora” cuando ya estés apuntando correctamente.</li>
          <li>Ajusta offset fino solo si sigue quedando deriva.</li>
          <li>Congela una captura y perfila el horizonte por azimut.</li>
          <li>Haz un barrido final. Si el sensor cae, activa orientación manual.</li>
        </ol>
        <div className="action-bar">
          <button className="primary-button" onClick={() => camera.start()}>
            Paso 1-2 · Cámara
          </button>
          <button className="ghost-button" onClick={() => orientation.requestPermission()}>
            Paso 3 · Orientación
          </button>
          <button className="ghost-button" onClick={alignWithSunNow}>
            Alinear con el Sol ahora
          </button>
        </div>
        <p className="muted">
          Sol calculado ahora: azimut {sun.azimuthDeg.toFixed(1)}° · altura {sun.altitudeDeg.toFixed(1)}°
        </p>
        <p className="muted">
          Última calibración solar:{" "}
          {calibration.lastSolarCalibrationTs ? formatLocalTime(calibration.lastSolarCalibrationTs) : "sin calibrar"} ·
          Precisión estimada {calibration.estimatedPrecisionDeg?.toFixed(1) ?? "?"}°
        </p>
      </div>

      <div className="panel-card slider-card">
        <h3>Ajuste fino</h3>
        <label>
          Offset azimut {calibration.azimuthOffsetDeg.toFixed(1)}°
          <input
            type="range"
            min={-20}
            max={20}
            step={0.2}
            value={calibration.azimuthOffsetDeg}
            onChange={(event) => update("azimuthOffsetDeg", Number(event.target.value))}
          />
        </label>
        <label>
          Offset pitch {calibration.pitchOffsetDeg.toFixed(1)}°
          <input
            type="range"
            min={-15}
            max={15}
            step={0.2}
            value={calibration.pitchOffsetDeg}
            onChange={(event) => update("pitchOffsetDeg", Number(event.target.value))}
          />
        </label>
        <label>
          Horizonte {calibration.horizonOffsetDeg.toFixed(1)}°
          <input
            type="range"
            min={-10}
            max={10}
            step={0.1}
            value={calibration.horizonOffsetDeg}
            onChange={(event) => update("horizonOffsetDeg", Number(event.target.value))}
          />
        </label>
        <label>
          FOV horizontal {calibration.horizontalFovDeg.toFixed(0)}°
          <input
            type="range"
            min={45}
            max={80}
            step={1}
            value={calibration.horizontalFovDeg}
            onChange={(event) => update("horizontalFovDeg", Number(event.target.value))}
          />
        </label>
        <label>
          FOV vertical {calibration.verticalFovDeg.toFixed(0)}°
          <input
            type="range"
            min={35}
            max={65}
            step={1}
            value={calibration.verticalFovDeg}
            onChange={(event) => update("verticalFovDeg", Number(event.target.value))}
          />
        </label>
        <div className="action-bar compact">
          <button
            className="ghost-button"
            onClick={() =>
              setCalibration({
                ...calibration,
                azimuthOffsetDeg: 0,
                pitchOffsetDeg: 0,
                horizonOffsetDeg: 0
              })
            }
          >
            Recentrar
          </button>
          <button className="ghost-button" onClick={resetSolarAlignment}>
            Reset solar
          </button>
        </div>
      </div>

      <div className="panel-card slider-card">
        <h3>Sensores y batería</h3>
        <label>
          Suavizado {settings.smoothingFactor.toFixed(2)}
          <input
            type="range"
            min={0.05}
            max={0.6}
            step={0.01}
            value={settings.smoothingFactor}
            onChange={(event) => updateSettings("smoothingFactor", Number(event.target.value))}
          />
        </label>
        <label>
          Umbral alineado {settings.alignmentThresholdDeg.toFixed(1)}°
          <input
            type="range"
            min={0.8}
            max={6}
            step={0.1}
            value={settings.alignmentThresholdDeg}
            onChange={(event) => updateSettings("alignmentThresholdDeg", Number(event.target.value))}
          />
        </label>
        <label>
          FPS overlay {settings.fpsCap}
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={settings.fpsCap}
            onChange={(event) => updateSettings("fpsCap", Number(event.target.value))}
          />
        </label>
        <div className="segmented-control">
          <button
            className={settings.hapticsEnabled ? "tab active" : "tab"}
            onClick={() => updateSettings("hapticsEnabled", !settings.hapticsEnabled)}
          >
            {settings.hapticsEnabled ? "Hápticos ON" : "Hápticos OFF"}
          </button>
          <button
            className={settings.lowPowerMode ? "tab active" : "tab"}
            onClick={() => updateSettings("lowPowerMode", !settings.lowPowerMode)}
          >
            {settings.lowPowerMode ? "Ahorro ON" : "Ahorro OFF"}
          </button>
          <button
            className={settings.manualOrientationMode ? "tab active" : "tab"}
            onClick={() => updateSettings("manualOrientationMode", !settings.manualOrientationMode)}
          >
            {settings.manualOrientationMode ? "Manual ON" : "Manual OFF"}
          </button>
        </div>
      </div>

      <div className="panel-card slider-card">
        <h3>Orientación manual pura</h3>
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
                heading: Number(event.target.value),
                source: settings.manualOrientationMode ? "manual" : orientationOverride.source
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
                pitch: Number(event.target.value),
                source: settings.manualOrientationMode ? "manual" : orientationOverride.source
              })
            }
          />
        </label>
      </div>

      <div className="panel-card">
        <h3>Estado del equipo</h3>
        <div className="info-grid">
          <div className="metric-card">
            <span>Orientación</span>
            <strong>{orientation.permission}</strong>
          </div>
          <div className="metric-card">
            <span>Confianza</span>
            <strong>{orientation.confidence}</strong>
          </div>
          <div className="metric-card">
            <span>Jitter</span>
            <strong>{orientation.jitterDeg.toFixed(1)}°</strong>
          </div>
          <div className="metric-card">
            <span>Cámara</span>
            <strong>{camera.permission}</strong>
          </div>
          <div className="metric-card">
            <span>Perfil</span>
            <strong>{location.label}</strong>
          </div>
          <div className="metric-card">
            <span>Fuente</span>
            <strong>{orientation.source}</strong>
          </div>
        </div>
        <div className="segmented-control">
          {["auto", "portrait", "landscape"].map((value) => (
            <button
              key={value}
              className={lockOrientation === value ? "tab active" : "tab"}
              onClick={() => applyOrientationLock(value as "portrait" | "landscape" | "auto")}
            >
              {value === "auto" ? "Auto" : value === "portrait" ? "Vertical" : "Horizontal"}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
