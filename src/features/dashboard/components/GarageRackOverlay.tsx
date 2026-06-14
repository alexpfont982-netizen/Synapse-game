import { useMemo } from 'react';
import rack01Empty from '../../../assets/dashboard/rack-front-empty-level1.png';
import {
  selectMockHardwarePieces,
  type MockHardwarePiece,
  useMockPlayerState,
} from '../../../data/supabasePlayerState'

type RackStatus = 'ACTIVE' | 'LOCKED';
type RackItem = {
  id: number; label: string; status: RackStatus;
  left: string; top: string; width: string; height: string;
  labelLeft: string; labelTop: string; opacity?: number;
};

const racks: RackItem[] = [
  { id: 1, label: 'RACK 01', status: 'ACTIVE', left: '9%', top: '28.5%', width: '45%', height: '45%', labelLeft: '29.5%', labelTop: '24.5%' },
  { id: 2, label: 'RACK 02', status: 'LOCKED', left: '18.2%', top: '28.5%', width: '50%', height: '45%', labelLeft: '41.1%', labelTop: '24.5%' },
  { id: 3, label: 'RACK 03', status: 'LOCKED', left: '29.8%', top: '28.5%', width: '50%', height: '45%', labelLeft: '52.7%', labelTop: '24.5%' },
  { id: 4, label: 'RACK 04', status: 'LOCKED', left: '41.5%', top: '28.5%', width: '50%', height: '45%', labelLeft: '63.9%', labelTop: '24.5%' },
];

// ── Área interior del RACK 01 ────────────────────────────────────
// Ajusta estos valores si el layout no cae dentro del borde cyan
const rack01Interior = {
  left:   '26%',
  top:    '30.5%',
  width:  '11.1%',   // era 8.2%
  height: '43%',    // era 44%
};



const typeLed: Partial<Record<MockHardwarePiece['type'], string>> = {
  POWER_UNIT: 'bg-amber-400',
  CABLE_KIT: 'bg-slate-300',
  COOLING: 'bg-sky-300',
  MEMORY: 'bg-purple-400',
  STORAGE: 'bg-emerald-400',
  GPU: 'bg-cyan-400',
};

const typeGlow: Partial<Record<MockHardwarePiece['type'], string>> = {
  POWER_UNIT: 'rgba(251,191,36,0.45)',
  GPU: 'rgba(34,211,238,0.45)',
  MEMORY: 'rgba(192,132,252,0.3)',
  STORAGE: 'rgba(52,211,153,0.3)',
};

function getStatusClasses(status: RackStatus) {
  if (status === 'ACTIVE') return {
    dot: 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]',
    badge: 'border border-emerald-300/40 bg-emerald-400/10 text-emerald-200',
    label: 'text-slate-100',
  };
  return {
    dot: 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.45)]',
    badge: 'border border-amber-300/35 bg-amber-400/10 text-amber-200',
    label: 'text-slate-200',
  };
}

// ── Slot individual ──────────────────────────────────────────────
function GarageSlotView({
  item,
  isCritical,
  isOverheating,
}: {
  item: MockHardwarePiece | null
  isCritical: boolean
  isOverheating: boolean
}) {
  if (!item) {
    return (
      <div className="flex-1 rounded-[2px] border border-dashed border-slate-600/40 bg-slate-900/20 min-w-0" />
    );
  }

  const isCooling = item.type === 'COOLING';
  const isGpu = item.type === 'GPU';
  const imgSrc = item.image;
  const ledColor = typeLed[item.type];
  const glowColor = typeGlow[item.type];

  return (
    <div
      className={`relative flex-1 min-w-0 overflow-hidden rounded-[2px] border bg-slate-900/80 ${isCritical
        ? 'border-red-500/60 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
        : isGpu
          ? 'border-cyan-500/25 shadow-[0_0_3px_rgba(34,211,238,0.2)]'
          : 'border-white/10'
        }`}
    >
      {/* 🌀 Fan rings — cooling */}
      {isCooling && (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center animate-spin"
            style={{ animationDuration: '3s' }}>
            <div className="h-4/5 w-4/5 rounded-full border-2 border-dashed border-sky-400/50" />
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center animate-spin"
            style={{ animationDuration: '1.8s', animationDirection: 'reverse' }}>
            <div className="h-2/5 w-2/5 rounded-full border border-sky-300/40" />
          </div>
        </>
      )}

      {/* Imagen del componente */}
      {imgSrc && (
        <img
          src={imgSrc}
          alt={item.name}
          draggable={false}
          className={`absolute inset-0 h-full w-full select-none object-fill ${isCooling ? 'mix-blend-multiply' : ''
            }`}
          style={{
            filter: `brightness(0.9) contrast(1.1) saturate(0.95)${glowColor ? ` drop-shadow(0 0 2px ${glowColor})` : ''
              }${isCritical ? ' sepia(0.4) saturate(1.5)' : ''}`,
          }}
        />
      )}

      {/* 💡 LED */}
      {ledColor && (
        <div className={`absolute bottom-[6%] right-[6%] z-10 h-[8%] w-[8%] min-h-[2px] min-w-[2px] rounded-full animate-pulse ${ledColor}`} />
      )}

      {/* Overlays de calor */}
      {isCritical && (
        <div className="pointer-events-none absolute inset-0 bg-red-500/10 animate-pulse" />
      )}
      {isOverheating && !isCritical && isGpu && (
        <div className="pointer-events-none absolute inset-0 bg-amber-500/[0.07] animate-pulse"
          style={{ animationDuration: '3s' }} />
      )}
    </div>
  );
}

