import { useMemo } from 'react'
import rack01Empty from '../../../assets/dashboard/rack-front-empty-level1.png'
import {
  selectMockHardwarePieces,
  useConditionalEffects,
  type MockHardwarePiece,
  type RackRuntimeStats,
  useMockPlayerState,
} from '../../../data/supabasePlayerState'



type RackStatus = 'ACTIVE' | 'LOCKED'

type RackItem = {
  id: number
  label: string
  status: RackStatus
  left: string
  top: string
  width: string
  height: string
  labelLeft: string
  labelTop: string
  opacity?: number
}

type RackInterior = {
  left: string
  top: string
  width: string
  height: string
}

const racks: RackItem[] = [
  {
    id: 1,
    label: 'RACK 01',
    status: 'ACTIVE',
    left: '9%',
    top: '28.5%',
    width: '45%',
    height: '45%',
    labelLeft: '29.5%',
    labelTop: '24.5%',
  },
  {
    id: 2,
    label: 'RACK 02',
    status: 'ACTIVE',
    left: '18.2%',
    top: '28.5%',
    width: '50%',
    height: '45%',
    labelLeft: '41.1%',
    labelTop: '24.5%',
  },
  {
    id: 3,
    label: 'RACK 03',
    status: 'ACTIVE',
    left: '29.8%',
    top: '28.5%',
    width: '50%',
    height: '45%',
    labelLeft: '52.7%',
    labelTop: '24.5%',
  },
  {
    id: 4,
    label: 'RACK 04',
    status: 'ACTIVE',
    left: '41.5%',
    top: '28.5%',
    width: '50%',
    height: '45%',
    labelLeft: '63.9%',
    labelTop: '24.5%',
  },
]

// Área interior visual de cada rack dentro del dashboard
const rackInteriorById: Record<number, RackInterior> = {
  1: {
    left: '26%',
    top: '30.5%',
    width: '11.1%',
    height: '43%',
  },
  2: {
    left: '37.6%',
    top: '30.5%',
    width: '11.1%',
    height: '43%',
  },
  3: {
    left: '49.2%',
    top: '30.5%',
    width: '11.1%',
    height: '43%',
  },
  4: {
    left: '60.9%',
    top: '30.5%',
    width: '11.1%',
    height: '43%',
  },
}

const typeLed: Partial<Record<MockHardwarePiece['type'], string>> = {
  POWER_UNIT: 'bg-amber-400',
  CABLE_KIT: 'bg-slate-300',
  COOLING: 'bg-sky-300',
  MEMORY: 'bg-purple-400',
  STORAGE: 'bg-emerald-400',
  GPU: 'bg-cyan-400',
}

const typeGlow: Partial<Record<MockHardwarePiece['type'], string>> = {
  POWER_UNIT: 'rgba(251,191,36,0.45)',
  GPU: 'rgba(34,211,238,0.45)',
  MEMORY: 'rgba(192,132,252,0.3)',
  STORAGE: 'rgba(52,211,153,0.3)',
}

function getStatusClasses(status: RackStatus) {
  if (status === 'ACTIVE') {
    return {
      dot: 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]',
      badge: 'border border-emerald-300/40 bg-emerald-400/10 text-emerald-200',
      label: 'text-slate-100',
    }
  }

  return {
    dot: 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.45)]',
    badge: 'border border-amber-300/35 bg-amber-400/10 text-amber-200',
    label: 'text-slate-200',
  }
}

// ── GarageSlotView ────────────────────────────────────────────────
// El borde de cada slot ahora refleja el estado REAL de esa pieza:
// - VERDE:        solo boost activo (rinde bien)
// - ROJO:         solo penalty activo (fuera de rango seguro)
// - ROJO/VERDE:   boost Y penalty activos a la vez (mitad izq. roja, mitad der. verde)
// - AMARILLO:     sin efectos activos, pero hay un penalty potencial (warning)
// - NEUTRO:       sin ningún efecto ni warning en este momento

