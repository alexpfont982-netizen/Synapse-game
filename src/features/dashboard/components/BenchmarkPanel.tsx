import { ArrowUpRight, TimerReset, Trophy } from 'lucide-react'

export interface BenchmarkPanelData {
  title: string
  subtitle: string
  description: string
  timeRemaining: string
  timeLabel: string
  userPosition: string
  positionLabel: string
  projectedReward: string
  rewardLabel: string
  bonusText: string
  detailsButtonText: string
  disclaimer: string
}

// NUEVO: Agregamos performanceScore opcional para no romper otros lugares donde uses este componente
interface BenchmarkPanelProps {
  benchmark: BenchmarkPanelData
  performanceScore?: number 
}

function BenchmarkStat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-cyan-400/10 bg-slate-950/50 px-3.5 py-3">
      <span className="text-[13px] text-slate-400">{label}</span>
      <span className="text-right text-[15px] font-semibold text-white">{value}</span>
    </div>
  )
}

export function BenchmarkPanel({ benchmark, performanceScore = 0 }: BenchmarkPanelProps) {
  
  // LÓGICA DE ECONOMÍA: Calculamos la recompensa real en base a los puntos de IA
  const calculatedReward = Math.round(performanceScore / 10);
  
  // Si tienes hardware generando, mostramos el número real. Si no, usamos el del mock temporalmente.
  const displayReward = performanceScore > 0 
    ? `${calculatedReward.toLocaleString()} NCR` 
    : benchmark.projectedReward;

  return (
    <aside className="surface-panel rounded-[24px] border border-cyan-400/10 p-4 md:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_36%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.08),transparent_20%)]" />

      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
        <TimerReset className="h-3.5 w-3.5" />
        {benchmark.subtitle}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[1.7rem] leading-none text-white">
            Benchmark
          </h2>
          <p className="mt-2 text-sm font-medium text-cyan-100">
            {benchmark.title}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-slate-400">
            Resumen activo del ciclo competitivo actual.
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-violet-400/18 bg-violet-500/10 text-violet-100 shadow-[0_0_25px_rgba(168,85,247,0.18)]">
          <Trophy className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        <BenchmarkStat label="Time remaining" value={benchmark.timeRemaining} />
        <BenchmarkStat label={benchmark.positionLabel} value={benchmark.userPosition} />
        
        {/* Aquí inyectamos nuestra variable calculada en vivo */}
        <BenchmarkStat
          label="Recompensa proyectada"
          value={displayReward}
        />
      </div>

      <div className="mt-4 inline-flex rounded-full border border-violet-400/14 bg-violet-500/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-violet-100/85">
        {benchmark.bonusText}
      </div>

      <p className="mt-3 text-[12px] leading-6 text-slate-400">{benchmark.description}</p>

      <button
        type="button"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-cyan-300/20 bg-[linear-gradient(90deg,rgba(21,35,72,0.92),rgba(38,17,79,0.88))] px-4 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_rgba(59,130,246,0.18)] transition hover:border-cyan-200/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.24)]"
      >
        Ver detalles
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </aside>
  )
}