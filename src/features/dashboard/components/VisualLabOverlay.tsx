export type ComponentType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
  | 'ROOM_FAN'
  | 'ROOM_EXTRACTOR'
  | 'CONSUMABLE';

type RackVisualMode =
  | 'ACTIVE'
  | 'RESERVED'
  | 'EXPANSION_ZONE'
  | 'FUTURE_EXPANSION';

export interface InstalledHardware {
  id: string;
  type: ComponentType;
  slot_id: string | null;
  name: string;
}

interface VisualLabOverlayProps {
  hardware: InstalledHardware[];
}

interface RackVisualConfig {
  id: number;
  label: string;
  state: RackVisualMode;
  badge: string;
  left: string;
  top: string;
  width: string;
  height: string;
  transform: string;
}

const rackVisualState: RackVisualConfig[] = [
  {
    id: 1,
    label: 'RACK 01',
    state: 'ACTIVE',
    badge: 'ACTIVE',
    left: '22.5%',
    top: '15%',
    width: '12.8%',
    height: '60%',
    transform: 'perspective(1400px) rotateY(18deg) skewY(-2deg)',
  },
  {
    id: 2,
    label: 'RACK 02',
    state: 'RESERVED',
    badge: 'LOCKED',
    left: '47.5%',
    top: '34.5%',
    width: '10.5%',
    height: '43.5%',
    transform: 'perspective(1200px) rotateY(-9deg) skewY(0.15deg)',
  },
  {
    id: 3,
    label: 'RACK 03',
    state: 'EXPANSION_ZONE',
    badge: 'EXPANSION',
    left: '58.8%',
    top: '35.2%',
    width: '10%',
    height: '42.5%',
    transform: 'perspective(1200px) rotateY(-8deg) skewY(0.12deg)',
  },
  {
    id: 4,
    label: 'RACK 04',
    state: 'FUTURE_EXPANSION',
    badge: 'FUTURE',
    left: '69.5%',
    top: '36%',
    width: '9.5%',
    height: '41.5%',
    transform: 'perspective(1200px) rotateY(-7deg) skewY(0.1deg)',
  },
];

const roomSignals = [
  {
    slot: 'room-top-fan',
    className:
      'left-[6.4%] top-[18%] h-16 w-16 rounded-full border border-cyan-400/15 bg-cyan-400/8 shadow-[0_0_38px_rgba(34,211,238,0.18)]',
  },
  {
    slot: 'room-bottom-fan',
    className:
      'left-[6.4%] bottom-[9.5%] h-16 w-16 rounded-full border border-cyan-400/15 bg-cyan-400/8 shadow-[0_0_38px_rgba(34,211,238,0.18)]',
  },
  {
    slot: 'room-top-extractor',
    className:
      'right-[29%] top-[18%] h-20 w-20 rounded-full border border-orange-400/15 bg-orange-400/8 shadow-[0_0_38px_rgba(251,146,60,0.18)]',
  },
  {
    slot: 'room-bottom-extractor',
    className:
      'right-[29%] bottom-[9.2%] h-20 w-20 rounded-full border border-orange-400/15 bg-orange-400/8 shadow-[0_0_38px_rgba(251,146,60,0.18)]',
  },
];

function slotHasHardware(
  hardware: InstalledHardware[],
  slotId: string,
  type?: ComponentType,
) {
  return hardware.some(
    (piece) =>
      piece.slot_id === slotId &&
      (typeof type === 'undefined' || piece.type === type),
  );
}