function GarageSlotView({
  item,
  hasPenalty,
  hasBoost,
  hasWarning,
}: {
  item: MockHardwarePiece | null
  hasPenalty: boolean
  hasBoost: boolean
  hasWarning: boolean
}) {
  if (!item) {
    return (
      <div className="flex-1 min-w-0 rounded-[2px] border border-dashed border-slate-600/40 bg-slate-900/20" />
    )
  }

  const isCooling = item.type === 'COOLING'
  const isGpu = item.type === 'GPU'
  const imgSrc = item.image
  const ledColor = typeLed[item.type]
  const glowColor = typeGlow[item.type]

  // 5 estados posibles, en orden de prioridad:
  const isMixed = hasPenalty && hasBoost   // rojo/verde, mitad y mitad
  const isPenaltyOnly = hasPenalty && !hasBoost
  const isBoostOnly   = hasBoost && !hasPenalty
  const isWarningOnly = hasWarning && !hasPenalty && !hasBoost

  const borderClass = isMixed
    ? 'border-white/30'
    : isPenaltyOnly
      ? 'border-red-500/60 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
      : isBoostOnly
        ? 'border-emerald-500/60 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
        : isWarningOnly
          ? 'border-amber-400/50 shadow-[0_0_6px_rgba(251,191,36,0.35)]'
          : isGpu
            ? 'border-cyan-500/25 shadow-[0_0_3px_rgba(34,211,238,0.2)]'
            : 'border-white/10'

  return (
    <div
      className={`relative flex-1 min-w-0 overflow-hidden rounded-[2px] border bg-slate-900/80 ${borderClass}`}
    >
      {isCooling && (
        <>
          <div
            className="pointer-events-none absolute inset-0 flex animate-spin items-center justify-center"
            style={{ animationDuration: '3s' }}
          >
            <div className="h-4/5 w-4/5 rounded-full border-2 border-dashed border-sky-400/50" />
          </div>

          <div
            className="pointer-events-none absolute inset-0 flex animate-spin items-center justify-center"
            style={{
              animationDuration: '1.8s',
              animationDirection: 'reverse',
            }}
          >
            <div className="h-2/5 w-2/5 rounded-full border border-sky-300/40" />
          </div>
        </>
      )}

      {imgSrc && (
        <img
          src={imgSrc}
          alt={item.name}
          draggable={false}
          className={`absolute inset-0 h-full w-full select-none object-fill ${
            isCooling ? 'mix-blend-multiply' : ''
          }`}
          style={{
            filter: `brightness(0.9) contrast(1.1) saturate(0.95)${
              glowColor ? ` drop-shadow(0 0 2px ${glowColor})` : ''
            }${isPenaltyOnly || isMixed ? ' sepia(0.4) saturate(1.5)' : ''}`,
          }}
        />
      )}

      {ledColor && (
        <div
          className={`absolute bottom-[6%] right-[6%] z-10 h-[8%] min-h-[2px] w-[8%] min-w-[2px] animate-pulse rounded-full ${ledColor}`}
        />
      )}

      {/* Overlay de color según estado — mitad/mitad cuando hay boost + penalty juntos */}
      {isMixed ? (
        <div className="pointer-events-none absolute inset-0 flex">
          <div className="h-full w-1/2 animate-pulse bg-red-500/15" />
          <div
            className="h-full w-1/2 animate-pulse bg-emerald-500/[0.1]"
            style={{ animationDuration: '3s' }}
          />
        </div>
      ) : isPenaltyOnly ? (
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-red-500/10" />
      ) : isBoostOnly ? (
        <div
          className="pointer-events-none absolute inset-0 animate-pulse bg-emerald-500/[0.07]"
          style={{ animationDuration: '3s' }}
        />
      ) : isWarningOnly ? (
        <div
          className="pointer-events-none absolute inset-0 animate-pulse bg-amber-400/[0.08]"
          style={{ animationDuration: '2.4s' }}
        />
      ) : null}
    </div>
  )
}

