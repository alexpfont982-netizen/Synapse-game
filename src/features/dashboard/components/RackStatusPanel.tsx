// RackStatusPanel.tsx
// Presentational rack status panel, reusable in the Laboratory editor and in
// the Dashboard's GarageRackOverlay. Renamed to *Panel* so it doesn't collide
// with the existing `type RackStatus` in GarageRackOverlay.tsx.
//
// Field names match the `rackStatus` useMemo already in LaboratoryEditor.tsx
// (powerLoad / temperature / stability / aiOutput / installedCount).


export type SlotCategory = "PSU" | "CABLES" | "COOLING" | "STORAGE" | "RAM" | "GPU";

export interface SlotFill {
  category: SlotCategory;
  filled: number;
  total: number;
}

export interface RackStatusStats {
  powerLoad: number;        // W
  temperature: number;      // °C
  stability: number;        // %
  aiOutput: number;         // TF
  installedCount: number;
  capacity: number;         // e.g. 20
  slotFill: SlotFill[];
  events?: { label: string; value: string }[];
}

interface RackStatusPanelProps extends RackStatusStats {
  /** "lab" = full panel with events. "compact" = stats + slot fill only. */
  variant?: "lab" | "compact";
  className?: string;
}

// --- color thresholds (mirror your LaboratoryEditor valueColor logic) -------

function powerTone(w: number): string {
  return w > 800 ? "text-red-400" : "text-emerald-400";
}
function tempTone(c: number): string {
  return c > 150 ? "text-red-400" : "text-cyan-300";
}
function stabilityTone(pct: number): string {
  return pct >= 90 ? "text-cyan-300" : pct >= 60 ? "text-amber-400" : "text-red-400";
}
function slotTone(filled: number, total: number): string {
  if (total === 0) return "text-slate-500";
  return filled >= total ? "text-emerald-400" : "text-cyan-300";
}

function StatTile({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-slate-700/60 bg-slate-900/40 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className={`mt-0.5 text-base font-semibold tabular-nums ${tone ?? "text-slate-100"}`}>
        {value}
        {unit ? <span className="ml-1 text-xs font-normal text-slate-400">{unit}</span> : null}
      </div>
    </div>
  );
}

export default function RackStatusPanel({
  powerLoad,
  temperature,
  stability,
  aiOutput,
  installedCount,
  capacity,
  slotFill,
  events,
  variant = "lab",
  className = "",
}: RackStatusPanelProps) {
  return (
    <div
      className={`flex w-full flex-col gap-3 rounded-lg border border-slate-700/60 bg-slate-950/60 p-3 backdrop-blur-sm ${className}`}
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-cyan-300/80">
        Rack Status
      </h3>

      <div className="grid grid-cols-1 gap-2">
        <StatTile label="Power Load" value={powerLoad} unit="W" tone={powerTone(powerLoad)} />
        <StatTile label="Temperature" value={temperature} unit="°C" tone={tempTone(temperature)} />
        <StatTile label="Stability" value={stability} unit="%" tone={stabilityTone(stability)} />
        <StatTile label="AI Output" value={aiOutput.toFixed(1)} unit="TF" tone="text-violet-300" />
        <StatTile
          label="Components"
          value={`${installedCount}/${capacity}`}
          tone={installedCount >= capacity ? "text-emerald-400" : "text-slate-100"}
        />
      </div>

      <div className="rounded-md border border-slate-700/60 bg-slate-900/40 px-3 py-2">
        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
          Slot Fill
        </div>
        <div className="flex flex-col gap-1">
          {slotFill.map((s) => (
            <div key={s.category} className="flex items-center justify-between text-xs">
              <span className="uppercase tracking-wide text-slate-400">{s.category}</span>
              <span className={`tabular-nums font-medium ${slotTone(s.filled, s.total)}`}>
                {s.filled}/{s.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {variant === "lab" && events && events.length > 0 && (
        <div className="rounded-md border border-slate-700/60 bg-slate-900/40 px-3 py-2">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
            System Events
          </div>
          <div className="flex flex-col gap-1">
            {events.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-slate-300">{e.label}</span>
                <span className="text-slate-500">{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}