import { useState } from "react";
import { formatCoords } from "../lib/format";
import type { ManualLocation } from "../lib/types";

type LocationPanelProps = {
  geo: {
    location: ManualLocation | null;
    loading: boolean;
    error: string | null;
    permission: string;
  };
  activeLocation: ManualLocation;
  setManualLocation: (location: ManualLocation) => void;
  closestLocation: ManualLocation;
};

export function LocationPanel({ geo, activeLocation, setManualLocation, closestLocation }: LocationPanelProps) {
  const [latitude, setLatitude] = useState(activeLocation.latitude.toFixed(4));
  const [longitude, setLongitude] = useState(activeLocation.longitude.toFixed(4));

  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Lugar activo</p>
          <h2>{activeLocation.label}</h2>
        </div>
        <span className="pill">{activeLocation.source}</span>
      </div>
      <p className="muted">{formatCoords(activeLocation.latitude, activeLocation.longitude)}</p>
      <p className="muted">GPS {geo.permission}</p>
      {geo.error && <p className="error-text">GPS: {geo.error}</p>}
      <div className="action-bar compact">
        <button
          className="ghost-button"
          onClick={() =>
            setManualLocation({
              ...closestLocation,
              source: "manual"
            })
          }
        >
          Usar {closestLocation.label}
        </button>
      </div>
      <div className="coord-grid">
        <label>
          Latitud
          <input value={latitude} onChange={(event) => setLatitude(event.target.value)} inputMode="decimal" />
        </label>
        <label>
          Longitud
          <input value={longitude} onChange={(event) => setLongitude(event.target.value)} inputMode="decimal" />
        </label>
      </div>
      <button
        className="ghost-button"
        onClick={() =>
          setManualLocation({
            label: `Coords manuales ${latitude}, ${longitude}`,
            latitude: Number(latitude),
            longitude: Number(longitude),
            source: "manual"
          })
        }
      >
        Usar coordenadas manuales
      </button>
    </section>
  );
}