function renderActiveRack(rack: RackVisualConfig, hardware: InstalledHardware[]) {
  const rackPrefix = `rack${rack.id}-`;
  const installedPieces = hardware.filter((piece) =>
    piece.slot_id?.startsWith(rackPrefix),
  );
  const rackStatusLabel =
    installedPieces.length > 0
      ? `${installedPieces.length} slots active`
      : 'Awaiting hardware';

  return (
    <div
      key={`overlay-rack-${rack.id}`}
      className="pointer-events-none absolute"
      style={{
        left: rack.left,
        top: rack.top,
        width: rack.width,
        height: rack.height,
        transform: rack.transform,
        transformOrigin: 'bottom center',
      }}
    >
      <div className="absolute -bottom-[3%] left-1/2 h-[8%] w-[82%] -translate-x-1/2 rounded-full bg-black/40 blur-lg" />

      <div
        className="absolute left-[-8%] w-[10%] rounded-l-[14px] border border-slate-500/25 bg-[#323942]/88 shadow-[-8px_0_18px_rgba(0,0,0,0.35)]"
        style={{
          top: '4%',
          bottom: '7%',
        }}
      />

      <div
        className="absolute rounded-t-[14px] border border-slate-400/20 bg-[#424a54]/58"
        style={{
          left: '4%',
          right: '-2%',
          top: '1.5%',
          height: '4%',
        }}
      />

      <div
        className="absolute left-0 right-[10%] rounded-[18px] border border-slate-400/25 bg-[#1f2630]/88 shadow-[0_0_22px_rgba(0,0,0,0.35)]"
        style={{
          top: '4%',
          bottom: '7%',
        }}
      >
        <div className="absolute inset-[4%] rounded-[14px] border border-slate-300/10 bg-slate-950/18" />

        <div className="absolute left-[8%] top-[5%] flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          <span className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-100">
            Rack 0{rack.id}
          </span>
          <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-amber-200">
            {rack.badge}
          </span>
        </div>

        <div className="absolute left-[8%] top-[14%] text-[7px] font-bold uppercase tracking-[0.18em] text-cyan-100/80">
          {rackStatusLabel}
        </div>

        <div className="absolute left-[10%] right-[10%] top-[18%] h-[1px] bg-slate-400/10" />
        <div className="absolute left-[10%] right-[10%] top-[35%] h-[1px] bg-slate-400/8" />
        <div className="absolute left-[10%] right-[10%] top-[52%] h-[1px] bg-slate-400/8" />
        <div className="absolute left-[10%] right-[10%] top-[69%] h-[1px] bg-slate-400/8" />

        <div className="absolute inset-x-[12%] bottom-[6%] h-[5%] rounded-full border border-slate-400/15 bg-slate-950/75" />
      </div>
    </div>
  );
}

function renderPlaceholderRack(rack: RackVisualConfig) {
  const badgeColor =
    rack.state === 'RESERVED'
      ? 'border-yellow-300/30 bg-yellow-400/10 text-yellow-200'
      : rack.state === 'EXPANSION_ZONE'
        ? 'border-violet-300/30 bg-violet-400/10 text-violet-200'
        : 'border-orange-300/30 bg-orange-400/10 text-orange-200';

  return (
    <div
      key={`overlay-rack-${rack.id}`}
      className="pointer-events-none absolute"
      style={{
        left: rack.left,
        top: rack.top,
        width: rack.width,
        height: rack.height,
        transform: 'none',
        transformOrigin: 'bottom center',
      }}
    >
      <div className="absolute -bottom-[3%] left-1/2 h-[7%] w-[78%] -translate-x-1/2 rounded-full bg-cyan-400/8 blur-lg" />

      <div className="relative h-full w-full rounded-[18px] border border-white/12 bg-slate-950/30 opacity-55">
        <div className="absolute inset-[6%] rounded-[14px] border border-white/6 bg-slate-950/20" />

        <div className="absolute left-[8%] top-[5%] flex items-center gap-2">
          <span className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-200">
            {rack.label}
          </span>

          <span
            className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] ${badgeColor}`}
          >
            {rack.badge}
          </span>
        </div>

        <div className="absolute left-[10%] right-[10%] top-[30%] h-[1px] bg-white/7" />
        <div className="absolute left-[10%] right-[10%] top-[50%] h-[1px] bg-white/6" />
        <div className="absolute left-[10%] right-[10%] top-[70%] h-[1px] bg-white/5" />

        <div className="absolute inset-x-[12%] bottom-[6%] h-[5%] rounded-full border border-white/8 bg-slate-950/55" />
      </div>
    </div>
  );
}

export function VisualLabOverlay({ hardware }: VisualLabOverlayProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20">
        <div
          className="absolute left-[31.5%] top-[81%] h-[2px] w-[50%] rounded-full bg-gradient-to-r from-transparent via-cyan-300/24 to-transparent opacity-80"
          style={{ transform: 'skewX(-34deg)' }}
        />
        <div
          className="absolute left-[32.5%] top-[81.2%] h-[6%] w-[49%] bg-gradient-to-b from-cyan-400/6 via-cyan-300/2 to-transparent blur-xl"
          style={{ transform: 'skewX(-34deg)' }}
        />

        {rackVisualState.map((rack) =>
          rack.state === 'ACTIVE'
            ? renderActiveRack(rack, hardware)
            : renderPlaceholderRack(rack),
        )}
      </div>

      {roomSignals.map((signal) =>
        slotHasHardware(hardware, signal.slot) ? (
          <div
            key={signal.slot}
            className={`pointer-events-none absolute z-20 ${signal.className}`}
          />
        ) : null,
      )}
    </>
  );
}
