import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { projectSunToViewport } from "../lib/projection";
import { degreesToCardinal } from "../lib/solar";
import type { CalibrationState, CameraState, ManualLocation, OrientationReading, SunPosition } from "../lib/types";

type ScoutingStatus = {
  label: "VISIBLE" | "JUSTO" | "TAPADO";
  tone: "ok" | "warn" | "bad";
  hint: string;
};

type LiveViewProps = {
  videoRef: RefObject<HTMLVideoElement>;
  camera: CameraState;
  orientation: OrientationReading;
  calibration: CalibrationState;
  location: ManualLocation;
  sunAt1930: SunPosition;
  sunAt2030: SunPosition;
  scoutingStatus: ScoutingStatus;
  onAdjustDirection: () => void;
  onToggleMode: () => void;
};

export function LiveView({
  videoRef,
  camera,
  orientation,
  calibration,
  location,
  sunAt1930,
  sunAt2030,
  scoutingStatus,
  onAdjustDirection,
  onToggleMode
}: LiveViewProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 390, height: 680 });

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
      setViewport({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const p1930 = useMemo(
    () => projectSunToViewport(sunAt1930, orientation, calibration, viewport.width, viewport.height),
    [sunAt1930, orientation, calibration, viewport.height, viewport.width]
  );
  const p2030 = useMemo(
    () => projectSunToViewport(sunAt2030, orientation, calibration, viewport.width, viewport.height),
    [sunAt2030, orientation, calibration, viewport.height, viewport.width]
  );
  const horizonLine = useMemo(() => {
    const halfVFov = calibration.verticalFovDeg / 2;
    const deltaAlt = -(orientation.pitch ?? 0) - calibration.pitchOffsetDeg - calibration.horizonOffsetDeg;
    const normalized = Math.max(-1, Math.min(1, deltaAlt / halfVFov));
    return viewport.height / 2 - normalized * (viewport.height / 2);
  }, [calibration.horizonOffsetDeg, calibration.pitchOffsetDeg, calibration.verticalFovDeg, orientation.pitch, viewport.height]);

  const showTrajectory = p1930.shouldRender && p2030.shouldRender && p1930.withinFrame && p2030.withinFrame;

  return (
    <section className="live-stage minimal">
      <div className="video-shell" ref={shellRef}>
        <video ref={videoRef} playsInline muted className="camera-feed" />
        {!camera.stream && (
          <div className="camera-fallback">
            <p>Sin cámara activa. Si Safari no concede permiso, usa simulación.</p>
            <button className="primary-button" onClick={() => camera.start()}>
              Abrir cámara
            </button>
            <button className="ghost-button" onClick={() => orientation.requestPermission()}>
              Activar brújula
            </button>
          </div>
        )}

        <div className="hud-layer">
          <div className="simple-horizon" style={{ top: `${Math.max(0, Math.min(viewport.height, horizonLine))}px` }} />
          {showTrajectory && (
            <svg className="trajectory-overlay" viewBox={`0 0 ${viewport.width} ${viewport.height}`} preserveAspectRatio="none">
              <line x1={p1930.x} y1={p1930.y} x2={p2030.x} y2={p2030.y} stroke="#ffd05d" strokeWidth="4" />
            </svg>
          )}
          {p1930.shouldRender && p1930.withinFrame && (
            <div className="sun-marker sun-1930" style={{ left: `${p1930.x}px`, top: `${p1930.y}px` }} />
          )}
          {p2030.shouldRender && p2030.withinFrame && (
            <div className="sun-marker sun-2030" style={{ left: `${p2030.x}px`, top: `${p2030.y}px` }} />
          )}

          <div className="hud-top">
            <span className="pill">19:30 {sunAt1930.altitudeDeg.toFixed(1)}°</span>
            <span className={`pill ${orientation.confidence === "low" ? "warn" : ""}`}>Brújula {orientation.confidence}</span>
            <span className="pill">20:30 {degreesToCardinal(sunAt2030.azimuthDeg)}</span>
          </div>

          <div className="eclipse-strip visible">
            <strong>{scoutingStatus.label}</strong>
            <span>20:30 {sunAt2030.altitudeDeg.toFixed(1)}°</span>
            <span>{degreesToCardinal(sunAt2030.azimuthDeg)}</span>
            <span>{location.label}</span>
          </div>

          <div className="scouting-actions-overlay">
            <button className="primary-button" onClick={onAdjustDirection}>
              Ajustar dirección
            </button>
            <button className="ghost-button" onClick={onToggleMode}>
              Simulación
            </button>
          </div>

          {!p2030.shouldRender && (
            <div className="sensor-warning">El Sol de las 20:30 queda fuera del campo visible actual.</div>
          )}
        </div>
      </div>
    </section>
  );
}
