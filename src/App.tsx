import { useEffect, useMemo, useRef, useState } from "react";
import { CalibrationPanel } from "./components/CalibrationPanel";
import { DemoPanel } from "./components/DemoPanel";
import { EclipseTimeline } from "./components/EclipseTimeline";
import { LiveView } from "./components/LiveView";
import { LocationPanel } from "./components/LocationPanel";
import { SafetyNotice } from "./components/SafetyNotice";
import { SimulationView } from "./components/SimulationView";
import { SiteCard } from "./components/SiteCard";
import { SimpleMapPanel } from "./components/SimpleMapPanel";
import { HorizonEditor } from "./components/HorizonEditor";
import { useCamera } from "./hooks/useCamera";
import { useDeviceOrientation } from "./hooks/useDeviceOrientation";
import { useEclipseClock } from "./hooks/useEclipseClock";
import { useGeolocation } from "./hooks/useGeolocation";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { usePageVisibility } from "./hooks/usePageVisibility";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_CALIBRATION,
  DEFAULT_HORIZON_PROFILE,
  type AppMode,
  type AppSettings,
  type CalibrationState,
  type FrozenFrame,
  type HorizonProfile,
  type ManualLocation,
  type OrientationOverrideState,
  type OrientationReading
} from "./lib/types";
import { buildContactMoments, buildLocationSummary, getClosestSampleLocation } from "./lib/eclipse";
import { getSunPosition } from "./lib/solar";
import { buildLocationKey, mergeCalibrationForLocation } from "./lib/calibration";
import { getSiteScore } from "./lib/scoring";
import { assessSunVisibility, getHorizonElevationAt } from "./lib/horizon";

const DEFAULT_LOCATION: ManualLocation = {
  label: "Madrid demo",
  latitude: 40.4168,
  longitude: -3.7038,
  source: "demo"
};