// ── GarageRackOverlay ────────────────────────────────────────────
export function GarageRackOverlay() {
  const { inventory } = useMockPlayerState();

  const hardwarePieces = useMemo(
    () => selectMockHardwarePieces(inventory),
    [inventory],
  );

  // Mapa de slots del RACK 01
  const slotMap = useMemo(() => {
    const map: Record<string, MockHardwarePiece | null> = {
      'rack1-power1': null, 'rack1-power2': null,
      'rack1-cable-kit1': null, 'rack1-cable-kit2': null,
      'rack1-cooling1': null, 'rack1-cooling2': null,
      'rack1-storage1': null, 'rack1-storage2': null,
    };
    for (let i = 1; i <= 6; i++) {
      map[`rack1-mem${i}`] = null;
      map[`rack1-gpu${i}`] = null;
    }
    hardwarePieces.forEach((p) => {
      if (p.slot_id && p.slot_id in map) map[p.slot_id] = p;
    });
    return map;
  }, [hardwarePieces]);

  // Temperatura dinámica
  const temperature = useMemo(() => {
    let base = 22, cool = 0;
    hardwarePieces
      .filter((p) => p.slot_id !== null)
      .forEach((p) => {
        const h = p.stats?.heat ?? 0;
        if (p.type === 'COOLING') cool += Math.abs(h);
        else base += Math.max(0, h);
      });
    return Math.max(20, base - cool);
  }, [hardwarePieces]);

  const isCritical = temperature > 150;
  const isOverheating = temperature > 80;

  const g = (id: string) => slotMap[id] ?? null;
  const sp = { isCritical, isOverheating };

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {racks.map((rack) => {
        const sc = getStatusClasses(rack.status);
        return (
          <div key={rack.id}>
            {/* Etiqueta */}
            <div className="absolute flex flex-col items-start gap-1"
              style={{ left: rack.labelLeft, top: rack.labelTop, zIndex: 80 }}>
              <div className={`flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] ${sc.label}`}>
                <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                <span>{rack.label}</span>
              </div>
              <span className={`rounded-full px-2 py-[2px] text-[7px] font-black uppercase tracking-[0.16em] ${sc.badge}`}>
                {rack.status}
              </span>
            </div>

            {/* Frame del rack */}
            <img src={rack01Empty} alt={rack.label} draggable={false}
              className="absolute select-none object-contain"
              style={{ left: rack.left, top: rack.top, width: rack.width, height: rack.height, opacity: rack.opacity ?? 1, zIndex: 40 }} />

            {/* Layout completo RACK 01 */}
            {rack.id === 1 && (
              <div
                className="absolute overflow-hidden"
                style={{
                  left: rack01Interior.left,
                  top: rack01Interior.top,
                  width: rack01Interior.width,
                  height: rack01Interior.height,
                  zIndex: 90,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0',       // era '2%'
                  padding: '1%',   // era '2%'
                }}
              >
                {/* PSU — 2 slots */}
                <div style={{ flex: '0 0 11%', display: 'flex', gap: '0' }}>
                  <GarageSlotView item={g('rack1-power1')} {...sp} />
                  <GarageSlotView item={g('rack1-power2')} {...sp} />
                </div>

                {/* Cables — 2 slots */}
                <div style={{ flex: '0 0 11%', display: 'flex', gap: '0' }}>
                  <GarageSlotView item={g('rack1-cable-kit1')} {...sp} />
                  <GarageSlotView item={g('rack1-cable-kit2')} {...sp} />
                </div>

                {/* Cooling — 2 slots */}
                <div style={{ flex: '0 0 11%', display: 'flex', gap: '0' }}>
                  <GarageSlotView item={g('rack1-cooling1')} {...sp} />
                  <GarageSlotView item={g('rack1-cooling2')} {...sp} />
                </div>

                {/* Storage — 2 slots */}
                <div style={{ flex: '0 0 11%', display: 'flex', gap: '0' }}>
                  <GarageSlotView item={g('rack1-storage1')} {...sp} />
                  <GarageSlotView item={g('rack1-storage2')} {...sp} />
                </div>

                {/* RAM — grid 3×2 */}
                <div style={{ flex: '0 0 24%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0' }}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <GarageSlotView key={`mem${n}`} item={g(`rack1-mem${n}`)} {...sp} />
                  ))}
                </div>

                {/* GPU — grid 3×2 */}
                <div style={{ flex: '0 0 24%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0' }}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <GarageSlotView key={`gpu${n}`} item={g(`rack1-gpu${n}`)} {...sp} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}