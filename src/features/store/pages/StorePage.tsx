import { ShieldCheck, ShoppingCart, Zap } from 'lucide-react'
import { powerSupplies } from '../data/powerSupplies'
import type { PowerSupplyCondition, PowerSupplyProduct } from '../types'



const conditionToneMap: Record<PowerSupplyCondition, string> = {
  New: 'border-emerald-300/18 bg-emerald-500/10 text-emerald-100',
  Used: 'border-amber-300/18 bg-amber-500/10 text-amber-100',
  Conserved: 'border-sky-300/18 bg-sky-500/10 text-sky-100',
  Repowered: 'border-cyan-300/18 bg-cyan-500/10 text-cyan-100',
  Reconstructed: 'border-violet-300/18 bg-violet-500/10 text-violet-100',
}

function StoreProductCard({ product }: { product: PowerSupplyProduct }) {
  return (
    <article className="surface-panel rounded-[22px] p-3 sm:p-4">
      <div className="overflow-hidden rounded-[20px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_45%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.92))]">
        <div className="relative flex h-[150px] items-center justify-center overflow-hidden rounded-[18px] border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_rgba(15,23,42,0.45)_55%,_rgba(2,6,23,0.9))] px-3 py-2">
          <div className="absolute inset-x-6 bottom-4 h-10 rounded-full bg-cyan-400/10 blur-2xl" />
          <img
            src={product.image}
            alt={product.name}
            className="relative z-10 h-full max-h-[205px] w-auto object-contain drop-shadow-[0_14px_30px_rgba(8,145,178,0.35)]"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${conditionToneMap[product.condition]}`}
        >
          {product.condition}
        </span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl tracking-[0.08em] text-white">
            {product.name}
          </h2>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {product.brand}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Price
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">
            {product.price.toLocaleString()} NCR
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
            Power
          </p>
          <p className="mt-1 text-xs font-semibold text-white">
            {product.power}W
          </p>
        </div>

        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
            Efficiency
          </p>
          <p className="mt-1 text-xs font-semibold text-cyan-100">
            {product.stats.efficiency}
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Rails
          </p>
          <p className="mt-1 text-xs font-semibold text-white">{product.stats.railStability}</p>
        </div>
        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Thermal
          </p>
          <p className="mt-1 text-xs font-semibold text-white">{product.stats.thermalProfile}</p>
        </div>
      </div>

      
      <button
        type="button"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-cyan-300/20 bg-[linear-gradient(90deg,rgba(12,20,34,0.96),rgba(19,33,61,0.94))] px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-50 transition hover:border-cyan-200/34 hover:shadow-[0_0_24px_rgba(34,211,238,0.16)]"
      >
        <ShoppingCart className="h-4 w-4" />
        Buy
      </button>
    </article>
  )
}

export function StorePage() {
  return (
    <section className="w-full animate-in fade-in duration-300">
      <div className="space-y-5">
        <div className="surface-panel rounded-[28px] px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-cyan-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Official store
              </span>

              <div className="space-y-2">
                <h1 className="font-display text-3xl tracking-[0.12em] text-white sm:text-4xl">
                  Store
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Certified power supply catalog generated by the system for direct purchases and future inventory sync.
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Catalog
                </p>
                <p className="mt-2 text-white">Power Supplies</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Stock
                </p>
                <p className="mt-2 text-white">{powerSupplies.length} units</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Flow
                </p>
                <p className="mt-2 text-white">Ready for inventory hookup</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,320px))] justify-center gap-4">
          {powerSupplies.map((product) => (
            <StoreProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="surface-panel rounded-[24px] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-violet-400/18 bg-violet-500/10 text-violet-100">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl tracking-[0.08em] text-white">
                Integration Ready
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                This feature is isolated from player-to-player commerce and prepared for future purchase hooks into inventory, racks, and economy validation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default StorePage
