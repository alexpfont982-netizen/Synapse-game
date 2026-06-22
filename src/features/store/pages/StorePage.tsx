import { useEffect, useState } from 'react'
import { ShieldCheck, ShoppingCart, Zap, ChevronDown, TrendingUp, TrendingDown, BatteryCharging } from 'lucide-react'
import {
  garageInventory,
  garageInventoryByCategory,
} from '../../../data/garageInventory'
import {
  purchaseStoreItem,
  useMockPlayerState,
  useBatteryCatalog,
  purchaseBattery,
  type BatteryCatalogItem,
} from '../../../data/supabasePlayerState'
import { supabase } from '../../../supabaseClient'
import type {
  GarageInventoryItem,
  StoreItemCondition,
  StoreTabCategory,
} from '../../../types/store'

type StoreMetric = {
  label: string
  value: string
}

type PurchaseFeedback =
  | {
      tone: 'success' | 'error'
      text: string
    }
  | null

// ── Efectos condicionales (component_conditional_effects) ──────────

type ProductConditionalEffect = {
  id: number
  effect_type: 'boost' | 'penalty'
  effect_label: string
  stat_affected: string
  condition_stat: string
  condition_op: string
  condition_value: number | null
  description: string
}

function formatCondition(e: ProductConditionalEffect): string {
  if (e.condition_op === 'always') return 'Always active'
  const statLabel = e.condition_stat.replace('_', ' ')
  const opLabel = e.condition_op === 'gt' ? '>' : e.condition_op === 'gte' ? '\u2265' : e.condition_op === 'lt' ? '<' : '\u2264'
  return `When ${statLabel} ${opLabel} ${e.condition_value}`
}

// Hook simple: trae los efectos condicionales de UN item_id puntual.
// Se usa solo cuando la tarjeta se expande (lazy), para no disparar
// 57 queries a Supabase al cargar la página completa del Store.
function useProductEffects(itemId: string, enabled: boolean) {
  const [effects, setEffects] = useState<ProductConditionalEffect[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || effects !== null) return
    setLoading(true)
    supabase
      .from('component_conditional_effects')
      .select('*')
      .eq('item_id', itemId)
      .then(({ data, error }) => {
        setLoading(false)
        if (error) { console.error('useProductEffects error:', error); return }
        setEffects(
          (data ?? []).map((row) => ({
            id: row.id,
            effect_type: row.effect_type,
            effect_label: row.effect_label,
            stat_affected: row.stat_affected,
            condition_stat: row.condition_stat,
            condition_op: row.condition_op,
            condition_value: row.condition_value !== null ? Number(row.condition_value) : null,
            description: row.description,
          })),
        )
      })
  }, [enabled, itemId, effects])

  return { effects, loading }
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

// ── Sección expandible de efectos condicionales ─────────────────────

function ConditionalEffectsPanel({ itemId, expanded }: { itemId: string; expanded: boolean }) {
  const { effects, loading } = useProductEffects(itemId, expanded)
  const isCable = itemId.startsWith('cable_')

  if (!expanded) return null

  if (isCable) {
    return (
      <div className="mt-2 rounded-[16px] border border-white/8 bg-white/[0.02] px-3 py-3">
        <p className="text-[11px] text-slate-500 italic">
          Cables don't have rack-state conditional effects.
        </p>
      </div>
    )
  }

  if (loading || effects === null) {
    return (
      <div className="mt-2 rounded-[16px] border border-white/8 bg-white/[0.02] px-3 py-3">
        <p className="text-[11px] text-slate-500">Loading performance data…</p>
      </div>
    )
  }

  const boost = effects.find((e) => e.effect_type === 'boost')
  const penalty = effects.find((e) => e.effect_type === 'penalty')

  return (
    <div className="mt-2 flex flex-col gap-2">
      {boost && (
        <div className="rounded-[16px] border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-300">{boost.effect_label}</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-emerald-200/60">{boost.description}</p>
          <p className="mt-1 text-[9px] uppercase tracking-wide text-emerald-500/60">
            {formatCondition(boost)}
          </p>
        </div>
      )}

      {penalty && (
        <div className="rounded-[16px] border border-red-400/15 bg-red-500/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[11px] font-bold text-red-300">{penalty.effect_label}</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-red-200/60">{penalty.description}</p>
          <p className="mt-1 text-[9px] uppercase tracking-wide text-red-500/60">
            {formatCondition(penalty)}
          </p>
        </div>
      )}

      {!boost && !penalty && (
        <div className="rounded-[16px] border border-white/8 bg-white/[0.02] px-3 py-3">
          <p className="text-[11px] text-slate-500 italic">No conditional effects on record.</p>
        </div>
      )}
    </div>
  )
}

