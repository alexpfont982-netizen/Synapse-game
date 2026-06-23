import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import { getSupabaseErrorMessage } from '../utils/supabaseError'

export const TRACKED_CRYPTO_SYMBOLS = [
  'NCR',
  'BTC',
  'ETH',
  'DOGE',
  'POL',
  'BNB',
  'USDT',
] as const

export type TrackedCryptoSymbol = (typeof TRACKED_CRYPTO_SYMBOLS)[number]

export interface CryptoPriceEntry {
  symbol: string
  priceUsd: number | null        // mantenemos el campo por compatibilidad con WalletPage
  minWithdrawal: number          // mínimo de retiro fijo en unidades de la cripto
  source: string
  updatedAt: string | null
  priceAvailable: boolean        // siempre true — no dependemos de precios externos
}

export function useCryptoPrices(
  symbols: readonly string[] = TRACKED_CRYPTO_SYMBOLS,
) {
  const [prices, setPrices]   = useState<CryptoPriceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)

      const { data, error: queryError } = await supabase
        .from('crypto_prices')
        .select('crypto, usd_price, min_withdrawal, price_source, updated_at')
        .in('crypto', [...symbols])
        .order('crypto', { ascending: true })

      if (queryError) throw queryError

      const nextPrices: CryptoPriceEntry[] = (data ?? []).map((row) => ({
        symbol:         row.crypto,
        priceUsd:       row.usd_price !== null ? Number(row.usd_price) : null,
        minWithdrawal:  Number(row.min_withdrawal ?? 0),
        source:         row.price_source ?? 'internal_fixed',
        updatedAt:      row.updated_at,
        priceAvailable: true, // no dependemos de precios externos
      }))

      setPrices(nextPrices)
      setError(null)
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to load crypto prices'))
      setPrices([])
    } finally {
      setLoading(false)
    }
  }, [symbols])

  useEffect(() => { refresh() }, [refresh])

  const pricesBySymbol = useMemo<Record<string, CryptoPriceEntry>>(
    () =>
      prices.reduce<Record<string, CryptoPriceEntry>>((acc, price) => {
        acc[price.symbol] = price
        return acc
      }, {}),
    [prices],
  )

  const cryptoPricesLoaded = useMemo(
    () => symbols.every((s) => pricesBySymbol[s] !== undefined),
    [pricesBySymbol, symbols],
  )

  // Ya no hay "zero price detected" porque no usamos precios externos
  const zeroPriceDetected = false

  // Listo cuando todos los símbolos están cargados desde Supabase
  const withdrawalMinimumCalculationReady = cryptoPricesLoaded

  return {
    prices,
    pricesBySymbol,
    loading,
    error,
    refresh,
    cryptoPricesLoaded,
    zeroPriceDetected,
    withdrawalMinimumCalculationReady,
  }
}