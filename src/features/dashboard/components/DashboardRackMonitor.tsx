import { useMemo } from 'react';

type ComponentType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
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

interface DashboardRackMonitorProps {
  hardware: DashboardHardwarePiece[];
}

const RACK_SLOT_CAPACITY = 19;

function toFixedValue(value: number, digits = 1) {
  return value.toFixed(digits);
}

export function DashboardRackMonitor({
  hardware,
}: DashboardRackMonitorProps) {
  const summary = useMemo(() => {
    const installedHardware = hardware.filter((piece) => piece.slot_id);
    const rackHardware = installedHardware.filter((piece) =>
      piece.slot_id?.startsWith('rack1-'),
    );
    const roomHardware = installedHardware.filter((piece) =>
      piece.slot_id?.startsWith('room-'),
    );

    const counts = {
      POWER_UNIT: rackHardware.filter((piece) => piece.type === 'POWER_UNIT')
        .length,
      CABLE_KIT: rackHardware.filter((piece) => piece.type === 'CABLE_KIT')
        .length,
      MEMORY: rackHardware.filter((piece) => piece.type === 'MEMORY').length,
      STORAGE: rackHardware.filter((piece) => piece.type === 'STORAGE').length,
      GPU: rackHardware.filter((piece) => piece.type === 'GPU').length,
      ROOM_FAN: roomHardware.filter((piece) => piece.type === 'ROOM_FAN')
        .length,
      ROOM_EXTRACTOR: roomHardware.filter(
        (piece) => piece.type === 'ROOM_EXTRACTOR',
      ).length,
    };

    const rackInstalledCount = rackHardware.length;
    const essentialCoverage =
      [
        counts.POWER_UNIT > 0,
        counts.CABLE_KIT > 0,
        counts.MEMORY > 0,
        counts.STORAGE > 0,
        counts.GPU > 0,
      ].filter(Boolean).length / 5;
    const roomSupportCoverage =
      [counts.ROOM_FAN > 0, counts.ROOM_EXTRACTOR > 0].filter(Boolean).length /
      2;
    const rackFill = rackInstalledCount / RACK_SLOT_CAPACITY;

    const hasCompatibilityBoost =
      rackHardware.some((piece) => piece.name.includes('Data Wolf SSD Used')) &&
      rackHardware.some((piece) =>
        piece.name.includes('Connect Tiger Cable Used'),
      );

    const efficiencyEstimate = Math.min(
      100,
      Math.round(
        essentialCoverage * 55 +
          rackFill * 35 +
          roomSupportCoverage * 10 +
          (hasCompatibilityBoost ? 5 : 0),
      ),
    );

    const baseGpuTflops = rackHardware.reduce(
      (sum, piece) => sum + (piece.type === 'GPU' ? piece.stats?.tflops ?? 0 : 0),
      0,
    );
    const rackPowerDraw = [...rackHardware, ...roomHardware].reduce(
      (sum, piece) => sum + (piece.stats?.power ?? 0),
      0,
    );
    const thermalLoad = rackHardware.reduce((sum, piece) => {
      if (piece.type === 'ROOM_FAN' || piece.type === 'ROOM_EXTRACTOR') {
        return sum;
      }

      return sum + Math.max(0, piece.stats?.heat ?? 0);
    }, 22);
    const coolingSupport = roomHardware.reduce((sum, piece) => {
      if (piece.type !== 'ROOM_FAN' && piece.type !== 'ROOM_EXTRACTOR') {
        return sum;
      }

      return sum + Math.abs(piece.stats?.heat ?? 0);
    }, 0);
    const netHeat = Math.max(20, thermalLoad - coolingSupport);
    const effectiveCompute =
      baseGpuTflops * (efficiencyEstimate / 100) * essentialCoverage;
    const ncrOutput = Math.round(effectiveCompute * 28);

    const heatStatus =
      netHeat >= 75
        ? 'Critical'
        : netHeat >= 50
          ? 'Warning'
          : 'Stable';
    const rackStatus =
      counts.POWER_UNIT > 0 &&
      counts.CABLE_KIT > 0 &&
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
      hasCompatibilityBoost,
      statuses: [
        {
          label: 'Power Online',
          active: counts.POWER_UNIT > 0,
          activeClass: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
        },
        {
          label: 'Data Bus Online',
          active: counts.CABLE_KIT > 0,
          activeClass: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
        },
        {
          label: 'Memory Online',
          active: counts.MEMORY > 0,
          activeClass: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
        },
        {
          label: 'Storage Online',
          active: counts.STORAGE > 0,
          activeClass:
            'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
        },
        {
          label: 'Compute Online',
          active: counts.GPU > 0,
          activeClass: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
        },
        {
          label: 'Cooling Assisted',
          active: counts.ROOM_FAN > 0,
          activeClass: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
        },
        {
          label: 'Airflow Assisted',
          active: counts.ROOM_EXTRACTOR > 0,
          activeClass:
            'border-orange-400/30 bg-orange-400/10 text-orange-200',
        },
      ],
    };
  }, [hardware]);

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/85 p-4 shadow-[0_0_32px_rgba(34,211,238,0.12)] backdrop-blur-md">
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
              width: `${Math.min(
                100,
                (summary.rackInstalledCount / RACK_SLOT_CAPACITY) * 100,
              )}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Effective Efficiency
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-300">
            {summary.efficiencyEstimate}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            NCR Output
          </div>
          <div className="mt-2 text-xl font-bold text-cyan-300">
            +{summary.ncrOutput} NCR/h
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Compute Output
          </div>
          <div className="mt-2 text-xl font-bold text-cyan-400">
            {toFixedValue(summary.effectiveCompute, 2)} TFLOPS
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Power Draw
          </div>
          <div className="mt-2 text-xl font-bold text-amber-300">
            {summary.rackPowerDraw} W
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/55 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Heat Status
            </div>
            <div
              className={`mt-2 text-lg font-bold ${
                summary.heatStatus === 'Critical'
                  ? 'text-red-300'
                  : summary.heatStatus === 'Warning'
                    ? 'text-amber-300'
                    : 'text-emerald-300'
              }`}
            >
              {summary.heatStatus}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Thermal Load
            </div>
            <div className="mt-2 text-lg font-bold text-orange-300">
              {summary.netHeat} C
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {summary.statuses.map((status) => (
          <div
            key={status.label}
            className={`rounded-lg border px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] ${
              status.active
                ? status.activeClass
                : 'border-slate-800 bg-slate-900/40 text-slate-500'
            }`}
          >
            {status.label}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/55 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Synergy
        </div>
        <p className="mt-2 text-sm text-slate-200">
          {summary.hasCompatibilityBoost
            ? 'Compatibility boost detected'
            : 'No synergy detected'}
        </p>
      </div>
    </div>
  );
}
