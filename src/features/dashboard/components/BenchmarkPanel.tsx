import { useEffect, useState } from 'react'
import { ArrowUpRight, TimerReset, Trophy } from 'lucide-react'
import { supabase } from '../../../supabaseClient'

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

interface PoolStat {
  crypto: string
  participants_count: number
  total_tflops: number
  cycle_amount: number
}

interface BenchmarkPanelProps {
  benchmark: BenchmarkPanelData
  performanceScore?: number
  userId?: string
}

const CRYPTO_ICONS: Record<string, string> = {
  NCR:  'N',
  BTC:  '₿',
  ETH:  'Ξ',
  DOGE: 'Ð',
  POL:  'P',
  BNB:  'B',
}

const CRYPTO_COLORS: Record<string, string> = {
  NCR:  'text-blue-400',
  BTC:  'text-amber-400',
  ETH:  'text-violet-400',
  DOGE: 'text-yellow-400',
  POL:  'text-purple-400',
  BNB:  'text-yellow-300',
}

function formatCycleAmount(amount: number, crypto: string): string {
  if (crypto === 'NCR')  return `${amount.toFixed(2)} NCR`
  if (crypto === 'BTC')  return `${amount.toFixed(8)} BTC`
  if (crypto === 'ETH')  return `${amount.toFixed(6)} ETH`
  return `${amount.toFixed(4)} ${crypto}`
}

function usePoolStats() {
  const [pools, setPools]               = useState<PoolStat[]>([])
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [totalTflops,  setTotalTflops]  = useState(0)
  const [loading, setLoading]           = useState(true)

  const fetchAll = async () => {
    const [poolsRes, globalRes] = await Promise.all([
      supabase.from('pool_latest_stats').select('crypto, participants_count, total_tflops, cycle_amount'),
      supabase.from('pool_global_stats').select('total_unique_players, total_tflops').single(),
    ])

    if (poolsRes.data) {
      setPools(poolsRes.data.map(r => ({
        crypto:             r.crypto,
        participants_count: Number(r.participants_count),
        total_tflops:       Number(r.total_tflops),
        cycle_amount:       Number(r.cycle_amount),
      })))
    }

    if (globalRes.data) {
      setTotalPlayers(Number(globalRes.data.total_unique_players))
      setTotalTflops(Number(globalRes.data.total_tflops))
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 15 * 60 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { pools, totalPlayers, totalTflops, loading }
}

function usePlayerActivePool(userId?: string) {
  const [activePool, setActivePool] = useState<string>('NCR')

  useEffect(() => {
    if (!userId) return
    supabase
      .from('player_pool_allocation')
      .select('pct_ncr, pct_btc, pct_eth, pct_doge, pct_pol, pct_bnb')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const entries = [
          { crypto: 'NCR',  pct: Number(data.pct_ncr)  },
          { crypto: 'BTC',  pct: Number(data.pct_btc)  },
          { crypto: 'ETH',  pct: Number(data.pct_eth)  },
          { crypto: 'DOGE', pct: Number(data.pct_doge) },
          { crypto: 'POL',  pct: Number(data.pct_pol)  },
          { crypto: 'BNB',  pct: Number(data.pct_bnb)  },
        ]
        const dominant = entries.reduce((a, b) => b.pct > a.pct ? b : a)
        if (dominant.pct > 0) setActivePool(dominant.crypto)
      })
  }, [userId])

  return activePool
}

