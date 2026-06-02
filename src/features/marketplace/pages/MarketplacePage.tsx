import { ArrowLeftRight, Shield, Store } from 'lucide-react'

const marketplaceStreams = [
  {
    title: 'Player Listings',
    description:
      'Future peer-to-peer component offers with owner metadata, condition history, and dynamic pricing.',
  },
  {
    title: 'Trade Offers',
    description:
      'Prepare swap flows between players for component-for-component or NCR-balanced exchanges.',
  },
  {
    title: 'Reputation Layer',
    description:
      'Seller history, delivery confidence, and dispute-safe transaction scoring will live here.',
  },
]

export function MarketplacePage() {
  return (
    <section className="w-full animate-in fade-in duration-300">
      <div className="space-y-5">
        <div className="surface-panel rounded-[28px] px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-violet-100">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Player commerce lane
              </span>

              <div className="space-y-2">
                <h1 className="font-display text-3xl tracking-[0.12em] text-white sm:text-4xl">
                  Marketplace
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Dedicated future market for player listings, negotiated trades, and component exchange without mixing official store inventory.
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Model
                </p>
                <p className="mt-2 text-white">Player-to-player</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-white">Foundation ready</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Separation
                </p>
                <p className="mt-2 text-white">Independent from Store</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="surface-panel rounded-[24px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-violet-400/18 bg-violet-500/10 text-violet-100">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl tracking-[0.08em] text-white">
                  Marketplace Structure
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Clean base for future commerce systems
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {marketplaceStreams.map((stream) => (
                <article
                  key={stream.title}
                  className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-100">
                    {stream.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {stream.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="surface-panel rounded-[24px] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-cyan-400/18 bg-cyan-400/10 text-cyan-100">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl tracking-[0.08em] text-white">
                  Next Integrations
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Listings, buy orders, seller reputation, escrow-style validation, and inventory transfer logic can plug in here later without touching the official store flow.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {[
                'Listing model with owner references',
                'Escrow-ready transaction states',
                'Offer negotiation and swap support',
                'Rack and inventory delivery hooks',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MarketplacePage
