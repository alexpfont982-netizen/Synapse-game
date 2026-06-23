import { createClient } from 'jsr:@supabase/supabase-js@2'

type PriceSource = 'coingecko' | 'internal_fixed'

interface CryptoConfig {
  symbol: string
  coingeckoId: string
}

interface CryptoPriceRow {
  crypto: string
  usd_price: number
  price_source: PriceSource
  updated_at: string
}

const COINGECKO_COINS: CryptoConfig[] = [
  { symbol: 'BTC', coingeckoId: 'bitcoin' },
  { symbol: 'ETH', coingeckoId: 'ethereum' },
  { symbol: 'DOGE', coingeckoId: 'dogecoin' },
  { symbol: 'POL', coingeckoId: 'polygon-ecosystem-token' },
  { symbol: 'BNB', coingeckoId: 'binancecoin' },
  { symbol: 'USDT', coingeckoId: 'tether' },
]

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status: number = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })
}

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function getCoinGeckoAttempts(apiKey: string | null, ids: string) {
  const params = new URLSearchParams({
    ids,
    vs_currencies: 'usd',
    include_last_updated_at: 'true',
  })

  const attempts: Array<{
    url: string
    headers: HeadersInit
    mode: 'pro' | 'demo' | 'public'
  }> = []

  if (apiKey) {
    attempts.push({
      url: `https://pro-api.coingecko.com/api/v3/simple/price?${params.toString()}`,
      headers: { 'x-cg-pro-api-key': apiKey },
      mode: 'pro',
    })
    attempts.push({
      url: `https://api.coingecko.com/api/v3/simple/price?${params.toString()}`,
      headers: { 'x-cg-demo-api-key': apiKey },
      mode: 'demo',
    })
  }

  // Fallback only. Ideal: set COINGECKO_API_KEY as a Supabase secret.
  attempts.push({
    url: `https://api.coingecko.com/api/v3/simple/price?${params.toString()}`,
    headers: {},
    mode: 'public',
  })

  return attempts
}

async function fetchCoinGeckoPrices(apiKey: string | null) {
  const ids = COINGECKO_COINS.map((coin) => coin.coingeckoId).join(',')
  const attempts = getCoinGeckoAttempts(apiKey, ids)

  let lastError: string | null = null

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: 'GET',
        headers: attempt.headers,
      })

      if (!response.ok) {
        lastError = `${attempt.mode} mode failed with status ${response.status}`
        console.error(`[update-crypto-prices] ${lastError}`)
        continue
      }

      const payload = await response.json()
      return {
        payload: payload as Record<string, { usd?: number; last_updated_at?: number }>,
        mode: attempt.mode,
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown CoinGecko fetch error'
      console.error(`[update-crypto-prices] ${attempt.mode} mode exception:`, error)
    }
  }

  throw new Error(lastError ?? 'CoinGecko price request failed')
}

async function persistPriceRow(
  supabaseAdmin: ReturnType<typeof createClient>,
  row: CryptoPriceRow,
) {
  const { error: upsertError } = await supabaseAdmin
    .from('crypto_prices')
    .upsert(row, {
      onConflict: 'crypto',
      ignoreDuplicates: false,
    })

  if (!upsertError) {
    return 'upsert'
  }

  console.error(
    `[update-crypto-prices] Upsert failed for ${row.crypto}, falling back to update/insert:`,
    upsertError,
  )

  const { data: existingRows, error: selectError } = await supabaseAdmin
    .from('crypto_prices')
    .select('crypto')
    .eq('crypto', row.crypto)

  if (selectError) throw selectError

  if ((existingRows ?? []).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('crypto_prices')
      .update(row)
      .eq('crypto', row.crypto)

    if (updateError) throw updateError
    return 'update'
  }

  const { error: insertError } = await supabaseAdmin
    .from('crypto_prices')
    .insert(row)

  if (insertError) throw insertError
  return 'insert'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const coinGeckoApiKey = Deno.env.get('COINGECKO_API_KEY') ?? null

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[update-crypto-prices] Missing Supabase secrets')
    return jsonResponse(
      { ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
      500,
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const updatedAt = new Date().toISOString()
  const results: Array<Record<string, unknown>> = []

  try {
    const ncrRow: CryptoPriceRow = {
      crypto: 'NCR',
      usd_price: 1,
      price_source: 'internal_fixed',
      updated_at: updatedAt,
    }

    const ncrOperation = await persistPriceRow(supabaseAdmin, ncrRow)
    results.push({
      symbol: 'NCR',
      status: ncrOperation,
      price_usd: 1,
      source: 'internal_fixed',
    })

    let geckoPayload: Record<string, { usd?: number; last_updated_at?: number }> | null = null
    let geckoMode: 'pro' | 'demo' | 'public' | null = null

    try {
      const geckoResult = await fetchCoinGeckoPrices(coinGeckoApiKey)
      geckoPayload = geckoResult.payload
      geckoMode = geckoResult.mode
    } catch (error) {
      console.error('[update-crypto-prices] CoinGecko fetch failed:', error)
    }

    for (const coin of COINGECKO_COINS) {
      const rawPrice = geckoPayload?.[coin.coingeckoId]?.usd
      const rawUpdatedAt = geckoPayload?.[coin.coingeckoId]?.last_updated_at

      if (!isValidPrice(rawPrice)) {
        console.error(
          `[update-crypto-prices] Skipping ${coin.symbol}; invalid CoinGecko price:`,
          rawPrice,
        )
        results.push({
          symbol: coin.symbol,
          status: 'skipped',
          reason: 'invalid_or_missing_price',
        })
        continue
      }

      const row: CryptoPriceRow = {
        crypto: coin.symbol,
        usd_price: rawPrice,
        price_source: 'coingecko',
        updated_at:
          typeof rawUpdatedAt === 'number' && Number.isFinite(rawUpdatedAt)
            ? new Date(rawUpdatedAt * 1000).toISOString()
            : updatedAt,
      }

      const operation = await persistPriceRow(supabaseAdmin, row)
      results.push({
        symbol: coin.symbol,
        status: operation,
        price_usd: rawPrice,
        source: 'coingecko',
      })
    }

    const successfulCoinGeckoUpdates = results.filter(
      (result) => result.source === 'coingecko' && result.status !== 'skipped',
    ).length

    return jsonResponse({
      ok: true,
      updated_at: updatedAt,
      coingecko_mode: geckoMode,
      successful_coin_updates: successfulCoinGeckoUpdates,
      results,
    })
  } catch (error) {
    console.error('[update-crypto-prices] Unhandled error:', error)
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unhandled function error',
        results,
      },
      500,
    )
  }
})
