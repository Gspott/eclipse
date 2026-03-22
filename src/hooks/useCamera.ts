import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import type { CameraState } from "../lib/types";

export function useCamera(videoRef: RefObject<HTMLVideoElement>): CameraState {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permission, setPermission] = useState<CameraState["permission"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const retryRef = useRef(false);

  const attachStreamToVideo = async (nextStream: MediaStream) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute("muted", "true");
    video.setAttribute("autoplay", "true");
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.srcObject = nextStream;
    console.info("[camera] srcObject assigned", { tracks: nextStream.getTracks().length });

    const tryPlay = async () => {
      try {
        await video.play();
        console.info("[camera] video.play resolved");
      } catch (playError) {
        console.warn("[camera] video.play failed", playError);
        throw playError;
      }
    };

    try {
      await tryPlay();
    } catch {
      if (!retryRef.current) {
        retryRef.current = true;
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        await tryPlay().catch(() => undefined);
      }
    }
  };

  const stop = () => {
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setLoading(false);
  };

  const start = async (deviceId?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission("unsupported");
      setError("La cámara no está disponible en este dispositivo o contexto.");
      return;
    }

    if (stream && stream.active) {
      console.info("[camera] existing active stream reused");
      return;
    }

    retryRef.current = false;
    setLoading(true);
    setError(null);

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
      console.info("[camera] getUserMedia resolved", {
        tracks: nextStream.getTracks().length,
        videoTracks: nextStream.getVideoTracks().length
      });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      const nextDeviceId = nextStream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId ?? null;

      setAvailableDevices(videoDevices);
      setActiveDeviceId(nextDeviceId);
      setStream(nextStream);
      setPermission("granted");
      setError(null);
      await attachStreamToVideo(nextStream);
      setLoading(false);
    } catch (cameraError) {
      console.error("[camera] start failed", cameraError);
      const message = cameraError instanceof Error ? cameraError.message : "No se pudo abrir la cámara.";
      if (message.toLowerCase().includes("denied") || message.toLowerCase().includes("permission")) {
        setPermission("denied");
        setError("Permiso denegado");
      } else if (message.toLowerCase().includes("notfound") || message.toLowerCase().includes("device")) {
        setPermission("unsupported");
        setError("Cámara no disponible");
      } else {
        setPermission("denied");
        setError(message);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const onLoadedMetadata = () => {
      console.info("[camera] loadedmetadata", {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", onLoadedMetadata);
  }, [videoRef]);

  useEffect(() => stop, []);

  return {
    stream,
    permission,
    error,
    loading,
    activeDeviceId,
    availableDevices,
    start,
    stop
  };
}
