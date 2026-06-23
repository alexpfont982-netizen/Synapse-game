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
  usdt_balance: number
  updated_at: string
}

interface UserWalletRow {
  id: unknown
  ncr_balance?: unknown
  btc_balance?: unknown
  eth_balance?: unknown
  doge_balance?: unknown
  pol_balance?: unknown
  bnb_balance?: unknown
  usdt_balance?: unknown
  updated_at?: unknown
}

type UserWalletUpdatePayload = RealtimePostgresUpdatePayload<UserWalletRow>

function toBalance(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function mapUserWalletRow(row: UserWalletRow | null | undefined): UserWallet | null {
  if (!row || typeof row.id !== 'string') {
    return null
  }

  return {
    id: row.id,
    ncr_balance: toBalance(row.ncr_balance),
    btc_balance: toBalance(row.btc_balance),
    eth_balance: toBalance(row.eth_balance),
    doge_balance: toBalance(row.doge_balance),
    pol_balance: toBalance(row.pol_balance),
    bnb_balance: toBalance(row.bnb_balance),
    usdt_balance: toBalance(row.usdt_balance),
    updated_at:
      typeof row.updated_at === 'string'
        ? row.updated_at
        : new Date(0).toISOString(),
  }
}

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
        const nextWallet = mapUserWalletRow(data as UserWalletRow | null)
        if (!nextWallet) {
          throw new Error('Wallet row is missing required fields')
        }
        setWallet(nextWallet)
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
          const nextWallet = mapUserWalletRow(payload.new)
          if (nextWallet) {
            setWallet(nextWallet)
          }
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
      const nextWallet = mapUserWalletRow(data as UserWalletRow | null)
      if (!nextWallet) {
        throw new Error('Wallet row is missing required fields')
      }
      setWallet(nextWallet)
    } catch (err) {
      console.error('Failed to refresh wallet:', err)
    }
  }

  return { wallet, loading, error, refresh }
}
