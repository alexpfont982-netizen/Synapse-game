// Mínimos de retiro fijos por cripto (en unidades de cada cripto)
// Se actualizan en crypto_prices.min_withdrawal en Supabase cuando sea necesario.
export const WITHDRAWAL_MINIMUMS: Record<string, number> = {
  NCR:  30,
  BTC:  0.0005,
  ETH:  0.02,
  DOGE: 300,
  POL:  120,
  BNB:  0.05,
  USDT: 30,
}

// Mantenemos esta constante por compatibilidad con WalletPage
// (ya no se usa para cálculos, solo como referencia informativa)
export const MINIMUM_WITHDRAW_USD = 30

// Retorna el mínimo de retiro en unidades de la cripto
// Usa el valor de Supabase si está disponible, fallback al hardcodeado
export function getRequiredCryptoAmount(
  _minUsd: number,           // mantenemos firma por compatibilidad
  _priceUsd: number | null | undefined,  // ya no se usa
  crypto?: string,
  minWithdrawal?: number,    // valor desde Supabase (crypto_prices.min_withdrawal)
): number | null {
  if (minWithdrawal !== undefined && minWithdrawal > 0) return minWithdrawal
  if (crypto && WITHDRAWAL_MINIMUMS[crypto]) return WITHDRAWAL_MINIMUMS[crypto]
  return null
}

// Retorna el valor USD estimado — ahora es null porque no usamos precios externos
// Mantenemos la función por compatibilidad con WalletPage
export function getUsdValue(
  _amount: number | null | undefined,
  _priceUsd: number | null | undefined,
): number | null {
  return null
}

// Verifica si el balance supera el mínimo fijo de retiro
export function canWithdraw(
  amount: number | null | undefined,
  _priceUsd: number | null | undefined,  // ya no se usa
  _minUsd: number,                        // ya no se usa
  crypto?: string,
  minWithdrawal?: number,
): boolean {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return false

  // Usa el mínimo de Supabase si está disponible
  if (minWithdrawal !== undefined && minWithdrawal > 0) return amount >= minWithdrawal

  // Fallback al mínimo hardcodeado
  if (crypto && WITHDRAWAL_MINIMUMS[crypto]) return amount >= WITHDRAWAL_MINIMUMS[crypto]

  return false
}