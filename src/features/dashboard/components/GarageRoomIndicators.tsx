import type { RoomIndicatorItem } from '../types'

type GarageRoomIndicatorsPlacement = 'bottom' | 'side'

interface GarageRoomIndicatorsProps {
  items: RoomIndicatorItem[]
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

function GarageIndicatorCard({
  item,
  toneIndex,
  compact,
}: {
  item: RoomIndicatorItem
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

      <div className="relative pl-3.5">
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
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
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
