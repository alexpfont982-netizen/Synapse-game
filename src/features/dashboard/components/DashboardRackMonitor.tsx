import { useMemo } from 'react';

type ComponentType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
  | 'COOLING'
  | 'ROOM_FAN'
  | 'ROOM_EXTRACTOR'
  | 'CONSUMABLE';

type HardwareStats = {
  tflops?: number;
  power?: number;
  heat?: number;
  capacity?: number;
};

export interface DashboardHardwarePiece {
  id: string;
  type: ComponentType;
  name: string;
  slot_id: string | null;
  stats?: HardwareStats | null;
}

// Estructura de una interacción de component_interactions
export interface RackInteraction {
  item_a: string;
  item_b: string;
  effect_type: 'boost' | 'penalty';
  effect_value: string;
  description: string;
}

interface DashboardRackMonitorProps {
  hardware: DashboardHardwarePiece[];
  // Vienen directo de useRackBuffs() en supabasePlayerState
  activeBoosts?: RackInteraction[];
  activePenalties?: RackInteraction[];
}

const RACK_SLOT_CAPACITY = 20;

function toFixedValue(value: number, digits = 1) {
  return value.toFixed(digits);
}

export function DashboardRackMonitor({
  hardware,
  activeBoosts = [],
  activePenalties = [],
}: DashboardRackMonitorProps) {
  const summary = useMemo(() => {
    const installedHardware = hardware.filter((piece) => piece.slot_id);
    const rackHardware = installedHardware.filter((piece) =>
      piece.slot_id?.startsWith('rack1-'),
    );

    const counts = {
      POWER_UNIT: rackHardware.filter((p) => p.type === 'POWER_UNIT').length,
      CABLE_KIT:  rackHardware.filter((p) => p.type === 'CABLE_KIT').length,
      COOLING:    rackHardware.filter((p) => p.type === 'COOLING').length,
      MEMORY:     rackHardware.filter((p) => p.type === 'MEMORY').length,
      STORAGE:    rackHardware.filter((p) => p.type === 'STORAGE').length,
      GPU:        rackHardware.filter((p) => p.type === 'GPU').length,
    };

    const rackInstalledCount = rackHardware.length;
    const essentialCoverage =
      [
        counts.POWER_UNIT > 0,
        counts.CABLE_KIT > 0,
        counts.COOLING > 0,
        counts.MEMORY > 0,
        counts.STORAGE > 0,
        counts.GPU > 0,
      ].filter(Boolean).length / 6;

    const rackFill = rackInstalledCount / RACK_SLOT_CAPACITY;

    // Combos: interacciones donde tanto item_a como item_b están instalados
    // Se detectan como pares únicos (no duplicados boost+penalty del mismo par)
    const comboMap = new Map<string, { label: string; description: string; source: string }>();
    [...activeBoosts, ...activePenalties].forEach((interaction) => {
      const key = [interaction.item_a, interaction.item_b].sort().join('::');
      if (!comboMap.has(key)) {
        comboMap.set(key, {
          label:       `${interaction.item_a} × ${interaction.item_b}`,
          description: interaction.description,
          source:      `${interaction.item_a} + ${interaction.item_b}`,
        });
      }
    });
    const combos = Array.from(comboMap.values());

    const hasCompatibilityBoost = activeBoosts.length > 0 || activePenalties.length > 0;

    const efficiencyEstimate = Math.min(
      100,
      Math.round(
        essentialCoverage * 65 +
          rackFill * 30 +
          (hasCompatibilityBoost ? 5 : 0),
      ),
    );

    const baseGpuTflops = rackHardware.reduce(
      (sum, piece) => sum + (piece.type === 'GPU' ? (piece.stats?.tflops ?? 0) : 0),
      0,
    );
    const rackPowerDraw = rackHardware.reduce(
      (sum, piece) => sum + (piece.stats?.power ?? 0),
      0,
    );
    const thermalLoad = rackHardware.reduce((sum, piece) => {
      if (piece.type === 'COOLING') return sum;
      return sum + Math.max(0, piece.stats?.heat ?? 0);
    }, 22);
    const coolingSupport = rackHardware.reduce((sum, piece) => {
      if (piece.type !== 'COOLING') return sum;
      return sum + Math.abs(piece.stats?.heat ?? 0);
    }, 0);
    const netHeat = Math.max(20, thermalLoad - coolingSupport);
    const effectiveCompute =
      baseGpuTflops * (efficiencyEstimate / 100) * essentialCoverage;
    const ncrOutput = Math.round(effectiveCompute * 28);

    const heatStatus =
      netHeat >= 75 ? 'Critical' : netHeat >= 50 ? 'Warning' : 'Stable';
    const rackStatus =
      counts.POWER_UNIT > 0 &&
      counts.CABLE_KIT > 0 &&
      counts.COOLING > 0 &&
      counts.MEMORY > 0 &&
      counts.STORAGE > 0 &&
      counts.GPU > 0
        ? 'Active'
        : 'Incomplete';

    return {
      rackStatus,
      rackInstalledCount,
      efficiencyEstimate,
      effectiveCompute,
      rackPowerDraw,
      netHeat,
      heatStatus,
      ncrOutput,
      combos,
      statuses: [
        { label: 'Power Online',   active: counts.POWER_UNIT > 0, activeClass: 'border-amber-400/30 bg-amber-400/10 text-amber-200' },
        { label: 'Data Bus Online', active: counts.CABLE_KIT > 0, activeClass: 'border-sky-400/30 bg-sky-400/10 text-sky-200' },
        { label: 'Memory Online',  active: counts.MEMORY > 0,     activeClass: 'border-violet-400/30 bg-violet-400/10 text-violet-200' },
        { label: 'Storage Online', active: counts.STORAGE > 0,    activeClass: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' },
        { label: 'Compute Online', active: counts.GPU > 0,        activeClass: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' },
        { label: 'Cooling Online', active: counts.COOLING > 0,    activeClass: 'border-blue-400/30 bg-blue-400/10 text-blue-200' },
      ],
    };
  }, [hardware, activeBoosts, activePenalties]);

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/85 p-4 shadow-[0_0_32px_rgba(34,211,238,0.12)] backdrop-blur-md">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300/80">
            Monitoring Node
          </p>
          <h2 className="mt-2 text-lg font-bold text-white">Rack 01 Status</h2>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
            summary.rackStatus === 'Active'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
          }`}
        >
          {summary.rackStatus}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Installed Components</span>
          <span className="font-mono font-bold text-slate-200">
            {summary.rackInstalledCount} / {RACK_SLOT_CAPACITY}
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-950">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 shadow-[0_0_14px_rgba(34,211,238,0.45)]"
            style={{
              width: `${Math.min(100, (summary.rackInstalledCount / RACK_SLOT_CAPACITY) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Effective Efficiency</div>
          <div className="mt-2 text-xl font-bold text-emerald-300">{summary.efficiencyEstimate}%</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">NCR Output</div>
          <div className="mt-2 text-xl font-bold text-cyan-300">+{summary.ncrOutput} NCR/h</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Compute Output</div>
          <div className="mt-2 text-xl font-bold text-cyan-400">{toFixedValue(summary.effectiveCompute, 2)} TFLOPS</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Power Draw</div>
          <div className="mt-2 text-xl font-bold text-amber-300">{summary.rackPowerDraw} W</div>
        </div>
      </div>

      {/* Heat status */}
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/55 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Heat Status</div>
            <div className={`mt-2 text-lg font-bold ${
              summary.heatStatus === 'Critical' ? 'text-red-300'
              : summary.heatStatus === 'Warning' ? 'text-amber-300'
              : 'text-emerald-300'
            }`}>
              {summary.heatStatus}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Thermal Load</div>
            <div className="mt-2 text-lg font-bold text-orange-300">{summary.netHeat} C</div>
          </div>
        </div>
      </div>

      {/* Status pills */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {summary.statuses.map((status) => (
          <div
            key={status.label}
            className={`rounded-lg border px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] ${
              status.active ? status.activeClass : 'border-slate-800 bg-slate-900/40 text-slate-500'
            }`}
          >
            {status.label}
          </div>
        ))}
      </div>

      {/* ── BUFFS ─────────────────────────────────────────── */}
      <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-emerald-400 text-xs leading-none">▲</span>
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400/80">
            Active Buffs
          </span>
          {activeBoosts.length > 0 && (
            <span className="ml-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
              {activeBoosts.length}
            </span>
          )}
        </div>

        {activeBoosts.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No active buffs</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {activeBoosts.map((buff, i) => (
              <div key={i} className="rounded-lg border border-emerald-500/20 bg-emerald-900/20 px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 text-[10px] font-black leading-none">▲</span>
                  <span className="text-[11px] font-bold text-emerald-300">{buff.effect_value}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-emerald-200/60 leading-tight">{buff.description}</p>
                <p className="mt-0.5 text-[9px] text-emerald-500/70 uppercase tracking-wide">
                  {buff.item_a} + {buff.item_b}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PENALTIES ─────────────────────────────────────── */}
      <div className="mt-3 rounded-xl border border-red-500/20 bg-red-950/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-400 text-xs leading-none">▼</span>
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400/80">
            Active Penalties
          </span>
          {activePenalties.length > 0 && (
            <span className="ml-auto rounded-full bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-bold text-red-300">
              {activePenalties.length}
            </span>
          )}
        </div>

        {activePenalties.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No active penalties</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {activePenalties.map((penalty, i) => (
              <div key={i} className="rounded-lg border border-red-500/20 bg-red-900/20 px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-red-400 text-[10px] font-black leading-none">▼</span>
                  <span className="text-[11px] font-bold text-red-300">{penalty.effect_value}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-red-200/60 leading-tight">{penalty.description}</p>
                <p className="mt-0.5 text-[9px] text-red-500/70 uppercase tracking-wide">
                  {penalty.item_a} + {penalty.item_b}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── COMBOS ────────────────────────────────────────── */}
      <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-950/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-violet-400 text-xs leading-none">⬡</span>
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400/80">
            Active Combos
          </span>
          {summary.combos.length > 0 && (
            <span className="ml-auto rounded-full bg-violet-500/20 border border-violet-500/30 px-1.5 py-0.5 text-[9px] font-bold text-violet-300">
              {summary.combos.length}
            </span>
          )}
        </div>

        {summary.combos.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No combos detected</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {summary.combos.map((combo, i) => (
              <div key={i} className="rounded-lg border border-violet-500/20 bg-violet-900/20 px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-violet-400 text-[10px] font-black leading-none">⬡</span>
                  <span className="text-[11px] font-bold text-violet-300">{combo.label}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-violet-200/60 leading-tight">{combo.description}</p>
                <p className="mt-0.5 text-[9px] text-violet-500/70 uppercase tracking-wide">{combo.source}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}