import { useEffect, useState } from 'react'
import { TimerReset, Trophy } from 'lucide-react'
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

interface PlayerAllocation {
  pct_ncr: number
  pct_btc: number
  pct_eth: number
  pct_doge: number
  pct_pol: number
  pct_bnb: number
}

interface BenchmarkPanelProps {
  benchmark: BenchmarkPanelData
  performanceScore?: number
  userId?: string
  roomTFlops?: number
}

const CRYPTO_ICONS: Record<string, string> = {
  NCR: 'N', BTC: '₿', ETH: 'Ξ', DOGE: 'Ð', POL: 'P', BNB: 'B',
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
  if (crypto === 'ETH')  return `${amount.toFixed(8)} ETH`
  if (crypto === 'DOGE') return `${amount.toFixed(6)} DOGE`
  if (crypto === 'POL')  return `${amount.toFixed(6)} POL`
  if (crypto === 'BNB')  return `${amount.toFixed(8)} BNB`
  return `${amount.toFixed(8)} ${crypto}`
}

function formatTflops(n: number): string {
  // Show 1 decimal to avoid rounding accumulation across pools
  return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// Calcula recompensa estimada del jugador en esa pool
function estimateReward(
  playerTflops: number,
  poolTotalTflops: number,
  cycleAmount: number,
): number {
  if (poolTotalTflops <= 0) return 0
  return (playerTflops / poolTotalTflops) * cycleAmount
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

function usePlayerAllocation(userId?: string) {
  const [allocation, setAllocation] = useState<PlayerAllocation | null>(null)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('player_pool_allocation')
      .select('pct_ncr, pct_btc, pct_eth, pct_doge, pct_pol, pct_bnb')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return
        setAllocation({
          pct_ncr:  Number(data.pct_ncr),
          pct_btc:  Number(data.pct_btc),
          pct_eth:  Number(data.pct_eth),
          pct_doge: Number(data.pct_doge),
          pct_pol:  Number(data.pct_pol),
          pct_bnb:  Number(data.pct_bnb),
        })
      })
  }, [userId])

  return allocation
}

function getPctForCrypto(allocation: PlayerAllocation, crypto: string): number {
  const map: Record<string, keyof PlayerAllocation> = {
    NCR: 'pct_ncr', BTC: 'pct_btc', ETH: 'pct_eth',
    DOGE: 'pct_doge', POL: 'pct_pol', BNB: 'pct_bnb',
  }
  return allocation[map[crypto]] ?? 0
}

export function BenchmarkPanel({ benchmark: _benchmark, performanceScore: _performanceScore = 0, userId, roomTFlops }: BenchmarkPanelProps) {
  const { pools, totalPlayers, totalTflops, loading } = usePoolStats()
  const allocation = usePlayerAllocation(userId)
  // Use roomTFlops from dashboard if available and loaded, fallback to Supabase total
  const displayTflops = (roomTFlops && roomTFlops > 0) ? roomTFlops : totalTflops

  // Pools donde el jugador tiene % > 0
  const activePools = pools.filter(p =>
    allocation ? getPctForCrypto(allocation, p.crypto) > 0 : false
  )

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
          {/* Your active pools */}
          {activePools.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Your pools</p>
              {activePools.map(pool => {
                const pct = allocation ? getPctForCrypto(allocation, pool.crypto) : 0
                // Player TFlops = their share of total room power
                const playerTflops = displayTflops * (pct / 100)
                // Use playerTflops as pool total since we know our real-time contribution.
                // When more players join, pool.total_tflops from Supabase will reflect all players.
                // We take the max to avoid over-estimating when stale data is lower.
                const poolTflops = Math.max(pool.total_tflops, playerTflops)
                const reward = playerTflops > 0 && poolTflops > 0
                  ? (playerTflops / poolTflops) * pool.cycle_amount
                  : 0

                return (
                  <div key={pool.crypto} className="rounded-[16px] border border-cyan-400/15 bg-slate-950/60 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${CRYPTO_COLORS[pool.crypto]}`}>
                          {CRYPTO_ICONS[pool.crypto]}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                          {pool.crypto} Pool
                        </span>
    
                      </div>
                      <span className="text-[9px] uppercase tracking-widest text-emerald-300 border border-emerald-400/25 bg-emerald-400/10 rounded-full px-2 py-0.5">
                        Active
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_1.8fr] gap-1.5">
                      <div className="rounded-[10px] border border-cyan-400/10 bg-slate-950/50 px-2 py-1.5">
                        <p className="text-[8px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">My TFlops</p>
                        <p className="text-[14px] font-semibold text-white">{formatTflops(playerTflops)}</p>
                      </div>
                      <div className="rounded-[10px] border border-cyan-400/10 bg-slate-950/50 px-2 py-1.5">
                        <p className="text-[8px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">My reward</p>
                        <p className="text-[10px] font-semibold text-amber-300 leading-tight mt-0.5">
                          {formatCycleAmount(reward, pool.crypto)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* All pools list */}
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2">All pools</p>
            {sortedPools.map(pool => {
              const pct = allocation ? getPctForCrypto(allocation, pool.crypto) : 0
              const isActive = pct > 0
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
                    <span className={`text-[13px] font-semibold ${isActive ? 'text-amber-200' : 'text-slate-300'}`}>
                      {pool.crypto}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`text-[13px] font-mono ${isActive ? 'text-amber-400/70' : 'text-slate-500'}`}>
                      {formatTflops(isActive ? displayTflops * getPctForCrypto(allocation!, pool.crypto) / 100 : pool.total_tflops)} TF
                    </span>
                    <span className={`text-[13px] font-mono ${isActive ? 'text-amber-300' : 'text-slate-600'}`}>
                      {formatCycleAmount(pool.cycle_amount, pool.crypto)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Global totals */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[14px] border border-white/5 bg-slate-950/50 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500 mb-1">Total players</p>
              <p className="text-[20px] font-semibold text-white">{totalPlayers}</p>
            </div>
            <div className="rounded-[14px] border border-white/5 bg-slate-950/50 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500 mb-1">Total TFlops</p>
              <p className="text-[20px] font-semibold text-white">{displayTflops.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
            </div>
          </div>
        </>
      )}


    </aside>
  )
}