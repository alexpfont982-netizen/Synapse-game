import { AlertTriangle, ChevronLeft, Crosshair, Shield, Timer } from 'lucide-react'
import { CRITICAL_TIME_THRESHOLD, LOW_TIME_THRESHOLD } from './labDuelConfig'
import type { DuelPhase, DuelResult, DuelStats } from './labDuelTypes'

interface LabDuelHUDProps {
  phase: DuelPhase
  stats: DuelStats
  result: DuelResult | null
  showHitConfirm: boolean
  showDamageFlash: boolean
  onStart: () => void
  onRestart: () => void
  onExit: () => void
}

function formatTime(timeLeft: number) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function LabDuelHUD({
  phase,
  stats,
  result,
  showHitConfirm,
  showDamageFlash,
  onStart,
  onRestart,
  onExit,
}: LabDuelHUDProps) {
  const resultTone =
    result?.tone === 'emerald'
      ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
      : result?.tone === 'rose'
        ? 'border-rose-300/20 bg-rose-400/10 text-rose-100'
        : result?.tone === 'amber'
          ? 'border-amber-300/20 bg-amber-400/10 text-amber-100'
          : 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100'

  const isLowTime = phase === 'playing' && stats.timeLeft <= LOW_TIME_THRESHOLD
  const isCriticalTime =
    phase === 'playing' && stats.timeLeft <= CRITICAL_TIME_THRESHOLD

  const timerTone = isCriticalTime
    ? 'border-rose-300/30 bg-rose-500/14 shadow-[0_0_36px_rgba(251,113,133,0.18)]'
    : isLowTime
      ? 'border-amber-300/28 bg-amber-500/12 shadow-[0_0_32px_rgba(245,158,11,0.16)]'
      : 'border-cyan-400/18 bg-slate-950/78 shadow-[0_0_32px_rgba(34,211,238,0.1)]'

  const resultPanelTone =
    result?.tone === 'emerald'
      ? 'border-emerald-300/26 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),rgba(2,6,23,0.92))] shadow-[0_0_70px_rgba(16,185,129,0.15)]'
      : result?.tone === 'rose'
        ? 'border-rose-300/26 bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.14),rgba(2,6,23,0.92))] shadow-[0_0_70px_rgba(244,63,94,0.16)]'
        : result?.tone === 'amber'
          ? 'border-amber-300/26 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),rgba(2,6,23,0.92))] shadow-[0_0_70px_rgba(245,158,11,0.14)]'
          : 'border-cyan-300/24 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),rgba(2,6,23,0.92))] shadow-[0_0_70px_rgba(34,211,238,0.14)]'

  const resultLabel =
    result?.title === 'Victory'
      ? 'Android neutralized'
      : result?.title === 'Defeat'
        ? 'Operator down'
        : result?.title === 'Draw'
          ? 'Cycle unresolved'
          : 'Containment failed'

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {showDamageFlash && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.08),transparent_38%),linear-gradient(to_bottom,rgba(251,113,133,0.16),transparent_28%,transparent_72%,rgba(251,113,133,0.16))]" />
      )}

      {phase === 'playing' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-150 ${
              stats.controlsLocked
                ? showHitConfirm
                  ? 'border-cyan-200/42 bg-cyan-300/[0.1] shadow-[0_0_26px_rgba(34,211,238,0.22)]'
                  : 'border-cyan-300/26 bg-cyan-400/[0.04]'
                : 'border-white/10 bg-white/[0.02]'
            }`}
          >
            <span className="absolute h-px w-5 bg-cyan-200/80" />
            <span className="absolute h-5 w-px bg-cyan-200/80" />
            <span className="absolute h-2.5 w-2.5 rounded-full border border-cyan-200/80" />
            {showHitConfirm && (
              <>
                <span className="absolute h-px w-3 -translate-x-[18px] -translate-y-[18px] rotate-45 bg-white/90" />
                <span className="absolute h-px w-3 translate-x-[18px] -translate-y-[18px] -rotate-45 bg-white/90" />
                <span className="absolute h-px w-3 -translate-x-[18px] translate-y-[18px] -rotate-45 bg-white/90" />
                <span className="absolute h-px w-3 translate-x-[18px] translate-y-[18px] rotate-45 bg-white/90" />
              </>
            )}
          </div>

          <div className="mt-2 flex flex-col items-center gap-2">
            {showHitConfirm && (
              <div className="rounded-full border border-cyan-300/16 bg-cyan-400/10 px-3 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-100">
                Android Hit
              </div>
            )}

            {showDamageFlash && (
              <div className="rounded-full border border-rose-300/18 bg-rose-400/12 px-3 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-100">
                Impact Received
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute left-3 top-3 sm:left-5 sm:top-5">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/72 px-3 py-2 shadow-[0_0_28px_rgba(15,23,42,0.35)] backdrop-blur-md">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-200 transition-colors hover:bg-white/[0.08]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Games
          </button>
          <div className="h-8 w-px bg-white/8" />
          <div>
            <p className="font-display text-sm tracking-[0.24em] text-white">
              Lab Duel Arena
            </p>
            <p className="text-[11px] text-slate-400">
              Futuristic 1v1 lab simulation
            </p>
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 top-3 w-[min(92vw,520px)] -translate-x-1/2 sm:top-5">
        <div className={`rounded-[28px] border px-5 py-4 backdrop-blur-xl ${timerTone}`}>
          <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.28em] text-cyan-100">
            {isLowTime && <AlertTriangle className="h-4 w-4" />}
            {!isLowTime && <Timer className="h-4 w-4" />}
            Match Clock
          </div>

          <p
            className={`mt-2 text-center font-display text-3xl tracking-[0.2em] sm:text-4xl ${
              isCriticalTime ? 'text-rose-100' : isLowTime ? 'text-amber-100' : 'text-white'
            }`}
          >
            {formatTime(stats.timeLeft)}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-cyan-300/18 bg-cyan-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-cyan-100">
              3 hits to win
            </span>
            <span className="rounded-full border border-violet-300/18 bg-violet-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-violet-100">
              3 minutes before lab explosion
            </span>
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-24 sm:right-5 sm:top-5">
        <div className="rounded-[24px] border border-white/8 bg-slate-950/70 px-4 py-3 shadow-[0_0_28px_rgba(15,23,42,0.35)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
            <AlertTriangle className="h-4 w-4 text-violet-200" />
            Laboratory
          </div>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-white">
            {stats.statusLabel}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {stats.controlsLocked ? 'Pointer lock live' : 'Click arena to engage'}
          </p>
        </div>
      </div>

      <div className="absolute left-3 bottom-3 w-[min(92vw,320px)] sm:left-5 sm:bottom-5">
        <div className="rounded-[24px] border border-white/8 bg-slate-950/70 px-4 py-3 shadow-[0_0_28px_rgba(15,23,42,0.35)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
            <Shield className="h-4 w-4 text-cyan-200" />
            Operator
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Health
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {stats.playerHealth}/3
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Received
              </p>
              <p className="mt-1 text-2xl font-semibold text-rose-200">
                {stats.hitsTaken}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-3 bottom-3 w-[min(92vw,320px)] sm:right-5 sm:bottom-5">
        <div className="rounded-[24px] border border-white/8 bg-slate-950/70 px-4 py-3 shadow-[0_0_28px_rgba(15,23,42,0.35)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
            <Crosshair className="h-4 w-4 text-violet-200" />
            Android Unit
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Health
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {stats.rivalHealth}/3
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Landed
              </p>
              <p className="mt-1 text-2xl font-semibold text-cyan-200">
                {stats.hitsLanded}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 bottom-3 w-[min(92vw,380px)] -translate-x-1/2 sm:bottom-5">
        <div className="rounded-[24px] border border-white/8 bg-slate-950/68 px-4 py-3 text-center shadow-[0_0_28px_rgba(15,23,42,0.35)] backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Destructible systems
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {stats.panelsDestroyed}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Panels destroyed
          </p>
        </div>
      </div>

      {phase === 'intro' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.4),rgba(2,6,23,0.88))] p-4">
          <div className="pointer-events-auto w-full max-w-2xl rounded-[32px] border border-cyan-400/16 bg-slate-950/86 p-6 shadow-[0_0_50px_rgba(34,211,238,0.12)] backdrop-blur-xl sm:p-8">
            <span className="inline-flex rounded-full border border-cyan-300/18 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-100">
              Local simulation
            </span>
            <h1 className="mt-4 font-display text-3xl tracking-[0.16em] text-white sm:text-4xl">
              Lab Duel Arena
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Enter a compact research arena, break server cover, and eliminate the android before the lab reaches critical failure.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Controls
                </p>
                <p className="mt-2 text-sm text-white">WASD, mouse, left click</p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Win rule
                </p>
                <p className="mt-2 text-sm text-white">3 hits to win</p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Failure
                </p>
                <p className="mt-2 text-sm text-white">3 minutes before lab explosion</p>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onStart}
                className="rounded-full border border-cyan-300/28 bg-cyan-400/12 px-5 py-3 text-sm font-semibold uppercase tracking-[0.26em] text-cyan-100 transition-colors hover:bg-cyan-400/18"
              >
                Start Duel
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase tracking-[0.26em] text-slate-200 transition-colors hover:bg-white/[0.08]"
              >
                Back to Games
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'finished' && result && (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.38),rgba(2,6,23,0.9))] p-4">
          <div className={`pointer-events-auto w-full max-w-2xl rounded-[34px] border p-6 text-center backdrop-blur-xl sm:p-8 ${resultPanelTone}`}>
            <div
              className={`mx-auto inline-flex rounded-full border px-4 py-1.5 text-[11px] uppercase tracking-[0.28em] ${resultTone}`}
            >
              {resultLabel}
            </div>

            <h2 className="mt-5 font-display text-4xl tracking-[0.2em] text-white sm:text-5xl">
              {result.title}
            </h2>
            <p className="mt-3 text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Final Report
            </p>
            <p className="mt-4 mx-auto max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {result.subtitle}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4 shadow-[0_0_24px_rgba(15,23,42,0.18)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Hits landed
                </p>
                <p className="mt-2 text-2xl font-semibold text-cyan-100">
                  {stats.hitsLanded}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4 shadow-[0_0_24px_rgba(15,23,42,0.18)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Hits taken
                </p>
                <p className="mt-2 text-2xl font-semibold text-rose-100">
                  {stats.hitsTaken}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4 shadow-[0_0_24px_rgba(15,23,42,0.18)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Panels down
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {stats.panelsDestroyed}
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onRestart}
                className="rounded-full border border-cyan-300/28 bg-cyan-400/12 px-5 py-3 text-sm font-semibold uppercase tracking-[0.26em] text-cyan-100 transition-colors hover:bg-cyan-400/18"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold uppercase tracking-[0.26em] text-slate-200 transition-colors hover:bg-white/[0.08]"
              >
                Back to Games
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
