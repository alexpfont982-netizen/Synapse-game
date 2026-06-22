import type { RealtimePostgresUpdatePayload } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../../../supabaseClient'

export interface UserWallet {
  id: string
  ncr_balance: number
  btc_balance: number
  eth_balance: number
  doge_balance: number
  pol_balance: number
  bnb_balance: number
  updated_at: string
}

type UserWalletUpdatePayload = RealtimePostgresUpdatePayload<UserWallet>

export function useUserWallet(userId: string) {
  const [wallet, setWallet] = useState<UserWallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchWallet = async () => {
      try {
        setLoading(true)
        const { data, error: err } = await supabase
          .from('user_wallets')
          .select('*')
          .eq('id', userId)
          .single()

        if (err) throw err
        setWallet(data as UserWallet)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching wallet')
        setWallet(null)
      } finally {
        setLoading(false)
      }
    }

    fetchWallet()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`wallet:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_wallets',
          filter: `id=eq.${userId}`,
        },
        (payload: UserWalletUpdatePayload) => {
          setWallet(payload.new)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const refresh = async () => {
    if (!userId) return
    try {
      const { data, error: err } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('id', userId)
        .single()
      if (err) throw err
      setWallet(data as UserWallet)
    } catch (err) {
      console.error('Failed to refresh wallet:', err)
    }
  }

  return { wallet, loading, error, refresh }
}
