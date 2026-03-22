import { useEffect, useMemo, useState } from "react";

function buildFixedDate(sourceTime: number) {
  const source = new Date(sourceTime);
  return new Date(
    2026,
    7,
    12,
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds()
  );
}

export function useEclipseClock(useCurrentTime: boolean, selectedTimeMs: number, paused = false, tickMs = 1000) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!useCurrentTime || paused) {
      return;
    }
    const interval = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(interval);
  }, [paused, tickMs, useCurrentTime]);

  const activeDate = useMemo(
    () => buildFixedDate(useCurrentTime ? now : selectedTimeMs),
    [now, selectedTimeMs, useCurrentTime]
  );

  return {
    activeDate,
    realNow: now
  };
}