// ── RackInterior ──────────────────────────────────────────────────
// Componente separado por rack para poder llamar useConditionalEffects
// una vez por rack (cada uno tiene sus propios stats y piezas instaladas).

function RackInteriorView({
  rack,
  interior,
  slotMap,
}: {
  rack: RackItem
  interior: RackInterior
  slotMap: Record<string, MockHardwarePiece | null>
}) {
  const getSlotItem = (slotId: string) => slotMap[`rack${rack.id}-${slotId}`] ?? null

  const installedPieces = useMemo(
    () => Object.values(slotMap).filter((p): p is MockHardwarePiece => p != null),
    [slotMap],
  )
  const installedItemIds = useMemo(
    () => installedPieces.map((p) => p.item_id),
    [installedPieces],
  )

  // Stats reales del rack para evaluar condiciones (mismo cálculo que computeRackStatus)
  const rackStats: RackRuntimeStats = useMemo(() => {
    let powerLoad = 0
    let maxTemp = 0
    let coolingOffset = 0
    let stabilitySum = 0
    let stabilityCount = 0

    installedPieces.forEach((piece) => {
      const s = piece.stats as unknown as Record<string, number> | undefined
      if (s?.power) powerLoad += s.power

      if (piece.type === 'COOLING') {
        coolingOffset += Math.abs(s?.heat ?? 0)
      } else {
        const temp = s?.['temperature_c'] ?? s?.heat ?? 0
        if (temp > maxTemp) maxTemp = temp
      }

      const stability = s?.['stability']
      if (stability !== undefined) {
        stabilitySum += stability
        stabilityCount += 1
      } else if (piece.condition) {
        const base = piece.condition === 'New' ? 100 : piece.condition === 'Rebuilt' ? 88 : 74
        stabilitySum += base
        stabilityCount += 1
      }
    })

    return {
      temperature: Math.max(25, 25 + maxTemp - coolingOffset),
      power_load: powerLoad,
      stability: stabilityCount > 0 ? Math.round(stabilitySum / stabilityCount) : 100,
    }
  }, [installedPieces])

  const { activeBoosts, activePenalties, potentialPenalties } = useConditionalEffects(installedItemIds, rackStats)

  const boostItemIds   = useMemo(() => new Set(activeBoosts.map((e) => e.item_id)), [activeBoosts])
  const penaltyItemIds = useMemo(() => new Set(activePenalties.map((e) => e.item_id)), [activePenalties])
  const warningItemIds = useMemo(() => new Set(potentialPenalties.map((e) => e.item_id)), [potentialPenalties])

  const slotProps = (slotId: string) => {
    const item = getSlotItem(slotId)
    const hasPenalty = item ? penaltyItemIds.has(item.item_id) : false
    const hasBoost   = item ? boostItemIds.has(item.item_id)   : false
    // El warning solo se muestra si la pieza NO tiene ya un penalty o boost activo
    // (si ya está en rojo/verde/mitad-mitad, el warning no aporta info nueva)
    const hasWarning = item && !hasPenalty && !hasBoost ? warningItemIds.has(item.item_id) : false
    return { item, hasPenalty, hasBoost, hasWarning }
  }

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: interior.left,
        top: interior.top,
        width: interior.width,
        height: interior.height,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        padding: '1%',
      }}
    >
      <div style={{ flex: '0 0 11%', display: 'flex', gap: '0' }}>
        <GarageSlotView {...slotProps('power1')} />
        <GarageSlotView {...slotProps('power2')} />
      </div>

      <div style={{ flex: '0 0 11%', display: 'flex', gap: '0' }}>
        <GarageSlotView {...slotProps('cable-kit1')} />
        <GarageSlotView {...slotProps('cable-kit2')} />
      </div>

      <div style={{ flex: '0 0 11%', display: 'flex', gap: '0' }}>
        <GarageSlotView {...slotProps('cooling1')} />
        <GarageSlotView {...slotProps('cooling2')} />
      </div>

      <div style={{ flex: '0 0 11%', display: 'flex', gap: '0' }}>
        <GarageSlotView {...slotProps('storage1')} />
        <GarageSlotView {...slotProps('storage2')} />
      </div>

      <div
        style={{
          flex: '0 0 24%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0',
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((slotNumber) => (
          <GarageSlotView key={`rack${rack.id}-mem${slotNumber}`} {...slotProps(`mem${slotNumber}`)} />
        ))}
      </div>

      <div
        style={{
          flex: '0 0 24%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0',
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((slotNumber) => (
          <GarageSlotView key={`rack${rack.id}-gpu${slotNumber}`} {...slotProps(`gpu${slotNumber}`)} />
        ))}
      </div>
    </div>
  )
}

