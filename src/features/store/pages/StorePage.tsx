import { useState } from 'react'
import { ShieldCheck, ShoppingCart, Zap } from 'lucide-react'
import {
  garageInventory,
  garageInventoryByCategory,
} from '../../../data/garageInventory'
import type {
  GarageInventoryItem,
  StoreItemCondition,
  StoreTabCategory,
} from '../../../types/store'

type StoreMetric = {
  label: string
  value: string
}

const storeTabs: Array<{
  id: StoreTabCategory
  label: string
  description: string
}> = [
  {
    id: 'all_items',
    label: 'All Items',
    description: 'Certified hardware catalog for Synapse Garage components.',
  },
  {
    id: 'power_supply',
    label: 'Power Supplies',
    description: 'Certified power supply catalog',
  },
  {
    id: 'power_cable',
    label: 'Power Cables',
    description: 'Certified power cable catalog',
  },
  {
    id: 'memory',
    label: 'Memory',
    description: 'Certified memory module catalog',
  },
  {
    id: 'storage',
    label: 'Storage',
    description: 'Certified storage unit catalog',
  },
  {
    id: 'gpu',
    label: 'GPUs',
    description: 'Certified GPU catalog',
  },
  {
    id: 'cooling',
    label: 'Cooling',
    description: 'Certified cooling component catalog',
  },
]

const conditionToneMap: Record<StoreItemCondition, string> = {
  New: 'border-emerald-300/18 bg-emerald-500/10 text-emerald-100',
  Used: 'border-amber-300/18 bg-amber-500/10 text-amber-100',
  Rebuilt: 'border-violet-300/18 bg-violet-500/10 text-violet-100',
}

function getDisplayName(product: GarageInventoryItem) {
  if (product.category === 'power_supply') {
    return `${product.brand} ${product.power_w}`
  }

  return `${product.brand} ${product.model}`
}

function getProductMetrics(product: GarageInventoryItem): StoreMetric[] {
  switch (product.category) {
    case 'power_supply':
      return [
        { label: 'Power', value: `${product.power_w}W` },
        { label: 'Avg Use', value: `${product.avg_consumption_w}W` },
        { label: 'Thermal', value: `${product.temperature_c}C` },
        { label: 'Stability', value: `${product.stability}%` },
      ]
    case 'power_cable':
      return [
        { label: 'Support', value: product.power_support },
        { label: 'Type', value: product.cable_type },
        { label: 'Stability', value: `+${product.stability_bonus}` },
        { label: 'Thermal', value: product.temperature_bonus },
      ]
    case 'memory':
      return [
        { label: 'Capacity', value: `${product.capacity_gb}GB` },
        { label: 'Memory', value: product.memory_type },
        { label: 'Speed', value: `${product.processing_speed}` },
        { label: 'Thermal', value: `${product.temperature_c}C` },
      ]
    case 'storage':
      return [
        { label: 'Capacity', value: product.capacity },
        { label: 'Type', value: product.storage_type },
        { label: 'Read', value: `${product.read_speed} MB/s` },
        { label: 'Thermal', value: `${product.temperature_c}C` },
      ]
    case 'gpu':
      return [
        { label: 'VRAM', value: `${product.vram_gb}GB` },
        { label: 'Draw', value: `${product.power_consumption_w}W` },
        { label: 'AI Out', value: `${product.ai_output}` },
        { label: 'Thermal', value: `${product.temperature_c}C` },
      ]
    case 'cooling':
      return [
        { label: 'Cooling', value: `${product.cooling_power}` },
        { label: 'Temp Cut', value: product.temperature_reduction },
        { label: 'Stability', value: `+${product.stability_bonus}` },
        { label: 'Noise', value: product.noise_level },
      ]
  }
}

function StoreProductCard({ product }: { product: GarageInventoryItem }) {
  const isPowerCable = product.category === 'power_cable'
  const metrics = getProductMetrics(product)
  const topMetrics = metrics.slice(0, 2)
  const bottomMetrics = metrics.slice(2, 4)

  return (
    <article className="surface-panel rounded-[22px] p-3 sm:p-4">
      <div className="overflow-hidden rounded-[20px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_45%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.92))]">
        <div className="relative flex h-[150px] items-center justify-center overflow-hidden rounded-[18px] border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_rgba(15,23,42,0.45)_55%,_rgba(2,6,23,0.9))] px-3 py-2">
          <div className="absolute inset-x-6 bottom-4 h-10 rounded-full bg-cyan-400/10 blur-2xl" />
          <img
            src={product.image}
            alt={getDisplayName(product)}
            className={`relative z-10 h-full max-h-[205px] w-auto object-contain drop-shadow-[0_14px_30px_rgba(8,145,178,0.35)] ${
              isPowerCable ? 'scale-[1.08]' : ''
            }`}
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
            {getDisplayName(product)}
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
        {topMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2"
          >
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
              {metric.label}
            </p>
            <p className="mt-1 text-xs font-semibold text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        {bottomMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              {metric.label}
            </p>
            <p className="mt-1 text-xs font-semibold text-white">
              {metric.value}
            </p>
          </div>
        ))}
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
  const [activeTab, setActiveTab] = useState<StoreTabCategory>('all_items')

  const activeTabMeta =
    storeTabs.find((tab) => tab.id === activeTab) ?? storeTabs[0]
  const visibleProducts =
    activeTab === 'all_items'
      ? garageInventory
      : garageInventoryByCategory[activeTab]

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
                  {activeTabMeta.description}
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Catalog
                </p>
                <p className="mt-2 text-white">{activeTabMeta.label}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Stock
                </p>
                <p className="mt-2 text-white">{visibleProducts.length} units</p>
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

        <div className="surface-panel rounded-[24px] p-3">
          <div className="flex flex-wrap gap-2">
            {storeTabs.map((tab) => {
              const isActive = tab.id === activeTab

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition ${
                    isActive
                      ? 'border-cyan-300/30 bg-cyan-400/12 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/18 hover:text-cyan-100'
                  }`}
                  aria-pressed={isActive}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,320px))] justify-center gap-4">
          {visibleProducts.map((product) => (
            <StoreProductCard key={product.item_id} product={product} />
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
