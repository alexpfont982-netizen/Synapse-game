import type { RoomIndicatorItem } from '../types'

type GarageRoomIndicatorsPlacement = 'bottom' | 'side'

// Color opcional del mini-gauge embebido en la tarjeta. Si no se pasa,
// la tarjeta se ve exactamente como antes (solo label + value).
export type IndicatorGaugeColor = 'cyan' | 'red' | 'emerald' | 'amber'

export interface RoomIndicatorItemWithGauge extends RoomIndicatorItem {
  gauge?: {
    value: number
    max: number
    color: IndicatorGaugeColor
  }
}

interface GarageRoomIndicatorsProps {
  items: RoomIndicatorItemWithGauge[]
  placement: GarageRoomIndicatorsPlacement
}

const INDICATOR_TONES = [
  {
    glow: 'shadow-[0_0_24px_rgba(34,211,238,0.08)]',
    line: 'bg-cyan-300/55',
    value: 'text-cyan-50',
    label: 'text-cyan-100/72',
  },
  {
    glow: 'shadow-[0_0_24px_rgba(59,130,246,0.08)]',
    line: 'bg-sky-300/55',
    value: 'text-slate-50',
    label: 'text-sky-100/70',
  },
  {
    glow: 'shadow-[0_0_24px_rgba(96,165,250,0.08)]',
    line: 'bg-blue-300/55',
    value: 'text-slate-50',
    label: 'text-blue-100/70',
  },
  {
    glow: 'shadow-[0_0_24px_rgba(168,85,247,0.08)]',
    line: 'bg-violet-300/55',
    value: 'text-slate-50',
    label: 'text-violet-100/70',
  },
] as const

const GAUGE_COLORS = {
  cyan:    { stroke: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },
  red:     { stroke: '#f87171', glow: 'rgba(248,113,113,0.5)' },
  amber:   { stroke: '#fbbf24', glow: 'rgba(251,191,36,0.5)' },
  emerald: { stroke: '#34d399', glow: 'rgba(52,211,153,0.5)' },
} as const

// ── Mini gauge — mismo diseño que RoomGaugesPanel, embebido aquí ──
function MiniGauge({ value, max, color }: { value: number; max: number; color: IndicatorGaugeColor }) {
  const pct = Math.min(1, Math.max(0, value / max))
  const angle = -135 + pct * 270
  const c = GAUGE_COLORS[color]

  const needleRad = (angle * Math.PI) / 180
  const needleLen = 11
  const needleX = 18 + needleLen * Math.sin(needleRad)
  const needleY = 18 - needleLen * Math.cos(needleRad)

  const trackPath = 'M 10.2 25.8 A 13 13 0 1 1 25.8 25.8'
  const largeArc = pct > 0.5 ? 1 : 0
  const startRad = (-135 * Math.PI) / 180
  const sx = 18 + 13 * Math.sin(startRad)
  const sy = 18 - 13 * Math.cos(startRad)
  const ex = 18 + 13 * Math.sin(needleRad)
  const ey = 18 - 13 * Math.cos(needleRad)
  const progressPath = pct > 0.01 ? `M ${sx} ${sy} A 13 13 0 ${largeArc} 1 ${ex} ${ey}` : ''

  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0">
      <path d={trackPath} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-700/50" />
      {progressPath && (
        <path
          d={progressPath}
          fill="none"
          stroke={c.stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 2px ${c.glow})`, transition: 'all 0.5s ease' }}
        />
      )}
      <line
        x1="18" y1="18" x2={needleX} y2={needleY}
        stroke={c.stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ transition: 'all 0.5s ease' }}
      />
      <circle cx="18" cy="18" r="2" fill={c.stroke} />
    </svg>
  )
}

function GarageIndicatorCard({
  item,
  toneIndex,
  compact,
}: {
  item: RoomIndicatorItemWithGauge
  toneIndex: number
  compact?: boolean
}) {
  const tone = INDICATOR_TONES[toneIndex % INDICATOR_TONES.length]

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border border-white/8 bg-slate-950/62 backdrop-blur-md ${tone.glow} ${
        compact ? 'px-3.5 py-3.5' : 'px-3.5 py-3'
      }`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_55%)]" />
      <div className={`absolute left-3 top-3 h-8 w-px ${tone.line}`} />

      <div className="relative flex items-center gap-3 pl-3.5">
        {item.gauge && (
          <MiniGauge value={item.gauge.value} max={item.gauge.max} color={item.gauge.color} />
        )}
        <div className="min-w-0">
          <p
            className={`text-[10px] font-medium uppercase tracking-[0.22em] ${tone.label}`}
          >
            {item.label}
          </p>
          <p
            className={`mt-1.5 text-sm font-semibold tracking-[0.04em] ${tone.value} ${
              compact ? 'xl:text-base' : ''
            }`}
          >
            {item.value}
          </p>
        </div>
      </div>
    </div>
  )
}

export function GarageRoomIndicators({
  items,
  placement,
}: GarageRoomIndicatorsProps) {
  if (placement === 'bottom') {
    return (
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-40 sm:inset-x-4 sm:bottom-4">
        <div className="rounded-[24px] border border-white/8 bg-slate-950/42 p-2.5 backdrop-blur-xl shadow-[0_12px_40px_rgba(2,6,23,0.34)]">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
            {items.map((item, index) => (
              <GarageIndicatorCard
                key={item.label}
                item={item}
                toneIndex={index}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="pointer-events-none absolute left-0 top-1/2 z-40 hidden w-24 -translate-y-1/2 xl:flex xl:flex-col xl:gap-2.5">
        {items.map((item, index) => (
          <GarageIndicatorCard
            key={item.label}
            item={item}
            toneIndex={index + 1}
            compact
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-full mt-3 grid grid-cols-2 gap-2.5 xl:hidden">
        {items.map((item, index) => (
          <GarageIndicatorCard
            key={item.label}
            item={item}
            toneIndex={index + 1}
          />
        ))}
      </div>
    </>
  )
}