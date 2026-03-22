import { useMemo, useState, type MouseEvent } from "react";
import {
  assessSunVisibility,
  sortAzimuthPoints,
  viewportPointToAzimuthElevation
} from "../lib/horizon";
import type {
  CalibrationState,
  FrozenFrame,
  HorizonAzimuthPoint,
  HorizonPoint,
  HorizonProfile,
  OrientationReading,
  SunPosition
} from "../lib/types";

type HorizonEditorProps = {
  frozenFrame: FrozenFrame | null;
  setFrozenFrame: (frame: FrozenFrame | null) => void;
  horizonProfile: HorizonProfile;
  setHorizonProfile: (profile: HorizonProfile) => void;
  orientation: OrientationReading;
  calibration: CalibrationState;
  sun: SunPosition;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function HorizonEditor({
  frozenFrame,
  setFrozenFrame,
  horizonProfile,
  setHorizonProfile,
  orientation,
  calibration,
  sun
}: HorizonEditorProps) {
  const frame = frozenFrame ?? horizonProfile.frozenCapture.frame;
  const points = frozenFrame ? [] : horizonProfile.frozenCapture.points;
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const sortedAzimuthPoints = useMemo(() => sortAzimuthPoints(horizonProfile.azimuthPoints), [horizonProfile.azimuthPoints]);
  const selectedAngularPoint = horizonProfile.azimuthPoints.find((point) => point.id === selectedPointId) ?? null;
  const selectedCapturePoint = points.find((point) => point.id === selectedPointId) ?? null;
  const visibility = assessSunVisibility(sun, horizonProfile);

  const syncPoint = (id: string, capturePoint: HorizonPoint, angularPoint: HorizonAzimuthPoint) => {
    setHorizonProfile({
      ...horizonProfile,
      azimuthPoints: [
        ...horizonProfile.azimuthPoints.filter((point) => point.id !== id),
        angularPoint
      ],
      frozenCapture: {
        frame,
        points: [...points.filter((point) => point.id !== id), capturePoint]
      }
    });
  };

  const handleImageClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!frame) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * frame.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * frame.height;
    const nearest = points.find((point) => Math.hypot(point.x - x, point.y - y) < 30);

    if (nearest) {
      setSelectedPointId(nearest.id);
      return;
    }

    const id = makeId();
    const capturePoint = { id, x, y };
    const angular = viewportPointToAzimuthElevation(capturePoint, frame, calibration);
    syncPoint(id, capturePoint, { id, ...angular, source: "capture" });
    setSelectedPointId(id);
  };

  const updateSelectedAngular = (key: "azimuthDeg" | "elevationDeg", value: number) => {
    if (!selectedAngularPoint) {
      return;
    }
    setHorizonProfile({
      ...horizonProfile,
      azimuthPoints: horizonProfile.azimuthPoints.map((point) =>
        point.id === selectedAngularPoint.id ? { ...point, [key]: value } : point
      )
    });
  };

  const removeSelectedPoint = () => {
    if (!selectedPointId) {
      return;
    }
    setHorizonProfile({
      ...horizonProfile,
      azimuthPoints: horizonProfile.azimuthPoints.filter((point) => point.id !== selectedPointId),
      frozenCapture: {
        frame,
        points: points.filter((point) => point.id !== selectedPointId)
      }
    });
    setSelectedPointId(null);
  };

  const exportProfile = async () => {
    const payload = JSON.stringify(sortedAzimuthPoints, null, 2);
    setImportText(payload);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload).catch(() => undefined);
    }
  };

  const importProfile = () => {
    try {
      const parsed = JSON.parse(importText) as HorizonAzimuthPoint[];
      setHorizonProfile({
        ...horizonProfile,
        azimuthPoints: parsed.map((point) => ({
          ...point,
          id: point.id ?? makeId(),
          source: point.source ?? "manual"
        }))
      });
    } catch {
      return;
    }
  };

  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Horizonte</p>
          <h2>Perfil por azimut</h2>
        </div>
        <button className="ghost-button" onClick={() => setFrozenFrame(null)}>
          Soltar frame
        </button>
      </div>

      <div className="slider-card">
        <label>
          Obstáculo rápido en esta dirección
          <input
            type="range"
            min={0}
            max={12}
            step={0.2}
            value={horizonProfile.manualObstacles[0]?.elevationDeg ?? 0}
            onChange={(event) =>
              setHorizonProfile({
                ...horizonProfile,
                manualObstacles: [
                  {
                    centerAzimuthDeg: orientation.heading ?? sun.azimuthDeg,
                    widthDeg: 18,
                    elevationDeg: Number(event.target.value),
                    label: "Obstáculo rápido"
                  }
                ]
              })
            }
          />
        </label>
      </div>

      <p className="muted">{visibility.label}</p>

      {frame ? (
        <div className="capture-editor" onClick={handleImageClick} role="button" tabIndex={0}>
          <img src={frame.dataUrl} alt="Captura congelada del horizonte" />
          <svg viewBox={`0 0 ${frame.width} ${frame.height}`} className="capture-overlay">
            {points.map((point) => (
              <circle
                key={point.id}
                cx={point.x}
                cy={point.y}
                r={selectedPointId === point.id ? 13 : 9}
                fill={selectedPointId === point.id ? "#ffd05d" : "#ff7a59"}
              />
            ))}
            {points.length >= 2 && (
              <polyline
                points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#ff7a59"
                strokeWidth="6"
              />
            )}
          </svg>
        </div>
      ) : (
        <p className="muted">Congela una captura en el visor para dibujar o seleccionar puntos del horizonte.</p>
      )}

      {selectedAngularPoint && (
        <div className="panel-card inset-card slider-card">
          <h3>Punto seleccionado</h3>
          <label>
            Azimut {selectedAngularPoint.azimuthDeg.toFixed(1)}°
            <input
              type="range"
              min={220}
              max={340}
              step={0.2}
              value={selectedAngularPoint.azimuthDeg}
              onChange={(event) => updateSelectedAngular("azimuthDeg", Number(event.target.value))}
            />
          </label>
          <label>
            Elevación {selectedAngularPoint.elevationDeg.toFixed(1)}°
            <input
              type="range"
              min={-1}
              max={18}
              step={0.1}
              value={selectedAngularPoint.elevationDeg}
              onChange={(event) => updateSelectedAngular("elevationDeg", Number(event.target.value))}
            />
          </label>
          <div className="action-bar compact">
            <button className="ghost-button" onClick={removeSelectedPoint}>
              Borrar punto
            </button>
            {selectedCapturePoint && (
              <span className="muted">
                Frame {selectedCapturePoint.x.toFixed(0)}, {selectedCapturePoint.y.toFixed(0)}
              </span>
            )}
          </div>
        </div>
      )}

      <svg viewBox="0 0 100 40" className="horizon-graph" aria-label="Gráfico azimut elevación">
        <rect x="0" y="0" width="100" height="40" rx="4" fill="rgba(17,24,32,0.85)" />
        <line x1="0" y1="39" x2="100" y2="39" stroke="#93a8be" strokeWidth="0.5" />
        {sortedAzimuthPoints.length >= 2 && (
          <polyline
            points={sortedAzimuthPoints
              .map((point) => `${((point.azimuthDeg - 220) / 120) * 100},${39 - (point.elevationDeg / 18) * 34}`)
              .join(" ")}
            fill="none"
            stroke="#ff7a59"
            strokeWidth="1.4"
          />
        )}
        <circle cx={((sun.azimuthDeg - 220) / 120) * 100} cy={39 - (sun.altitudeDeg / 18) * 34} r="1.7" fill="#ffd05d" />
      </svg>

      <textarea
        className="profile-textarea"
        rows={6}
        value={importText}
        onChange={(event) => setImportText(event.target.value)}
        placeholder="Importa o revisa aquí el JSON del perfil angular."
      />

      <div className="action-bar compact">
        <button className="ghost-button" onClick={exportProfile}>
          Exportar perfil
        </button>
        <button className="ghost-button" onClick={importProfile}>
          Importar perfil
        </button>
        <button
          className="ghost-button"
          onClick={() =>
            setHorizonProfile({
              ...horizonProfile,
              azimuthPoints: [],
              frozenCapture: {
                frame,
                points: []
              }
            })
          }
        >
          Borrar todo
        </button>
      </div>
    </section>
  );
}
