import { formatShortTime } from "../lib/format";
import type { ContactMoment, ManualLocation } from "../lib/types";

type EclipseTimelineProps = {
  useCurrentTime: boolean;
  setUseCurrentTime: (value: boolean) => void;
  selectedTimeMs: number;
  setSelectedTimeMs: (value: number) => void;
  contacts: ContactMoment[];
  jumpToTime: (timestamp: number) => void;
  activeLocation: ManualLocation;
};

const START_MS = new Date("2026-08-12T18:30:00+02:00").getTime();
const END_MS = new Date("2026-08-12T21:30:00+02:00").getTime();

export function EclipseTimeline({
  useCurrentTime,
  setUseCurrentTime,
  selectedTimeMs,
  setSelectedTimeMs,
  contacts,
  jumpToTime,
  activeLocation
}: EclipseTimelineProps) {
  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Tiempo local</p>
          <h2>Tramo útil del eclipse</h2>
        </div>
        <button className={useCurrentTime ? "primary-button" : "ghost-button"} onClick={() => setUseCurrentTime(!useCurrentTime)}>
          {useCurrentTime ? "Tiempo real" : "Usar ahora"}
        </button>
      </div>
      <input
        type="range"
        min={START_MS}
        max={END_MS}
        step={60000}
        value={selectedTimeMs}
        onChange={(event) => {
          setUseCurrentTime(false);
          setSelectedTimeMs(Number(event.target.value));
        }}
      />
      <div className="timeline-scale">
        <span>18:30</span>
        <span>{activeLocation.label}</span>
        <span>21:30</span>
      </div>
      <div className="contact-strip">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            className={contact.emphasis ? "contact-chip active" : "contact-chip"}
            onClick={() => jumpToTime(contact.timestamp)}
          >
            {contact.label} {formatShortTime(contact.timestamp)}
          </button>
        ))}
      </div>
    </section>
  );
}