export function GarageRackOverlay({ userId }: { userId: string }) {
  const { inventory } = useMockPlayerState(userId)

  const hardwarePieces = useMemo(
    () => selectMockHardwarePieces(inventory),
    [inventory],
  )

  // Mapa de slots para RACK 01, 02, 03 y 04
  const slotMap = useMemo(() => {
    const map: Record<string, MockHardwarePiece | null> = {}

    racks.forEach((rack) => {
      map[`rack${rack.id}-power1`] = null
      map[`rack${rack.id}-power2`] = null

      map[`rack${rack.id}-cable-kit1`] = null
      map[`rack${rack.id}-cable-kit2`] = null

      map[`rack${rack.id}-cooling1`] = null
      map[`rack${rack.id}-cooling2`] = null

      map[`rack${rack.id}-storage1`] = null
      map[`rack${rack.id}-storage2`] = null

      for (let i = 1; i <= 6; i += 1) {
        map[`rack${rack.id}-mem${i}`] = null
        map[`rack${rack.id}-gpu${i}`] = null
      }
    })

    hardwarePieces.forEach((piece) => {
      if (piece.slot_id && piece.slot_id in map) {
        map[piece.slot_id] = piece
      }
    })

    return map
  }, [hardwarePieces])

  // Mapa de slots filtrado por rack, para pasarle a cada RackInteriorView
  // solo lo que le corresponde a ese rack específico
  const slotMapByRack = useMemo(() => {
    const result: Record<number, Record<string, MockHardwarePiece | null>> = {}
    racks.forEach((rack) => {
      const rackSlots: Record<string, MockHardwarePiece | null> = {}
      Object.keys(slotMap).forEach((key) => {
        if (key.startsWith(`rack${rack.id}-`)) {
          rackSlots[key] = slotMap[key]
        }
      })
      result[rack.id] = rackSlots
    })
    return result
  }, [slotMap])

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {racks.map((rack) => {
        const statusClasses = getStatusClasses(rack.status)
        const interior = rackInteriorById[rack.id]

        return (
          <div key={rack.id}>
            <div
              className="absolute flex flex-col items-start gap-1"
              style={{
                left: rack.labelLeft,
                top: rack.labelTop,
                zIndex: 80,
              }}
            >
              <div
                className={`flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] ${statusClasses.label}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusClasses.dot}`} />
                <span>{rack.label}</span>
              </div>

              <span
                className={`rounded-full px-2 py-[2px] text-[7px] font-black uppercase tracking-[0.16em] ${statusClasses.badge}`}
              >
                {rack.status === 'ACTIVE' ? 'ACTIVATED' : 'INACTIVE'}
              </span>
            </div>

            <img
              src={rack01Empty}
              alt={rack.label}
              draggable={false}
              className="absolute select-none object-contain"
              style={{
                left: rack.left,
                top: rack.top,
                width: rack.width,
                height: rack.height,
                opacity: rack.opacity ?? 1,
                zIndex: 40,
              }}
            />

            <RackInteriorView
              rack={rack}
              interior={interior}
              slotMap={slotMapByRack[rack.id]}
            />
          </div>
        )
      })}

    </div>
  )
}