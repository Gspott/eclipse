import { useEffect, useState } from "react";
import type { ManualLocation } from "../lib/types";

type GeolocationState = {
  location: ManualLocation | null;
  loading: boolean;
  error: string | null;
  permission: "idle" | "granted" | "denied" | "prompt" | "unsupported";
};

export function useGeolocation(fallbackLocation: ManualLocation | null) {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: true,
    error: null,
    permission: "idle"
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({
        location: fallbackLocation,
        loading: false,
        error: "Geolocalización no disponible.",
        permission: "unsupported"
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          location: {
            label: "Ubicación actual",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: "gps"
          },
          loading: false,
          error: null,
          permission: "granted"
        });
      },
      (error) => {
        setState({
          location: fallbackLocation,
          loading: false,
          error: error.message,
          permission: error.code === error.PERMISSION_DENIED ? "denied" : "prompt"
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 10000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [fallbackLocation]);

  return state;
}
