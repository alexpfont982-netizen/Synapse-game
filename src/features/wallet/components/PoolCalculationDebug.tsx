import { useEffect, useMemo, useState } from 'react'
import {
  selectMockHardwarePieces,
  useMockPlayerState,
  type MockHardwarePiece,
} from '../../../data/supabasePlayerState'
import { supabase } from '../../../supabaseClient'
import {
  getSupabaseErrorMessage,
  logSupabaseError,
} from '../utils/supabaseError'
import {
  computePoolTFlops,
  computeRackTFlops,
  type ComboEffect,
  type RawConditionalEffect,
  type RackPieceForCompute,
} from '../../dashboard/utils/rackComputeEngine'

type SourceType = 'mock' | 'frontend' | 'supabase' | 'unknown'

type UnknownRow = Record<string, unknown>

interface PoolCalculationDebugProps {
  userId: string
  cryptoPricesLoaded?: boolean
  zeroPriceDetected?: boolean
  withdrawalMinimumCalculationReady?: boolean
}

interface LatestPayoutDebugRow {
  id: string
  cycle_id: string
  user_id: string
  user_tflops: number | string | null
  reward_amount: number | string | null
  pool_cycle_history: UnknownRow | UnknownRow[] | null
}

interface FrontendPoolSnapshot {
  poolTFlops: number
  totalTFlops: number
  avgStability: number
}

interface PoolCalculationSnapshot {
  poolAmount: number | null
  userComputingPower: number | null
  totalNetworkComputingPower: number | null
  userSharePercentage: number | null
  estimatedHourlyPayout: number | null
  lastPayoutAmount: number | null
  lastPayoutDate: string | null
  sourceType: SourceType
  isComplete: boolean
  currentFrontendUserComputingPower: number | null
  currentFrontendTotalTFlops: number | null
  cycleHistoryKeys: string[]
  poolAmountSource: string
  userComputingPowerSource: string
  totalNetworkSource: string
}

const POOL_AMOUNT_KEYS = [
  'pool_amount',
  'reward_pool',
  'hourly_reward_pool',
  'hourly_pool_amount',
  'total_reward_pool',
  'total_rewards',
  'total_reward_amount',
  'payout_pool',
] as const

const TOTAL_NETWORK_KEYS = [
  'total_network_computing_power',
  'total_network_tflops',
  'network_computing_power',
  'network_tflops',
  'pool_tflops',
  'total_tflops',
  'total_compute_power',
  'computing_power_tps',
] as const

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function getJoinedHistory(
  row: LatestPayoutDebugRow | null,
): UnknownRow | null {
  if (!row?.pool_cycle_history) return null
  if (Array.isArray(row.pool_cycle_history)) {
    return row.pool_cycle_history[0] ?? null
  }
  return row.pool_cycle_history
}

function pickNumberFromKeys(
  row: UnknownRow | null,
  keys: readonly string[],
): { value: number | null; key: string | null } {
  if (!row) return { value: null, key: null }

  for (const key of keys) {
    const value = toNumber(row[key])
    if (value !== null) {
      return { value, key }
    }
  }

  return { value: null, key: null }
}

function getRackId(slotId: string | null): number | null {
  if (!slotId) return null
  const match = slotId.match(/^rack(\d+)-/i)
  return match ? Number(match[1]) : null
}

function pieceToComputeInput(piece: MockHardwarePiece): RackPieceForCompute {
  const stats = piece.stats as Record<string, number | string | undefined>
  const stabilityFallback =
    piece.condition === 'New' ? 100 : piece.condition === 'Rebuilt' ? 88 : 74

  return {
    item_id: piece.item_id,
    type: piece.type,
    base_ai_output:
      piece.type === 'GPU' ? Number(stats.ai_output ?? 0) : 0,
    base_power: Number(stats.power ?? 0),
    base_heat:
      piece.type === 'COOLING'
        ? -Math.abs(Number(stats.heat ?? 0))
        : Number(stats.temperature_c ?? stats.heat ?? 0),
    base_stability: Number(stats.stability ?? stabilityFallback),
  }
}