export default function App() {
  const [mode, setMode] = useLocalStorage<AppMode>("mode", "live");
  const [dayTheme, setDayTheme] = useLocalStorage<"day" | "night">("theme", "day");
  const [manualLocation, setManualLocation] = useLocalStorage<ManualLocation>("manual-location", DEFAULT_LOCATION);
  const [savedCalibrations, setSavedCalibrations] = useLocalStorage<Record<string, CalibrationState>>(
    "saved-calibrations",
    {}
  );
  const [calibration, setCalibration] = useLocalStorage<CalibrationState>("active-calibration", DEFAULT_CALIBRATION);
  const [horizonProfile, setHorizonProfile] = useLocalStorage<HorizonProfile>(
    "horizon-profile",
    DEFAULT_HORIZON_PROFILE
  );
  const [settings, setSettings] = useLocalStorage<AppSettings>("app-settings", DEFAULT_APP_SETTINGS);
  const [orientationOverride, setOrientationOverride] = useLocalStorage<OrientationOverrideState>(
    "orientation-override",
    {
      enabled: false,
      heading: 285,
      pitch: 8,
      roll: 0,
      source: "manual"
    }
  );
  const [frozenFrame, setFrozenFrame] = useState<FrozenFrame | null>(null);
  const [demoEnabled, setDemoEnabled] = useLocalStorage<boolean>("demo-enabled", true);
  const [showDataPanel, setShowDataPanel] = useLocalStorage<boolean>("show-data-panel", true);
  const [useCurrentTime, setUseCurrentTime] = useLocalStorage<boolean>("use-current-time", true);
  const [selectedTimeMs, setSelectedTimeMs] = useLocalStorage<number>("selected-time-ms", Date.now());
  const [lockOrientation, setLockOrientation] = useLocalStorage<"portrait" | "landscape" | "auto">(
    "lock-orientation",
    "auto"
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pageVisible = usePageVisibility();

  const geo = useGeolocation(demoEnabled ? manualLocation : null);
  const effectiveOverride =
    demoEnabled && orientationOverride.source === "simulated" && orientationOverride.enabled
      ? orientationOverride
      : settings.manualOrientationMode || (orientationOverride.enabled && orientationOverride.source === "manual")
        ? orientationOverride
        : null;
  const orientation = useDeviceOrientation(calibration, {
    smoothingFactor: settings.smoothingFactor,
    fpsCap: settings.fpsCap,
    override: effectiveOverride,
    paused: !pageVisible
  });
  const camera = useCamera(videoRef);

  const activeLocation = demoEnabled ? manualLocation : geo.location ?? manualLocation;
  const effectiveCalibration = useMemo(
    () => mergeCalibrationForLocation(calibration, savedCalibrations, activeLocation),
    [activeLocation, calibration, savedCalibrations]
  );

  const clock = useEclipseClock(useCurrentTime, selectedTimeMs, !pageVisible, settings.lowPowerMode ? 2000 : 1000);
  const sun = useMemo(
    () => getSunPosition(activeLocation.latitude, activeLocation.longitude, clock.activeDate),
    [activeLocation.latitude, activeLocation.longitude, clock.activeDate]
  );
  const summary = useMemo(
    () => buildLocationSummary(activeLocation.latitude, activeLocation.longitude),
    [activeLocation.latitude, activeLocation.longitude]
  );
  const contacts = useMemo(
    () => buildContactMoments(activeLocation.latitude, activeLocation.longitude, summary),
    [activeLocation.latitude, activeLocation.longitude, summary]
  );
  const score = useMemo(() => {
    const horizonAtMax = getHorizonElevationAt(horizonProfile, summary.maxSunAzimuth) ?? 0;
    return getSiteScore({
      latitude: activeLocation.latitude,
      longitude: activeLocation.longitude,
      maximumTimestamp: summary.maximum,
      sunAltitudeAtMax: summary.maxSunAltitude,
      maxAzimuth: summary.maxSunAzimuth,
      totality: summary.eclipseType === "total",
      sunsetMinutesAfterMax: summary.sunsetOffsetMinutes,
      obstacleElevationDeg: horizonAtMax,
      horizonMarginDeg: summary.maxSunAltitude - horizonAtMax,
      horizonProfile
    });
  }, [activeLocation.latitude, activeLocation.longitude, horizonProfile, summary]);
  const visibility = useMemo(() => assessSunVisibility(sun, horizonProfile), [sun, horizonProfile]);

  const saveCalibrationForLocation = () => {
    const key = buildLocationKey(activeLocation);
    setSavedCalibrations({
      ...savedCalibrations,
      [key]: effectiveCalibration
    });
  };

  const closestLocation = useMemo(
    () => getClosestSampleLocation(activeLocation.latitude, activeLocation.longitude),
    [activeLocation.latitude, activeLocation.longitude]
  );

  const jumpToTime = (timestamp: number) => {
    setUseCurrentTime(false);
    setSelectedTimeMs(timestamp);
  };

  const alignWithSunNow = () => {
    if (orientation.heading === null || orientation.pitch === null) {
      return;
    }
    const azimuthOffsetDeg = ((sun.azimuthDeg - orientation.heading + 540) % 360) - 180;
    const pitchOffsetDeg = sun.altitudeDeg - orientation.pitch;
    const estimatedPrecisionDeg =
      Math.max(0.6, Math.min(12, orientation.jitterDeg * 1.2 + (100 - orientation.sensorScore) * 0.05));

    const nextCalibration: CalibrationState = {
      ...effectiveCalibration,
      azimuthOffsetDeg,
      pitchOffsetDeg,
      lastSolarCalibrationTs: clock.activeDate.getTime(),
      estimatedPrecisionDeg
    };

    setCalibration(nextCalibration);
    const key = buildLocationKey(activeLocation);
    setSavedCalibrations({
      ...savedCalibrations,
      [key]: nextCalibration
    });
  };

  const resetSolarAlignment = () => {
    setCalibration({
      ...effectiveCalibration,
      azimuthOffsetDeg: 0,
      pitchOffsetDeg: 0,
      lastSolarCalibrationTs: null,
      estimatedPrecisionDeg: null
    });
  };

  const applyOrientationLock = async (value: "portrait" | "landscape" | "auto") => {
    setLockOrientation(value);
    const screenOrientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: "portrait-primary" | "landscape-primary") => Promise<void>;
      unlock?: () => void;
    };
    if (!screenOrientation.lock) {
      return;
    }
    try {
      if (value === "auto") {
        screenOrientation.unlock?.();
        return;
      }
      await screenOrientation.lock(
        value === "portrait" ? ("portrait-primary" as never) : ("landscape-primary" as never)
      );
    } catch {
      return;
    }
  };

  useEffect(() => {
    if (!settings.hapticsEnabled || !pageVisible || mode === "demo") {
      return;
    }
    const maximumDeltaMin = Math.round((summary.maximum - clock.activeDate.getTime()) / 60000);
    if ([10, 5, 1].includes(maximumDeltaMin) && navigator.vibrate) {
      navigator.vibrate(maximumDeltaMin === 1 ? [30, 40, 30] : [20]);
    }
  }, [clock.activeDate, mode, pageVisible, settings.hapticsEnabled, summary.maximum]);

  const sidePanelVisible = showDataPanel && mode !== "eclipse";

  return (
    <div className={`app-shell theme-${dayTheme}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">12 agosto 2026 · España</p>
          <h1>Eclipse Field Finder</h1>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={() => setDayTheme(dayTheme === "day" ? "night" : "day")}>
            {dayTheme === "day" ? "Modo noche" : "Modo día"}
          </button>
          <button className="ghost-button" onClick={() => setShowDataPanel(!showDataPanel)}>
            {showDataPanel ? "Solo visor" : "Mostrar datos"}
          </button>
        </div>
      </header>

      <SafetyNotice />

      <nav className="mode-tabs" aria-label="Modos principales">
        {[
          ["live", "Visor"],
          ["eclipse", "Modo eclipse"],
          ["simulate", "Simulación"],
          ["calibrate", "Calibración"],
          ["map", "Mapa simple"],
          ["demo", "Demo"]
        ].map(([value, label]) => (
          <button
            key={value}
            className={mode === value ? "tab active" : "tab"}
            onClick={() => setMode(value as AppMode)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className={sidePanelVisible ? "layout with-panel" : "layout without-panel"}>
        <section className="viewer-column">
          {mode === "live" && (
            <LiveView
              videoRef={videoRef}
              camera={camera}
              orientation={orientation}
              calibration={effectiveCalibration}
              location={activeLocation}
              sun={sun}
              summary={summary}
              clock={clock}
              horizonProfile={horizonProfile}
              onCapture={setFrozenFrame}
              settings={settings}
              visibility={visibility}
              maximumTimestamp={summary.maximum}
              minimal={false}
            />
          )}
          {mode === "eclipse" && (
            <LiveView
              videoRef={videoRef}
              camera={camera}
              orientation={orientation}
              calibration={effectiveCalibration}
              location={activeLocation}
              sun={sun}
              summary={summary}
              clock={clock}
              horizonProfile={horizonProfile}
              onCapture={setFrozenFrame}
              settings={settings}
              visibility={visibility}
              maximumTimestamp={summary.maximum}
              minimal={true}
            />
          )}
          {mode === "simulate" && (
            <SimulationView
              location={activeLocation}
              sun={sun}
              summary={summary}
              selectedDate={clock.activeDate}
              horizonProfile={horizonProfile}
            />
          )}
          {mode === "calibrate" && (
            <CalibrationPanel
              calibration={effectiveCalibration}
              setCalibration={setCalibration}
              saveCalibrationForLocation={saveCalibrationForLocation}
              orientation={orientation}
              camera={camera}
              location={activeLocation}
              lockOrientation={lockOrientation}
              applyOrientationLock={applyOrientationLock}
              alignWithSunNow={alignWithSunNow}
              resetSolarAlignment={resetSolarAlignment}
              sun={sun}
              settings={settings}
              setSettings={setSettings}
              orientationOverride={orientationOverride}
              setOrientationOverride={setOrientationOverride}
            />
          )}
          {mode === "map" && (
            <SimpleMapPanel
              location={activeLocation}
              onLocationSelect={setManualLocation}
              summary={summary}
              closestLocation={closestLocation}
            />
          )}
          {mode === "demo" && (
            <DemoPanel
              demoEnabled={demoEnabled}
              setDemoEnabled={setDemoEnabled}
              manualLocation={manualLocation}
              setManualLocation={setManualLocation}
              contacts={contacts}
              summary={summary}
              orientationOverride={orientationOverride}
              setOrientationOverride={setOrientationOverride}
              selectedTimeMs={clock.activeDate.getTime()}
              setSelectedTimeMs={setSelectedTimeMs}
              setUseCurrentTime={setUseCurrentTime}
            />
          )}
        </section>

        {sidePanelVisible && (
          <aside className="panel-column">
            <LocationPanel
              geo={geo}
              activeLocation={activeLocation}
              setManualLocation={setManualLocation}
              closestLocation={closestLocation}
            />
            <EclipseTimeline
              useCurrentTime={useCurrentTime}
              setUseCurrentTime={setUseCurrentTime}
              selectedTimeMs={clock.activeDate.getTime()}
              setSelectedTimeMs={setSelectedTimeMs}
              contacts={contacts}
              jumpToTime={jumpToTime}
              activeLocation={activeLocation}
            />
            <SiteCard summary={summary} score={score} />
            <HorizonEditor
              frozenFrame={frozenFrame}
              setFrozenFrame={setFrozenFrame}
              horizonProfile={horizonProfile}
              setHorizonProfile={setHorizonProfile}
              orientation={orientation as OrientationReading}
              calibration={effectiveCalibration}
              sun={sun}
            />
          </aside>
        )}
      </main>
    </div>
  );
}
