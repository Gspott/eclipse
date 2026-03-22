import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { formatLocalTime } from "../lib/format";
import { projectSunToViewport } from "../lib/projection";
import { formatDeg } from "../lib/solar";
import type {
  AppSettings,
  CalibrationState,
  CameraState,
  FrozenFrame,
  HorizonAssessment,
  HorizonProfile,
  LocationSummary,
  ManualLocation,
  OrientationReading,
  SunPosition
} from "../lib/types";

type LiveViewProps = {
  videoRef: RefObject<HTMLVideoElement>;
  camera: CameraState;
  orientation: OrientationReading;
  calibration: CalibrationState;
  location: ManualLocation;
  sun: SunPosition;
  summary: LocationSummary;
  clock: { activeDate: Date; realNow: number };
  horizonProfile: HorizonProfile;
  onCapture: (frame: FrozenFrame | null) => void;
  settings: AppSettings;
  visibility: HorizonAssessment;
  maximumTimestamp: number;
  minimal: boolean;
};

function getGuidanceText(deltaAz: number, deltaAlt: number, aligned: boolean) {
  if (aligned) {
    return "Alineado";
  }

  const horizontal = deltaAz > 0 ? `derecha ${Math.abs(deltaAz).toFixed(1)}°` : `izquierda ${Math.abs(deltaAz).toFixed(1)}°`;
  const vertical = deltaAlt > 0 ? `sube ${Math.abs(deltaAlt).toFixed(1)}°` : `baja ${Math.abs(deltaAlt).toFixed(1)}°`;
  return `${horizontal} · ${vertical}`;
}

export function LiveView({
  videoRef,
  camera,
  orientation,
  calibration,
  location,
  sun,
  clock,
  onCapture,
  settings,
  visibility,
  maximumTimestamp,
  minimal
}: LiveViewProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 390, height: 680 });
  const lastAlignedRef = useRef(false);
  const lastVisibilityRef = useRef(visibility.state);

  useEffect(() => {
    const element = shellRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) {
        return;
      }
      setViewport({
        width: Math.max(240, rect.width),
        height: Math.max(320, rect.height)
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const projection = useMemo(
    () => projectSunToViewport(sun, orientation, calibration, viewport.width, viewport.height),
    [sun, orientation, calibration, viewport.height, viewport.width]
  );
  const aligned = projection.angularError <= settings.alignmentThresholdDeg;
  const guidanceText =
    orientation.heading === null ? "Orientación manual requerida" : getGuidanceText(projection.deltaAz, projection.deltaAlt, aligned);
  const countdownMinutes = Math.round((maximumTimestamp - clock.activeDate.getTime()) / 60000);

  useEffect(() => {
    if (!settings.hapticsEnabled || !navigator.vibrate) {
      lastAlignedRef.current = aligned;
      lastVisibilityRef.current = visibility.state;
      return;
    }
    if (aligned && !lastAlignedRef.current) {
      navigator.vibrate([12, 24, 12]);
    }
    if (visibility.state === "visible" && lastVisibilityRef.current === "hidden") {
      navigator.vibrate([20]);
    }
    lastAlignedRef.current = aligned;
    lastVisibilityRef.current = visibility.state;
  }, [aligned, settings.hapticsEnabled, visibility.state]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture({
      dataUrl: canvas.toDataURL("image/jpeg", 0.82),
      width: canvas.width,
      height: canvas.height,
      heading: orientation.heading ?? 0,
      pitch: orientation.pitch ?? 0,
      roll: orientation.roll ?? 0,
      timestamp: clock.activeDate.getTime()
    });
  };

  return (
    <section className={minimal ? "live-stage minimal" : "live-stage"}>
      <div className="video-shell" ref={shellRef}>
        <video ref={videoRef} playsInline muted className="camera-feed" />
        {!camera.stream && (
          <div className="camera-fallback">
            <p>{settings.lowPowerMode ? "Ahorro activo: abre cámara solo cuando haga falta." : "No hay vídeo activo."}</p>
            <button className="primary-button" onClick={() => camera.start()}>
              Abrir cámara trasera
            </button>
            {camera.error && <p className="error-text">{camera.error}</p>}
          </div>
        )}

        <div className="hud-layer">
          <div className={aligned ? "reticle aligned" : "reticle"} />
          <div className={aligned ? "target-ring active" : "target-ring"} />
          <div
            className="horizon-line"
            style={{
              transform: `translateY(${((orientation.pitch ?? 0) + calibration.horizonOffsetDeg) * -4}px) rotate(${orientation.roll ?? 0}deg)`
            }}
          />
          <div
            className={projection.withinFrame ? "sun-marker" : "sun-marker offscreen"}
            style={{
              left: `${Math.max(4, Math.min(viewport.width - 24, projection.x))}px`,
              top: `${Math.max(4, Math.min(viewport.height - 24, projection.y))}px`
            }}
          />
          <div className="hud-top">
            <span className="pill">Hora {formatLocalTime(clock.activeDate.getTime())}</span>
            <span className={`pill ${orientation.confidence === "low" ? "warn" : ""}`}>
              Sensor {orientation.confidence}
            </span>
            <span className="pill">Az {formatDeg(sun.azimuthDeg, 0)}</span>
            <span className="pill">Alt {formatDeg(sun.altitudeDeg, 1)}</span>
          </div>

          {!minimal && (
            <div className="hud-bottom">
              <div>
                <strong>Apunta y busca</strong>
                <p>{guidanceText}</p>
              </div>
              <div>
                <strong>Visibilidad</strong>
                <p>{visibility.label}</p>
              </div>
              <div>
                <strong>Lugar</strong>
                <p>{location.label}</p>
              </div>
            </div>
          )}

          <div className={minimal ? "eclipse-strip visible" : "eclipse-strip"}>
            <strong>{aligned ? "Alineado" : "Ajusta"}</strong>
            <span>H {projection.deltaAz > 0 ? "derecha" : "izquierda"} {Math.abs(projection.deltaAz).toFixed(1)}°</span>
            <span>V {projection.deltaAlt > 0 ? "sube" : "baja"} {Math.abs(projection.deltaAlt).toFixed(1)}°</span>
            <span>{visibility.label}</span>
            <span>Máximo {countdownMinutes >= 0 ? `en ${countdownMinutes} min` : "ya pasado"}</span>
          </div>

          <div className="arrow-strip">
            <div className="arrow">{projection.deltaAz > 0 ? "→" : "←"}</div>
            <div className="arrow-legend">{Math.abs(projection.deltaAz).toFixed(1)}°</div>
          </div>

          {!minimal && orientation.confidence === "low" && (
            <div className="sensor-warning">Brújula poco fiable. Recalibra o usa orientación manual.</div>
          )}
        </div>
      </div>

      <div className={minimal ? "action-bar compact" : "action-bar"}>
        <button className="primary-button" onClick={() => camera.start()}>
          {camera.stream ? "Reabrir cámara" : "Cámara trasera"}
        </button>
        <button className="ghost-button" onClick={() => orientation.requestPermission()}>
          Orientación
        </button>
        <button className="ghost-button" onClick={handleCapture}>
          Congelar
        </button>
      </div>
    </section>
  );
}