export function BenchmarkPanel({ benchmark: _benchmark, performanceScore: _performanceScore = 0, userId }: BenchmarkPanelProps) {
  const { pools, totalPlayers, totalTflops, loading } = usePoolStats()
  const activePool = usePlayerActivePool(userId)

  const activePoolData = pools.find(p => p.crypto === activePool)

  const ORDER = ['NCR', 'BTC', 'ETH', 'DOGE', 'POL', 'BNB']
  const sortedPools = [...pools].sort((a, b) => ORDER.indexOf(a.crypto) - ORDER.indexOf(b.crypto))

  return (
    <aside className="surface-panel rounded-[24px] border border-cyan-400/10 p-4 md:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_36%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.08),transparent_20%)]" />

      {/* Header */}
      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
        <TimerReset className="h-3.5 w-3.5" />
        Pool Network
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[1.7rem] leading-none text-white">Benchmark</h2>
          <p className="mt-2 text-[13px] leading-6 text-slate-400">
            Live pool stats for the current cycle.
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-violet-400/18 bg-violet-500/10 text-violet-100 shadow-[0_0_25px_rgba(168,85,247,0.18)]">
          <Trophy className="h-5 w-5" />
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-[12px] text-slate-500 animate-pulse">Loading pool data...</div>
      ) : (
        <>
          {/* Pool activa del jugador */}
          {activePoolData && (
            <div className="mt-4 rounded-[18px] border border-cyan-400/15 bg-slate-950/60 px-3.5 py-3">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`text-base font-bold ${CRYPTO_COLORS[activePoolData.crypto]}`}>
                    {CRYPTO_ICONS[activePoolData.crypto]}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-slate-300 font-semibold">
                    {activePoolData.crypto} Pool
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-emerald-300 border border-emerald-400/25 bg-emerald-400/10 rounded-full px-2 py-0.5">
                  Your pool
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[14px] border border-cyan-400/10 bg-slate-950/50 px-2.5 py-2.5">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500 mb-1">Players</p>
                  <p className="text-[17px] font-semibold text-white">{activePoolData.participants_count}</p>
                </div>
                <div className="rounded-[14px] border border-cyan-400/10 bg-slate-950/50 px-2.5 py-2.5">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500 mb-1">TFlops</p>
                  <p className="text-[17px] font-semibold text-white">
                    {activePoolData.total_tflops >= 1000
                      ? `${(activePoolData.total_tflops / 1000).toFixed(1)}K`
                      : activePoolData.total_tflops.toFixed(0)}
                  </p>
                </div>
                <div className="rounded-[14px] border border-cyan-400/10 bg-slate-950/50 px-2.5 py-2.5">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500 mb-1">/ cycle</p>
                  <p className="text-[11px] font-semibold text-amber-300 leading-tight mt-1">
                    {formatCycleAmount(activePoolData.cycle_amount, activePoolData.crypto)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Todas las pools */}
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2">All pools</p>
            {sortedPools.map(pool => {
              const isActive = pool.crypto === activePool
              return (
                <div
                  key={pool.crypto}
                  className={`flex items-center justify-between rounded-[14px] px-3 py-2 ${
                    isActive
                      ? 'border border-amber-400/20 bg-amber-950/20'
                      : 'border border-white/5 bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${CRYPTO_COLORS[pool.crypto]}`}>
                      {CRYPTO_ICONS[pool.crypto]}
                    </span>
                    <span className={`text-[12px] font-semibold ${isActive ? 'text-amber-200' : 'text-slate-300'}`}>
                      {pool.crypto}
                    </span>
                    {isActive && (
                      <span className="text-[9px] text-amber-400/70">← you</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] ${isActive ? 'text-amber-400/70' : 'text-slate-500'}`}>
                      {pool.participants_count}p · {pool.total_tflops >= 1000
                        ? `${(pool.total_tflops / 1000).toFixed(1)}K`
                        : pool.total_tflops.toFixed(0)} TF
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Global totals — jugadores únicos */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[14px] border border-white/5 bg-slate-950/50 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500 mb-1">Total players</p>
              <p className="text-[20px] font-semibold text-white">{totalPlayers}</p>
            </div>
            <div className="rounded-[14px] border border-white/5 bg-slate-950/50 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500 mb-1">Total TFlops</p>
              <p className="text-[20px] font-semibold text-white">
                {totalTflops >= 1000
                  ? `${(totalTflops / 1000).toFixed(1)}K`
                  : totalTflops.toFixed(0)}
              </p>
            </div>
          </div>
        </>
      )}

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