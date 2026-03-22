import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { buildHorizonPath, buildProjectedPath, projectSunToViewport } from "../lib/projection";
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
  trajectorySamples: SunPosition[];
  scoutingStatus: ScoutingStatus;
  onAdjustDirection: () => void | Promise<void>;
  onAdjustHorizon: () => void | Promise<void>;
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
  trajectorySamples,
  scoutingStatus,
  onAdjustDirection,
  onAdjustHorizon,
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
  const trajectorySegments = useMemo(
    () => buildProjectedPath(trajectorySamples, orientation, calibration, viewport.width, viewport.height),
    [trajectorySamples, orientation, calibration, viewport.height, viewport.width]
  );
  const horizonSegments = useMemo(
    () => buildHorizonPath(orientation, calibration, viewport.width, viewport.height),
    [orientation, calibration, viewport.height, viewport.width]
  );
  const markerCount = Number(p1930.shouldRender && p1930.withinFrame) + Number(p2030.shouldRender && p2030.withinFrame);
  const defensiveMarkerCount = markerCount <= 2;

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
          <svg className="trajectory-overlay" viewBox={`0 0 ${viewport.width} ${viewport.height}`} preserveAspectRatio="none">
            {horizonSegments.map((segment, index) => (
              <polyline
                key={`h-${index}`}
                points={segment.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="rgba(123, 224, 255, 0.9)"
                strokeWidth="3"
              />
            ))}
            {trajectorySegments.map((segment, index) => (
              <polyline
                key={`t-${index}`}
                points={segment.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#ffd05d"
                strokeWidth="4"
              />
            ))}
          </svg>

          {defensiveMarkerCount && p1930.shouldRender && p1930.withinFrame && (
            <div className="sun-marker sun-1930" style={{ left: `${p1930.x}px`, top: `${p1930.y}px` }} />
          )}
          {defensiveMarkerCount && p2030.shouldRender && p2030.withinFrame && (
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
            <button className="ghost-button" onClick={onAdjustHorizon}>
              Ajustar horizonte
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
