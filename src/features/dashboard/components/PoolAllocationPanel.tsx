import { useState, useEffect, useMemo } from 'react'
import { changePoolAllocation, type PoolAllocation } from '../../../data/supabasePlayerState'

// ── Colores por cripto ─────────────────────────────────────────────
const POOL_CONFIG = [
  { key: 'pctNcr',  label: 'NCR',  color: '#22d3ee', bg: 'rgba(34,211,238,0.12)',  border: 'rgba(34,211,238,0.3)' },
  { key: 'pctBtc',  label: 'BTC',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  { key: 'pctEth',  label: 'ETH',  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',border: 'rgba(167,139,250,0.3)' },
  { key: 'pctDoge', label: 'DOGE', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
  { key: 'pctPol',  label: 'POL',  color: '#818cf8', bg: 'rgba(129,140,248,0.12)',border: 'rgba(129,140,248,0.3)' },
  { key: 'pctBnb',  label: 'BNB',  color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
] as const

type PoolKey = typeof POOL_CONFIG[number]['key']
type LocalPct = Record<PoolKey, number>

interface PoolAllocationPanelProps {
  allocation: PoolAllocation | null
  onSaved: () => void
}

export function PoolAllocationPanel({ allocation, onSaved }: PoolAllocationPanelProps) {
  const [local, setLocal] = useState<LocalPct>({
    pctNcr: 100, pctBtc: 0, pctEth: 0, pctDoge: 0, pctPol: 0, pctBnb: 0,
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [expanded, setExpanded] = useState(false)

  // Sincroniza con la data real al cargar
  useEffect(() => {
    if (!allocation) return
    setLocal({
      pctNcr:  allocation.pctNcr,
      pctBtc:  allocation.pctBtc,
      pctEth:  allocation.pctEth,
      pctDoge: allocation.pctDoge,
      pctPol:  allocation.pctPol,
      pctBnb:  allocation.pctBnb,
    })
  }, [allocation])

  const total = useMemo(() =>
    Object.values(local).reduce((s, v) => s + v, 0), [local])

  // Calcula cuánto tiempo falta para el próximo cambio
  const cooldownInfo = useMemo(() => {
    if (!allocation) return null
    const nextChange = new Date(allocation.lastChangedAt).getTime() + 24 * 60 * 60 * 1000
    const now = Date.now()
    if (now >= nextChange) return null
    const ms = nextChange - now
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  }, [allocation])

  const canSave = total === 100 && !cooldownInfo && !saving

  function handleSlider(key: PoolKey, value: number) {
    setLocal((prev) => ({ ...prev, [key]: value }))
  }

  function handleInput(key: PoolKey, raw: string) {
    const v = Math.min(100, Math.max(0, Number(raw) || 0))
    setLocal((prev) => ({ ...prev, [key]: v }))
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setFeedback(null)
    const result = await changePoolAllocation(
      local.pctNcr, local.pctBtc, local.pctEth,
      local.pctDoge, local.pctPol, local.pctBnb,
    )
    setSaving(false)
    setFeedback({ ok: result.success, msg: result.success ? 'Allocation saved! Applies next cycle.' : result.message })
    if (result.success) {
      onSaved()
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  return (
    <div className="rounded-[18px] border border-white/8 bg-slate-950/62 backdrop-blur-md overflow-hidden">
      {/* Header — siempre visible */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3.5 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/70">
            Pool Allocation
          </span>
          {/* Mini barras de colores mostrando distribución actual */}
          <div className="flex h-2 w-16 overflow-hidden rounded-full gap-px">
            {POOL_CONFIG.map(p => (
              local[p.key] > 0 ? (
                <div
                  key={p.key}
                  style={{ width: `${local[p.key]}%`, backgroundColor: p.color, opacity: 0.8 }}
                />
              ) : null
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cooldownInfo && (
            <span className="text-[9px] font-mono text-amber-400/70">{cooldownInfo}</span>
          )}
          <span className="text-slate-500 text-[10px]">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Panel expandible */}
      {expanded && (
        <div className="px-3.5 pb-3 border-t border-white/5">
          <div className="mt-2.5 flex flex-col gap-2">
            {POOL_CONFIG.map(p => (
              <div key={p.key} className="flex items-center gap-2">
                {/* Label */}
                <span
                  className="w-9 text-[9px] font-black uppercase shrink-0"
                  style={{ color: p.color }}
                >
                  {p.label}
                </span>

                {/* Slider */}
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={local[p.key]}
                    onChange={e => handleSlider(p.key, Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${p.color} ${local[p.key]}%, rgba(51,65,85,0.6) ${local[p.key]}%)`,
                    }}
                    disabled={!!cooldownInfo}
                  />
                </div>

                {/* Input numérico */}
                <div
                  className="w-10 rounded-lg border px-1 py-0.5 text-center text-[10px] font-mono font-bold"
                  style={{ borderColor: p.border, background: p.bg, color: p.color }}
                >
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={local[p.key]}
                    onChange={e => handleInput(p.key, e.target.value)}
                    className="w-full bg-transparent text-center outline-none"
                    disabled={!!cooldownInfo}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className={`mt-2.5 flex items-center justify-between text-[10px] font-mono rounded-lg px-2 py-1.5 ${
            total === 100 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
          }`}>
            <span className="font-bold uppercase tracking-wide">Total</span>
            <span className="font-black">{total}% {total === 100 ? '✓' : `(need ${100 - total > 0 ? '+' : ''}${100 - total}%)`}</span>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`mt-2 text-[10px] leading-relaxed px-2 py-1.5 rounded-lg ${
              feedback.ok ? 'bg-emerald-500/10 text-emerald-200' : 'bg-red-500/10 text-red-200'
            }`}>
              {feedback.msg}
            </div>
          )}

          {/* Cooldown warning */}
          {cooldownInfo && (
            <div className="mt-2 text-[10px] text-amber-400/70 px-1">
              ⏱ Next change available in {cooldownInfo}
            </div>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={`mt-2.5 w-full rounded-[12px] py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition ${
              canSave
                ? 'bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/30'
                : 'bg-slate-800/40 border border-slate-700/30 text-slate-600 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving…' : cooldownInfo ? 'Locked' : total !== 100 ? 'Total must be 100%' : 'Save Allocation'}
          </button>
        </div>
      )}
    </div>
  )
}