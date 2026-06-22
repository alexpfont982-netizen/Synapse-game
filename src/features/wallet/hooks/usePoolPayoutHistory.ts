import { useEffect, useState } from 'react'
import { supabase } from '../../../supabaseClient'

export interface PoolPayout {
  id: string
  cycle_id: string
  user_id: string
  user_tflops: number
  reward_amount: number
  crypto: string
  created_at?: string
}

interface PoolCycleHistoryRow {
  crypto: string | null
  created_at: string | null
}

interface PoolPayoutQueryRow {
  id: string
  cycle_id: string
  user_id: string
  user_tflops: number
  reward_amount: number
  pool_cycle_history: PoolCycleHistoryRow | PoolCycleHistoryRow[] | null
}

function getPoolCycleHistory(
  payout: PoolPayoutQueryRow,
): PoolCycleHistoryRow | null {
  if (Array.isArray(payout.pool_cycle_history)) {
    return payout.pool_cycle_history[0] ?? null
  }

  return payout.pool_cycle_history
}

function mapPoolPayout(payout: PoolPayoutQueryRow): PoolPayout {
  const history = getPoolCycleHistory(payout)

  return {
    id: payout.id,
    cycle_id: payout.cycle_id,
    user_id: payout.user_id,
    user_tflops: payout.user_tflops,
    reward_amount: payout.reward_amount,
    crypto: history?.crypto ?? 'UNKNOWN',
    created_at: history?.created_at ?? undefined,
  }
}

function mapPoolPayouts(
  payouts: PoolPayoutQueryRow[] | null | undefined,
): PoolPayout[] {
  return (payouts ?? []).map(mapPoolPayout)
}

export function usePoolPayoutHistory(userId: string, limit: number = 50) {
  const [payouts, setPayouts] = useState<PoolPayout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchPayouts = async () => {
      try {
        setLoading(true)
        // Join pool_cycle_payouts with pool_cycle_history to get crypto and timestamps
        const { data, error: err } = await supabase
          .from('pool_cycle_payouts')
          .select(`
            id,
            cycle_id,
            user_id,
            user_tflops,
            reward_amount,
            pool_cycle_history!inner (
              crypto,
              created_at
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { foreignTable: 'pool_cycle_history', ascending: false })
          .limit(limit)

        if (err) throw err

        // Flatten the data
        const flattened = mapPoolPayouts(data as PoolPayoutQueryRow[] | null)

        setPayouts(flattened)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching payouts')
        setPayouts([])
      } finally {
        setLoading(false)
      }
    }

    fetchPayouts()

    // Subscribe to new payouts
    const subscription = supabase
      .channel(`payouts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pool_cycle_payouts',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchPayouts()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId, limit])

  const refresh = async () => {
    if (!userId) return
    try {
      const { data, error: err } = await supabase
        .from('pool_cycle_payouts')
        .select(`
          id,
          cycle_id,
          user_id,
          user_tflops,
          reward_amount,
          pool_cycle_history!inner (
            crypto,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { foreignTable: 'pool_cycle_history', ascending: false })
        .limit(limit)

      if (err) throw err

      const flattened = mapPoolPayouts(data as PoolPayoutQueryRow[] | null)

      setPayouts(flattened)
    } catch (err) {
      console.error('Failed to refresh payouts:', err)
    }
  }

  return { payouts, loading, error, refresh }
}
