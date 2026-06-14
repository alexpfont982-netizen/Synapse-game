import { ArrowUpRight, Cpu, Gamepad2, Thermometer, Workflow, type LucideIcon } from 'lucide-react'

interface GameCard {
  title: string
  description: string
  status: string
  icon: LucideIcon
  path?: string
  cta: string
}

interface GamesPageProps {
  onNavigate: (path: string) => void
}

const gameCards: GameCard[] = [
  {
    title: 'Lab Duel Arena',
    description:
      'Prototype a futuristic 1v1 shooter duel inside a modular research lab with destructible cover and simulated rival pressure.',
    status: 'Playable prototype',
    icon: Gamepad2,
    path: '/games/lab-duel',
    cta: 'Open arena',
  },

  {
  title: 'Neural Link',
  description:
    'Rotate neural connection nodes to route the data signal from input to model output before time runs out.',
  status: 'Playable prototype',
  icon: Workflow,
  path: '/games/neural-link',
  cta: 'Open puzzle',
},

  {
    title: 'Heat Control',
    description:
      'A fast-response thermal management mode focused on balancing cooling, power spikes, and uptime pressure.',
    status: 'Systems prototype',
    icon: Thermometer,
    cta: 'Coming soon',
  },
  {
    title: 'Circuit Optimizer',
    description:
      'A route-planning and hardware efficiency challenge built to evolve into tactical minigame loops later on.',
    status: 'Strategy draft',
    icon: Cpu,
    cta: 'Coming soon',
  },
]

export default function GamesPage({ onNavigate }: GamesPageProps) {
  return (
    <section className="w-full max-w-[1300px] space-y-6">
      <div className="surface-panel rounded-[28px] px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-cyan-100">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
              Next release lane
            </span>

            <div className="space-y-2">
              <h1 className="font-display text-3xl tracking-[0.12em] text-white sm:text-4xl">
                Games
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Competitive modes, minigames and future events
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Focus
              </p>
              <p className="mt-2 text-white">Gameplay foundations</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Status
              </p>
              <p className="mt-2 text-white">Prototype stage</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Priority
              </p>
              <p className="mt-2 text-white">Arena combat loop</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {gameCards.map((card) => {
          const Icon = card.icon
          const isPlayable = Boolean(card.path)

          return (
            <article
              key={card.title}
              className={`surface-panel rounded-[24px] p-5 transition-transform duration-200 ${
                isPlayable ? 'hover:-translate-y-1' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-cyan-400/20 bg-cyan-400/12 text-cyan-100">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-violet-400/16 bg-violet-500/[0.08] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-violet-100">
                  {card.status}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <h2 className="font-display text-xl tracking-[0.08em] text-white">
                  {card.title}
                </h2>
                <p className="text-sm leading-7 text-slate-300">
                  {card.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                <div className="text-[12px] uppercase tracking-[0.22em] text-slate-400">
                  {isPlayable ? 'Live prototype' : 'Module staged'}
                </div>

                <button
                  type="button"
                  disabled={!isPlayable}
                  onClick={() => {
                    if (card.path) {
                      onNavigate(card.path)
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors ${
                    isPlayable
                      ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/16'
                      : 'cursor-not-allowed border-white/8 bg-white/[0.03] text-slate-500'
                  }`}
                >
                  {card.cta}
                  {isPlayable && <ArrowUpRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
