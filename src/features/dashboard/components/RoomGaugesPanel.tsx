// ── Tipos ─────────────────────────────────────────────────────────

export interface RoomGaugesData {
  totalTFlops: number
  totalPower: number
  maxPower: number
  avgTemperature: number
  avgStability: number
  installedComponents: number
  maxComponents: number
  batteryWh: number
  maxBatteryWh: number
}

interface RoomGaugesPanelProps {
  data: RoomGaugesData
  className?: string
}

// ── Mini gauge — pequeño, dentro de una tarjeta compacta ──────────
// Arco de 270°, color configurable por métrica.

const GAUGE_COLORS = {
  cyan:    { stroke: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },
  red:     { stroke: '#f87171', glow: 'rgba(248,113,113,0.5)' },
  amber:   { stroke: '#fbbf24', glow: 'rgba(251,191,36,0.5)' },
  emerald: { stroke: '#34d399', glow: 'rgba(52,211,153,0.5)' },
} as const

type GaugeColor = keyof typeof GAUGE_COLORS

function MiniGauge({ value, max, color }: { value: number; max: number; color: GaugeColor }) {
  const pct = Math.min(1, Math.max(0, value / max))
  const angle = -135 + pct * 270
  const c = GAUGE_COLORS[color]

  const needleRad = (angle * Math.PI) / 180
  const needleLen = 11
  const needleX = 18 + needleLen * Math.sin(needleRad)
  const needleY = 18 - needleLen * Math.cos(needleRad)

  // Arco de fondo recorrido (270°, de -135° a 135°)
  const trackPath = 'M 10.2 25.8 A 13 13 0 1 1 25.8 25.8'

  // Arco de progreso (desde -135° hasta el ángulo actual)
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

// ── Tarjeta de indicador (mismo tamaño que las 4 originales) ──────

function GaugeCard({
  label,
  value,
  displayValue,
  unit,
  color,
  max,
}: {
  label: string
  value: number
  displayValue: string
  unit: string
  color: GaugeColor
  max: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-950/50 px-4 py-3 backdrop-blur-sm">
      <MiniGauge value={value} max={max} color={color} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-base font-bold text-white tabular-nums">
          {displayValue}
          <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span>
        </p>
      </div>
    </div>
  )
}

// ── Barra de energía — estilo limpio, sin segmentos LCD ───────────

function EnergyBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (current / max) * 100))
  const isLow = pct < 20

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-950/50 px-4 py-3 backdrop-blur-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2"
        style={{ borderColor: isLow ? '#f87171' : '#34d399' }}
      >
        <span className="text-[10px] font-bold tabular-nums" style={{ color: isLow ? '#f87171' : '#34d399' }}>
          {Math.round(pct)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Energy Reserve
        </p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800/80">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: isLow
                  ? 'linear-gradient(90deg, #dc2626, #f87171)'
                  : 'linear-gradient(90deg, #059669, #34d399)',
              }}
            />
          </div>
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-400">
            {current.toLocaleString()}/{max.toLocaleString()}Wh
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Panel principal — grid de 5 tarjetas del mismo tamaño ─────────

export function RoomGaugesPanel({ data, className = '' }: RoomGaugesPanelProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 ${className}`}>
      <GaugeCard
        label="TFLOPS"
        value={data.totalTFlops}
        displayValue={data.totalTFlops.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        unit="TF"
        color="cyan"
        max={Math.max(data.totalTFlops * 1.2, 1000)}
      />
      <GaugeCard
        label="Power"
        value={data.totalPower}
        displayValue={data.totalPower.toLocaleString()}
        unit="W"
        color="red"
        max={data.maxPower}
      />
      <GaugeCard
        label="Stability"
        value={data.avgStability}
        displayValue={Math.round(data.avgStability).toString()}
        unit="%"
        color="emerald"
        max={100}
      />
      <GaugeCard
        label="Temperature"
        value={data.avgTemperature}
        displayValue={Math.round(data.avgTemperature).toString()}
        unit="°C"
        color="amber"
        max={120}
      />
      <EnergyBar current={data.batteryWh} max={data.maxBatteryWh} />
    </div>
  )
}