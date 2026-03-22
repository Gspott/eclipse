import type { RefObject } from "react";
import { useState } from "react";
import type { CameraState } from "../lib/types";

export function useCamera(videoRef: RefObject<HTMLVideoElement>): CameraState {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permission, setPermission] = useState<CameraState["permission"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);

  const stop = () => {
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
  };

  const start = async (deviceId?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission("unsupported");
      setError("La cámara no está disponible en este dispositivo o contexto.");
      return;
    }

    stop();

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? {
              deviceId: { exact: deviceId }
            }
          : {
              facingMode: { ideal: "environment" }
            },
        audio: false
      });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      const nextDeviceId = nextStream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId ?? null;

      setAvailableDevices(videoDevices);
      setActiveDeviceId(nextDeviceId);
      setStream(nextStream);
      setPermission("granted");
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = nextStream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (cameraError) {
      setPermission("denied");
      setError(cameraError instanceof Error ? cameraError.message : "No se pudo abrir la cámara.");
    }
  };

  return {
    stream,
    permission,
    error,
    activeDeviceId,
    availableDevices,
    start,
    stop
  };
}
