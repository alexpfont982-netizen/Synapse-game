// RackStatusPanel.tsx
export type SlotCategory = "PSU" | "CABLES" | "COOLING" | "STORAGE" | "RAM" | "GPU";

export interface SlotFill {
  category: SlotCategory;
  filled: number;
  total: number;
}

export interface RackBuff {
  item_a:       string;
  item_b:       string;
  effect_type:  string;
  effect_value: string;
  description:  string;
}

export interface RackStatusStats {
  powerLoad:               number;
  temperature:             number;
  stability:               number;
  aiOutput:                number;
  synapsepower?:           number;   // SP Base
  synapsepowerEffective?:  number;   // SP Efectivo (con buffs/penalties)
  installedCount:          number;
  capacity:                number;
  slotFill:                SlotFill[];
  events?:                 { label: string; value: string }[];
}

interface RackStatusPanelProps extends RackStatusStats {
  variant?:  "lab" | "compact";
  className?: string;
}

// ── Color helpers ─────────────────────────────────────────────────

function powerTone(w: number) {
  return w > 800 ? "text-red-400" : "text-emerald-400";
}
function tempTone(c: number) {
  return c > 80 ? "text-red-400" : c > 60 ? "text-amber-400" : "text-cyan-300";
}
function stabilityTone(pct: number) {
  return pct >= 90 ? "text-cyan-300" : pct >= 60 ? "text-amber-400" : "text-red-400";
}
function slotTone(filled: number, total: number) {
  if (total === 0) return "text-slate-500";
  return filled >= total ? "text-emerald-400" : "text-cyan-300";
}
function spTone(sp: number) {
  return sp > 5000 ? "text-emerald-300" : sp > 1000 ? "text-cyan-300" : "text-violet-300";
}

// ── Subcomponents ─────────────────────────────────────────────────

function StatTile({ label, value, unit, tone }: {
  label: string; value: string | number; unit?: string; tone?: string;
}) {
  return (
    <div className="rounded-md border border-slate-700/60 bg-slate-900/40 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-0.5 text-base font-semibold tabular-nums ${tone ?? "text-slate-100"}`}>
        {value}
        {unit ? <span className="ml-1 text-xs font-normal text-slate-400">{unit}</span> : null}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

export default function RackStatusPanel({
  powerLoad, temperature, stability, aiOutput, synapsepower, synapsepowerEffective,
  installedCount, capacity, slotFill, events,
  variant = "lab",
  className = "",
}: RackStatusPanelProps) {

  return (
    <div className={`flex w-full flex-col gap-3 rounded-lg border border-slate-700/60 bg-slate-950/60 p-3 backdrop-blur-sm ${className}`}>

      <h3 className="text-xs font-semibold uppercase tracking-widest text-cyan-300/80">
        Rack Status
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-2">

        {/* SP Base */}
        {synapsepower !== undefined && (
          <div className="rounded-md border border-violet-500/30 bg-violet-950/20 px-3 py-2">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/80">
              SP Base
            </div>
            <div className={`mt-0.5 text-lg font-black tabular-nums ${spTone(synapsepower)}`}>
              {synapsepower.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="ml-1 text-xs font-normal text-violet-400/60">SP</span>
            </div>
            <div className="mt-1 text-[9px] text-slate-500">
              GPU 60% · RAM 20% · Storage 10%
            </div>
          </div>
        )}

        {/* SP Efectivo */}
        {synapsepowerEffective !== undefined && (
          <div className={`rounded-md border px-3 py-2 ${
            synapsepowerEffective > (synapsepower ?? 0)
              ? 'border-emerald-500/30 bg-emerald-950/20'
              : synapsepowerEffective < (synapsepower ?? 0)
                ? 'border-red-500/30 bg-red-950/20'
                : 'border-slate-700/60 bg-slate-900/40'
          }`}>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400/80">
              SP Efectivo
            </div>
            <div className={`mt-0.5 text-lg font-black tabular-nums ${
              synapsepowerEffective > (synapsepower ?? 0) ? 'text-emerald-300'
              : synapsepowerEffective < (synapsepower ?? 0) ? 'text-red-300'
              : 'text-slate-300'
            }`}>
              {synapsepowerEffective.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="ml-1 text-xs font-normal text-slate-500">SP</span>
            </div>
            <div className="mt-1 text-[9px] text-slate-500">
              {synapsepowerEffective > (synapsepower ?? 0)
                ? `+${((synapsepowerEffective / (synapsepower ?? 1) - 1) * 100).toFixed(1)}% from buffs`
                : synapsepowerEffective < (synapsepower ?? 0)
                  ? `-${((1 - synapsepowerEffective / (synapsepower ?? 1)) * 100).toFixed(1)}% from penalties`
                  : 'No active buffs/penalties'}
            </div>
          </div>
        )}

        <StatTile label="Power Load"   value={powerLoad}           unit="W"  tone={powerTone(powerLoad)} />
        <StatTile label="Temperature"  value={temperature}         unit="°C" tone={tempTone(temperature)} />
        <StatTile label="Stability"    value={stability}           unit="%"  tone={stabilityTone(stability)} />
        <StatTile label="AI Output"    value={aiOutput.toFixed(1)} unit="TF" tone="text-slate-400" />
        <StatTile
          label="Components"
          value={`${installedCount}/${capacity}`}
          tone={installedCount >= capacity ? "text-emerald-400" : "text-slate-100"}
        />
      </div>

      {/* Slot Fill */}
      <div className="rounded-md border border-slate-700/60 bg-slate-900/40 px-3 py-2">
        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Slot Fill</div>
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

      {/* System Events — solo en lab */}
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