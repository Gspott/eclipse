export type AppMode = "live" | "eclipse" | "simulate" | "calibrate" | "map" | "demo";

export type ManualLocation = {
  label: string;
  latitude: number;
  longitude: number;
  source: "demo" | "manual" | "gps" | "map";
};

export type PermissionStateName = "prompt" | "granted" | "denied" | "unsupported" | "idle";

export type CameraState = {
  stream: MediaStream | null;
  permission: PermissionStateName;
  error: string | null;
  activeDeviceId: string | null;
  availableDevices: MediaDeviceInfo[];
  start: (deviceId?: string) => Promise<void>;
  stop: () => void;
};

export type OrientationReading = {
  heading: number | null;
  pitch: number | null;
  roll: number | null;
  accuracy: "good" | "medium" | "low" | "none";
  confidence: "high" | "medium" | "low";
  sensorScore: number;
  jitterDeg: number;
  eventRateHz: number;
  staleMs: number;
  permission: PermissionStateName;
  available: boolean;
  source: "sensor" | "manual" | "simulated";
  requestPermission: () => Promise<void>;
};

export type CalibrationState = {
  azimuthOffsetDeg: number;
  pitchOffsetDeg: number;
  rollOffsetDeg: number;
  horizontalFovDeg: number;
  verticalFovDeg: number;
  horizonOffsetDeg: number;
  recenterOnOpen: boolean;
  lastSolarCalibrationTs: number | null;
  estimatedPrecisionDeg: number | null;
};

export type SunPosition = {
  altitudeDeg: number;
  azimuthDeg: number;
  hourAngleDeg: number;
  declinationDeg: number;
};

export type EclipseType = "total" | "partial";

export type ContactMoment = {
  id: "partialStart" | "totalStart" | "maximum" | "totalEnd" | "partialEnd" | "sunset";
  label: string;
  timestamp: number;
  emphasis?: boolean;
};

export type LocationSummary = {
  eclipseType: EclipseType;
  partialStart: number;
  maximum: number;
  partialEnd: number;
  totalStart?: number;
  totalEnd?: number;
  totalityDurationSec: number;
  maxSunAltitude: number;
  maxSunAzimuth: number;
  sunset: number;
  sunsetOffsetMinutes: number;
  bandDistanceKm: number;
  confidenceLabel: string;
  note: string;
};

export type SectorObstacle = {
  centerAzimuthDeg: number;
  widthDeg: number;
  elevationDeg: number;
  label?: string;
};

export type HorizonPoint = {
  id: string;
  x: number;
  y: number;
};

export type HorizonAzimuthPoint = {
  id: string;
  azimuthDeg: number;
  elevationDeg: number;
  source: "capture" | "manual";
};

export type FrozenFrame = {
  dataUrl: string;
  width: number;
  height: number;
  heading: number;
  pitch: number;
  roll: number;
  timestamp: number;
};

export type HorizonProfile = {
  manualObstacles: SectorObstacle[];
  azimuthPoints: HorizonAzimuthPoint[];
  frozenCapture: {
    frame: FrozenFrame | null;
    points: HorizonPoint[];
  };
};

export type SiteScore = {
  label: "Excelente" | "Bueno" | "Justo" | "Malo";
  numeric: number;
  reasons: string[];
};

export type AppSettings = {
  smoothingFactor: number;
  alignmentThresholdDeg: number;
  fpsCap: number;
  hapticsEnabled: boolean;
  lowPowerMode: boolean;
  manualOrientationMode: boolean;
};

export type OrientationOverrideState = {
  enabled: boolean;
  heading: number;
  pitch: number;
  roll: number;
  source: "manual" | "simulated";
};

export type HorizonAssessment = {
  state: "visible" | "grazing" | "hidden" | "unknown";
  marginDeg: number | null;
  horizonElevationDeg: number | null;
  label: string;
};

export const DEFAULT_CALIBRATION: CalibrationState = {
  azimuthOffsetDeg: 0,
  pitchOffsetDeg: 0,
  rollOffsetDeg: 0,
  horizontalFovDeg: 62,
  verticalFovDeg: 49,
  horizonOffsetDeg: 0,
  recenterOnOpen: false,
  lastSolarCalibrationTs: null,
  estimatedPrecisionDeg: null
};

export const DEFAULT_HORIZON_PROFILE: HorizonProfile = {
  manualObstacles: [],
  azimuthPoints: [],
  frozenCapture: {
    frame: null,
    points: []
  }
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  smoothingFactor: 0.22,
  alignmentThresholdDeg: 2.5,
  fpsCap: 20,
  hapticsEnabled: true,
  lowPowerMode: false,
  manualOrientationMode: false
};
