import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { projectSunToViewport } from "../lib/projection";
import { degreesToCardinal } from "../lib/solar";
import type { CalibrationState, CameraState, ManualLocation, OrientationReading, SunPosition } from "../lib/types";

type LiveViewProps = {
  videoRef: RefObject<HTMLVideoElement>;
  camera: CameraState;
  orientation: OrientationReading;
  calibration: CalibrationState;
  location: ManualLocation;
  sunAt1930: SunPosition;
  sunAt2030: SunPosition;
  scoutingStatus: {
    label: "VISIBLE" | "JUSTO" | "TAPADO";
    tone: "ok" | "warn" | "bad";
    hint: string;
  };
};

export function LiveView({
  videoRef,
  camera,
  orientation,
  calibration,
  location,
  sunAt1930,
  sunAt2030,
  scoutingStatus
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
    [sunAt1930, orientation, calibration, viewport]
  );
  const p2030 = useMemo(
    () => projectSunToViewport(sunAt2030, orientation, calibration, viewport.width, viewport.height),
    [sunAt2030, orientation, calibration, viewport]
  );
  const horizonLine = useMemo(
    () =>
      projectSunToViewport(
        { ...sunAt2030, altitudeDeg: 0, azimuthDeg: (orientation.heading ?? sunAt2030.azimuthDeg) + calibration.azimuthOffsetDeg },
        orientation,
        calibration,
        viewport.width,
        viewport.height
      ),
    [sunAt2030, orientation, calibration, viewport]
  );

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
          <div className="simple-horizon" style={{ top: `${horizonLine.y}px` }} />
          <svg className="trajectory-overlay" viewBox={`0 0 ${viewport.width} ${viewport.height}`} preserveAspectRatio="none">
            <line x1={p1930.x} y1={p1930.y} x2={p2030.x} y2={p2030.y} stroke="#ffd05d" strokeWidth="4" />
          </svg>
          <div className="sun-marker sun-1930" style={{ left: `${p1930.x}px`, top: `${p1930.y}px` }} />
          <div className="sun-marker sun-2030" style={{ left: `${p2030.x}px`, top: `${p2030.y}px` }} />

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
        </div>
      </div>
    </section>
  );
}