function formatValue(value: number | null, digits: number = 2) {
  if (value === null) return 'N/A'
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

function formatDate(value: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function getSourceBadgeClass(sourceType: SourceType) {
  switch (sourceType) {
    case 'supabase':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
    case 'frontend':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    case 'mock':
      return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300'
    default:
      return 'border-slate-600/40 bg-slate-800/40 text-slate-300'
  }
}

function useLatestPayoutDebugRow(userId: string) {
  const [row, setRow] = useState<LatestPayoutDebugRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setRow(null)
      setLoading(false)
      return
    }

    let isCancelled = false

    const fetchLatestPayout = async () => {
      try {
        setLoading(true)

        const { data, error: queryError } = await supabase
          .from('pool_cycle_payouts')
          .select(`
            id,
            cycle_id,
            user_id,
            user_tflops,
            reward_amount,
            pool_cycle_history!inner (*)
          `)
          .eq('user_id', userId)

        if (queryError) throw queryError
        if (isCancelled) return

        const latestRow = (Array.isArray(data) ? data : []).sort((left, right) => {
          const leftHistory = getJoinedHistory(left as LatestPayoutDebugRow)
          const rightHistory = getJoinedHistory(right as LatestPayoutDebugRow)
          const leftTime =
            typeof leftHistory?.cycle_at === 'string'
              ? new Date(leftHistory.cycle_at).getTime()
              : 0
          const rightTime =
            typeof rightHistory?.cycle_at === 'string'
              ? new Date(rightHistory.cycle_at).getTime()
              : 0
          return rightTime - leftTime
        })[0] ?? null

        setRow((latestRow as LatestPayoutDebugRow | null) ?? null)
        setError(null)
      } catch (fetchError) {
        if (isCancelled) return
        logSupabaseError(
          '[PoolCalculationDebug] Failed to audit latest payout cycle',
          fetchError,
        )
        setError(getSupabaseErrorMessage(fetchError, 'Failed to audit latest payout cycle'))
        setRow(null)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchLatestPayout()

    return () => {
      isCancelled = true
    }
  }, [userId])

  return { row, loading, error }
}

function useFrontendPoolSnapshot(userId: string) {
  const { inventory, loading: inventoryLoading } = useMockPlayerState(userId)
  const [snapshot, setSnapshot] = useState<FrontendPoolSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hardwarePieces = useMemo(
    () => selectMockHardwarePieces(inventory),
    [inventory],
  )

  const installedPieces = useMemo(
    () => hardwarePieces.filter((piece) => piece.slot_id !== null),
    [hardwarePieces],
  )

  const installedItemIds = useMemo(
    () => Array.from(new Set(installedPieces.map((piece) => piece.item_id))),
    [installedPieces],
  )

  const itemIdsKey = useMemo(
    () => JSON.stringify(installedItemIds),
    [installedItemIds],
  )

  useEffect(() => {
    if (inventoryLoading) return

    if (installedPieces.length === 0) {
      setSnapshot({
        poolTFlops: 0,
        totalTFlops: 0,
        avgStability: 100,
      })
      setError(null)
      return
    }

    let isCancelled = false

    const computeSnapshot = async () => {
      try {
        const { data: effectsRows, error: effectsError } = await supabase
          .from('component_conditional_effects')
          .select('*')
          .in('item_id', installedItemIds)

        if (effectsError) throw effectsError

        let comboRows: UnknownRow[] = []
        if (installedItemIds.length >= 2) {
          const { data, error: comboError } = await supabase
            .from('component_interactions')
            .select('item_a, item_b, effect_type, effect_value')
            .in('item_a', installedItemIds)
            .in('item_b', installedItemIds)

          if (comboError) throw comboError
          comboRows = (data as UnknownRow[] | null) ?? []
        }

        if (isCancelled) return

        const rawEffects: RawConditionalEffect[] = (
          (effectsRows as UnknownRow[] | null) ?? []
        ).map((row) => ({
          id: Number(row.id),
          item_id: String(row.item_id ?? ''),
          effect_type:
            row.effect_type === 'penalty' ? 'penalty' : 'boost',
          stat_affected:
            row.stat_affected === 'temperature' ||
            row.stat_affected === 'stability' ||
            row.stat_affected === 'ai_output' ||
            row.stat_affected === 'efficiency'
              ? row.stat_affected
              : 'efficiency',
          numeric_value: Number(row.numeric_value ?? 0),
          condition_stat:
            row.condition_stat === 'temperature' ||
            row.condition_stat === 'power_load' ||
            row.condition_stat === 'stability' ||
            row.condition_stat === 'always'
              ? row.condition_stat
              : 'always',
          condition_op:
            row.condition_op === 'lt' ||
            row.condition_op === 'lte' ||
            row.condition_op === 'gt' ||
            row.condition_op === 'gte' ||
            row.condition_op === 'always'
              ? row.condition_op
              : 'always',
          condition_value:
            row.condition_value === null || row.condition_value === undefined
              ? null
              : Number(row.condition_value),
        }))

        const comboEffects: ComboEffect[] = comboRows.map((row) => ({
          item_a: String(row.item_a ?? ''),
          item_b: String(row.item_b ?? ''),
          effect_type:
            row.effect_type === 'penalty' ? 'penalty' : 'boost',
          effect_value: String(row.effect_value ?? '0'),
        }))

        const rackIds = Array.from(
          new Set(
            installedPieces
              .map((piece) => getRackId(piece.slot_id))
              .filter((rackId): rackId is number => rackId !== null),
          ),
        ).sort((a, b) => a - b)

        const rackResults = rackIds.map((rackId) => {
          const rackPieces = installedPieces.filter(
            (piece) => getRackId(piece.slot_id) === rackId,
          )
          const rackItemIds = new Set(rackPieces.map((piece) => piece.item_id))

          return computeRackTFlops(
            rackPieces.map(pieceToComputeInput),
            rawEffects.filter((effect) => rackItemIds.has(effect.item_id)),
            comboEffects.filter(
              (combo) =>
                rackItemIds.has(combo.item_a) &&
                rackItemIds.has(combo.item_b),
            ),
          )
        })

        const poolSnapshot = computePoolTFlops(rackResults)
        setSnapshot({
          poolTFlops: poolSnapshot.poolTFlops,
          totalTFlops: poolSnapshot.totalTFlops,
          avgStability: poolSnapshot.avgStability,
        })
        setError(null)
      } catch (computeError) {
        if (isCancelled) return
        setSnapshot(null)
        setError(
          computeError instanceof Error
            ? computeError.message
            : 'Failed to compute frontend pool snapshot',
        )
      }
    }

    computeSnapshot()

    return () => {
      isCancelled = true
    }
  }, [installedPieces, installedItemIds, inventoryLoading, itemIdsKey])

  return { snapshot, loading: inventoryLoading, error }
}

export default function PoolCalculationDebug({
  userId,
  cryptoPricesLoaded = false,
  zeroPriceDetected = false,
  withdrawalMinimumCalculationReady = false,
}: PoolCalculationDebugProps) {
  const {
    row: latestPayoutRow,
    loading: payoutLoading,
    error: payoutError,
  } = useLatestPayoutDebugRow(userId)
  const {
    snapshot: frontendSnapshot,
    loading: frontendLoading,
    error: frontendError,
  } = useFrontendPoolSnapshot(userId)

  const snapshot = useMemo<PoolCalculationSnapshot>(() => {
    const joinedHistory = getJoinedHistory(latestPayoutRow)
    const cycleHistoryKeys = joinedHistory
      ? Object.keys(joinedHistory).sort()
      : []

    const { value: poolAmount, key: poolAmountKey } = pickNumberFromKeys(
      joinedHistory,
      POOL_AMOUNT_KEYS,
    )
    const {
      value: totalNetworkComputingPower,
      key: totalNetworkKey,
    } = pickNumberFromKeys(joinedHistory, TOTAL_NETWORK_KEYS)

    const latestPayoutUserPower = toNumber(latestPayoutRow?.user_tflops)
    const currentFrontendUserPower =
      frontendSnapshot?.poolTFlops ?? null
    const userComputingPower =
      latestPayoutUserPower ?? currentFrontendUserPower

    const userSharePercentage =
      userComputingPower !== null &&
      totalNetworkComputingPower !== null &&
      totalNetworkComputingPower > 0
        ? (userComputingPower / totalNetworkComputingPower) * 100
        : null

    const estimatedHourlyPayout =
      poolAmount !== null && userSharePercentage !== null
        ? poolAmount * (userSharePercentage / 100)
        : null

    const lastPayoutAmount = toNumber(latestPayoutRow?.reward_amount)
    const lastPayoutDate =
      typeof joinedHistory?.cycle_at === 'string'
        ? joinedHistory.cycle_at
        : null

    const sourceType: SourceType = latestPayoutRow
      ? 'supabase'
      : frontendSnapshot
        ? 'frontend'
        : 'unknown'

    return {
      poolAmount,
      userComputingPower,
      totalNetworkComputingPower,
      userSharePercentage,
      estimatedHourlyPayout,
      lastPayoutAmount,
      lastPayoutDate,
      sourceType,
      isComplete:
        poolAmount !== null &&
        userComputingPower !== null &&
        totalNetworkComputingPower !== null &&
        totalNetworkComputingPower > 0,
      currentFrontendUserComputingPower: currentFrontendUserPower,
      currentFrontendTotalTFlops:
        frontendSnapshot?.totalTFlops ?? null,
      cycleHistoryKeys,
      poolAmountSource: poolAmountKey
        ? `Supabase pool_cycle_history.${poolAmountKey}`
        : 'Not found in latest pool_cycle_history row',
      userComputingPowerSource:
        latestPayoutUserPower !== null
          ? 'Supabase pool_cycle_payouts.user_tflops'
          : currentFrontendUserPower !== null
            ? 'Frontend calculation from Supabase hardware/effects'
            : 'Unavailable',
      totalNetworkSource: totalNetworkKey
        ? `Supabase pool_cycle_history.${totalNetworkKey}`
        : 'Not found in latest pool_cycle_history row',
    }
  }, [frontendSnapshot, latestPayoutRow])

  const loading = payoutLoading || frontendLoading
  const errorMessage = payoutError ?? frontendError

  return (
    <section className="rounded-2xl border border-cyan-500/15 bg-slate-950/55 p-5 backdrop-blur-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-100">
            Pool Calculation Debug
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Read-only audit panel for reward pool inputs and payout sources.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getSourceBadgeClass(snapshot.sourceType)}`}
          >
            Source: {snapshot.sourceType}
          </span>
          <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
            {snapshot.isComplete ? 'Formula complete' : 'Formula incomplete'}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Audit Summary
        </p>
        <div className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <p>
            Wallet balances come from <span className="font-mono text-cyan-300">user_wallets</span> in Supabase.
          </p>
          <p>
            Payout history comes from <span className="font-mono text-cyan-300">pool_cycle_payouts</span> joined with <span className="font-mono text-cyan-300">pool_cycle_history</span>.
          </p>
          <p>
            Current user computing power is recomputed in the frontend from Supabase-backed hardware, catalog stats, conditional effects and combos.
          </p>
          <p>
            No payout RPC or payout function call was found in this repo; the only RPC present is <span className="font-mono text-slate-200">use_battery</span>.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Formula
        </p>
        <div className="mt-3 space-y-2 font-mono text-sm text-slate-200">
          <div>userShare = userComputingPower / totalNetworkComputingPower</div>
          <div>estimatedPayout = poolAmount * userShare</div>
        </div>
        {!snapshot.isComplete && !loading && (
          <p className="mt-3 text-sm text-amber-300">
            Pool calculation data is incomplete
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">poolAmount</p>
          <p className="mt-2 text-xl font-bold text-slate-100">{formatValue(snapshot.poolAmount, 6)}</p>
          <p className="mt-2 text-xs text-slate-500">{snapshot.poolAmountSource}</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">userComputingPower</p>
          <p className="mt-2 text-xl font-bold text-slate-100">{formatValue(snapshot.userComputingPower, 4)}</p>
          <p className="mt-2 text-xs text-slate-500">{snapshot.userComputingPowerSource}</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">totalNetworkComputingPower</p>
          <p className="mt-2 text-xl font-bold text-slate-100">{formatValue(snapshot.totalNetworkComputingPower, 4)}</p>
          <p className="mt-2 text-xs text-slate-500">{snapshot.totalNetworkSource}</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">userSharePercentage</p>
          <p className="mt-2 text-xl font-bold text-slate-100">
            {snapshot.userSharePercentage === null
              ? 'N/A'
              : `${formatValue(snapshot.userSharePercentage, 4)}%`}
          </p>
          <p className="mt-2 text-xs text-slate-500">Computed in frontend from visible values</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">estimatedHourlyPayout</p>
          <p className="mt-2 text-xl font-bold text-slate-100">{formatValue(snapshot.estimatedHourlyPayout, 8)}</p>
          <p className="mt-2 text-xs text-slate-500">poolAmount * userShare</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">lastPayoutAmount</p>
          <p className="mt-2 text-xl font-bold text-slate-100">{formatValue(snapshot.lastPayoutAmount, 8)}</p>
          <p className="mt-2 text-xs text-slate-500">Supabase pool_cycle_payouts.reward_amount</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">lastPayoutDate</p>
          <p className="mt-2 text-base font-semibold text-slate-100">{formatDate(snapshot.lastPayoutDate)}</p>
          <p className="mt-2 text-xs text-slate-500">Latest joined payout cycle timestamp</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">currentFrontendUserPower</p>
          <p className="mt-2 text-xl font-bold text-slate-100">{formatValue(snapshot.currentFrontendUserComputingPower, 4)}</p>
          <p className="mt-2 text-xs text-slate-500">
            Local rack engine using Supabase-backed hardware and effects
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Raw Cycle Field Detection
        </p>
        <div className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <p>
            Joined <span className="font-mono text-cyan-300">pool_cycle_history</span> fields detected:
            <span className="ml-2 font-mono text-slate-400">
              {snapshot.cycleHistoryKeys.length > 0
                ? snapshot.cycleHistoryKeys.join(', ')
                : 'none'}
            </span>
          </p>
          <p>
            Current frontend total TFLOPS:
            <span className="ml-2 font-mono text-slate-200">
              {formatValue(snapshot.currentFrontendTotalTFlops, 4)}
            </span>
          </p>
          <p>
            Crypto prices loaded:
            <span className="ml-2 font-mono text-slate-200">
              {cryptoPricesLoaded ? 'yes' : 'no'}
            </span>
          </p>
          <p>
            Zero price detected:
            <span className="ml-2 font-mono text-slate-200">
              {zeroPriceDetected ? 'yes' : 'no'}
            </span>
          </p>
          <p>
            Withdrawal minimum calculation ready:
            <span className="ml-2 font-mono text-slate-200">
              {withdrawalMinimumCalculationReady ? 'yes' : 'no'}
            </span>
          </p>
        </div>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-slate-400">
          Auditing payout and pool calculation sources...
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 text-sm text-red-300">
          Debug audit warning: {errorMessage}
        </p>
      )}
    </section>
  )
}