function StoreProductCard({
  product,
  onBuy,
}: {
  product: GarageInventoryItem
  onBuy: (product: GarageInventoryItem) => void
}) {
  const [expanded, setExpanded] = useState(false)
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

      {/* ── Toggle: rendimiento condicional ─────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 flex w-full items-center justify-between rounded-[14px] border border-white/8 bg-white/[0.02] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:border-cyan-300/20 hover:text-cyan-200"
      >
        <span>Performance Conditions</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <ConditionalEffectsPanel itemId={product.item_id} expanded={expanded} />

      <button
        type="button"
        onClick={() => onBuy(product)}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-cyan-300/20 bg-[linear-gradient(90deg,rgba(12,20,34,0.96),rgba(19,33,61,0.94))] px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-50 transition hover:border-cyan-200/34 hover:shadow-[0_0_24px_rgba(34,211,238,0.16)]"
      >
        <ShoppingCart className="h-4 w-4" />
        Buy
      </button>
    </article>
  )
}

// ── Tarjeta de batería ───────────────────────────────────────────

function BatteryProductCard({
  battery,
  onBuy,
}: {
  battery: BatteryCatalogItem
  onBuy: (battery: BatteryCatalogItem) => void
}) {
  return (
    <article className="surface-panel rounded-[22px] p-3 sm:p-4">
      <div className="flex h-[150px] items-center justify-center overflow-hidden rounded-[20px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.14),transparent_45%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.92))]">
        <BatteryCharging className="h-16 w-16 text-emerald-300/70" strokeWidth={1.5} />
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl tracking-[0.08em] text-white">
            {battery.name}
          </h2>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/70">
            +{Math.round(battery.whAmount).toLocaleString()} Wh
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Price
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">
            {battery.price.toLocaleString()} NCR
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        {battery.description}
      </p>

      <button
        type="button"
        onClick={() => onBuy(battery)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-emerald-300/20 bg-[linear-gradient(90deg,rgba(6,34,28,0.96),rgba(12,46,38,0.94))] px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-50 transition hover:border-emerald-200/34 hover:shadow-[0_0_24px_rgba(52,211,153,0.16)]"
      >
        <BatteryCharging className="h-4 w-4" />
        Buy
      </button>
    </article>
  )
}

interface StorePageProps {
  userId: string
}

export function StorePage({ userId }: StorePageProps) {
  const [activeTab, setActiveTab] = useState<StoreTabCategory>('all_items')
  const [purchaseFeedback, setPurchaseFeedback] =
    useState<PurchaseFeedback>(null)
  const { balance, inventory, refresh } = useMockPlayerState(userId)

  const activeTabMeta =
    storeTabs.find((tab) => tab.id === activeTab) ?? storeTabs[0]
  const visibleProducts =
    activeTab === 'all_items'
      ? garageInventory
      : garageInventoryByCategory[activeTab]

  const handleBuy = async (product: GarageInventoryItem) => {
  const result = await purchaseStoreItem(userId, product)
  if (!result.ok) {
    setPurchaseFeedback({ tone: 'error', text: 'Insufficient NCR balance.' })
    return
  }
  await refresh()
  setPurchaseFeedback({ tone: 'success', text: `Purchase completed: ${getDisplayName(product)} added to inventory.` })
}

  const { catalog: batteryCatalog } = useBatteryCatalog()

  const handleBuyBattery = async (battery: BatteryCatalogItem) => {
    const result = await purchaseBattery(userId, battery)
    if (!result.ok) {
      setPurchaseFeedback({ tone: 'error', text: 'Insufficient NCR balance.' })
      return
    }
    await refresh()
    setPurchaseFeedback({ tone: 'success', text: `Purchase completed: ${battery.name} added to your battery inventory.` })
  }

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
                  Balance
                </p>
                <p className="mt-2 text-white">
                  {balance.toLocaleString()} NCR
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-panel rounded-[24px] p-3">
          <div className="space-y-3">
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

            {purchaseFeedback && (
              <div
                className={`rounded-[18px] border px-4 py-3 text-sm ${
                  purchaseFeedback.tone === 'success'
                    ? 'border-emerald-300/18 bg-emerald-500/10 text-emerald-100'
                    : 'border-amber-300/18 bg-amber-500/10 text-amber-100'
                }`}
              >
                {purchaseFeedback.text}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,320px))] justify-center gap-4">
          {visibleProducts.map((product) => (
            <StoreProductCard
              key={product.item_id}
              product={product}
              onBuy={handleBuy}
            />
          ))}
        </div>

        {/* ── Sección de Baterías — energía de la sala ────────────── */}
        <div className="surface-panel rounded-[24px] p-3">
          <div className="flex items-center gap-2 px-2 py-1">
            <BatteryCharging className="h-4 w-4 text-emerald-300/80" />
            <h2 className="font-display text-lg tracking-[0.08em] text-white">
              Energy Cells
            </h2>
            <p className="ml-2 text-[11px] text-slate-500">
              Recharge your room's energy reserve. Buy now, activate anytime from the Dashboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,320px))] justify-center gap-4">
          {batteryCatalog.map((battery) => (
            <BatteryProductCard
              key={battery.itemId}
              battery={battery}
              onBuy={handleBuyBattery}
            />
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
                Mock purchases now persist locally while this feature stays isolated from player-to-player commerce and future economy integrations.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                Inventory records: {inventory.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default StorePage