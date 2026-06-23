import { useMemo } from 'react'
import {
  useUserWallet,
  type UserWallet,
} from '../hooks/useUserWallet'
import {
  usePoolPayoutHistory,
  type PoolPayout,
} from '../hooks/usePoolPayoutHistory'
import { useCryptoPrices } from '../hooks/useCryptoPrices'
import {
  canWithdraw,
  getRequiredCryptoAmount,
} from '../utils/withdrawalCalculations'
import PoolCalculationDebug from '../components/PoolCalculationDebug'

const CRYPTO_COLORS = {
  NCR:  { bg: 'bg-emerald-950/40', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  BTC:  { bg: 'bg-orange-950/40',  text: 'text-orange-300',  border: 'border-orange-500/30'  },
  ETH:  { bg: 'bg-purple-950/40',  text: 'text-purple-300',  border: 'border-purple-500/30'  },
  DOGE: { bg: 'bg-yellow-950/40',  text: 'text-yellow-300',  border: 'border-yellow-500/30'  },
  POL:  { bg: 'bg-blue-950/40',    text: 'text-blue-300',    border: 'border-blue-500/30'    },
  BNB:  { bg: 'bg-yellow-900/40',  text: 'text-yellow-200',  border: 'border-yellow-500/30'  },
  USDT: { bg: 'bg-cyan-950/40',    text: 'text-cyan-200',    border: 'border-cyan-500/30'    },
} as const satisfies Record<string, { bg: string; text: string; border: string }>

type CryptoCode = keyof typeof CRYPTO_COLORS
type CryptoColor = (typeof CRYPTO_COLORS)[keyof typeof CRYPTO_COLORS]
type WalletBalanceKey = Exclude<keyof UserWallet, 'id' | 'updated_at'>

interface CryptoBalance {
  name: CryptoCode
  key: WalletBalanceKey
  balance: number
  color: CryptoColor
}

interface WalletPageProps {
  userId: string
}

function getCryptoPrecision(crypto: CryptoCode) {
  if (crypto === 'BTC') return 8
  if (crypto === 'ETH') return 6
  if (crypto === 'USDT') return 2
  return 2
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'N/A'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function getCryptoColor(crypto: string): CryptoColor {
  return CRYPTO_COLORS[crypto as CryptoCode] ?? CRYPTO_COLORS.NCR
}

export default function WalletPage({ userId }: WalletPageProps) {
  const {
    wallet,
    loading: walletLoading,
    error: walletError,
    refresh: refreshWallet,
  } = useUserWallet(userId)

  const {
    payouts,
    loading: payoutsLoading,
    error: payoutsError,
    refresh: refreshPayouts,
  } = usePoolPayoutHistory(userId, 50)

  const {
    pricesBySymbol,
    loading: pricesLoading,
    error: pricesError,
    refresh: refreshPrices,
    cryptoPricesLoaded,
    zeroPriceDetected,
    withdrawalMinimumCalculationReady,
  } = useCryptoPrices()

  const cryptoBalances = useMemo<CryptoBalance[]>(() => {
    if (!wallet) return []
    return [
      { name: 'NCR',  key: 'ncr_balance',  balance: wallet.ncr_balance,  color: CRYPTO_COLORS.NCR  },
      { name: 'BTC',  key: 'btc_balance',  balance: wallet.btc_balance,  color: CRYPTO_COLORS.BTC  },
      { name: 'ETH',  key: 'eth_balance',  balance: wallet.eth_balance,  color: CRYPTO_COLORS.ETH  },
      { name: 'DOGE', key: 'doge_balance', balance: wallet.doge_balance, color: CRYPTO_COLORS.DOGE },
      { name: 'POL',  key: 'pol_balance',  balance: wallet.pol_balance,  color: CRYPTO_COLORS.POL  },
      { name: 'BNB',  key: 'bnb_balance',  balance: wallet.bnb_balance,  color: CRYPTO_COLORS.BNB  },
      { name: 'USDT', key: 'usdt_balance', balance: wallet.usdt_balance, color: CRYPTO_COLORS.USDT },
    ]
  }, [wallet])

  const hasWalletRow = wallet !== null
  const walletUnavailable = !walletLoading && !hasWalletRow
  const hasWalletBalances = cryptoBalances.some((c) => c.balance > 0)
  const showBalanceSkeleton = walletLoading && !hasWalletRow

  const walletStatusTone = walletError
    ? 'border-red-500/30 bg-red-500/10 text-red-200'
    : walletUnavailable
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200'

  const totalEarned = useMemo(() => {
    const grouped = new Map<string, number>()
    payouts.forEach((payout: PoolPayout) => {
      const current = grouped.get(payout.crypto) || 0
      grouped.set(payout.crypto, current + payout.reward_amount)
    })
    return grouped
  }, [payouts])

  const handleRefresh = async () => {
    await Promise.all([refreshWallet(), refreshPayouts(), refreshPrices()])
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-100">Wallets</h1>
          <p className="mt-1 text-sm text-slate-400">Your crypto balances and earning history</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={walletLoading || payoutsLoading || pricesLoading}
          className="px-4 py-2 rounded-lg border border-slate-600/50 bg-slate-900/50 text-sm font-medium text-slate-300 transition hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {walletLoading || payoutsLoading || pricesLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Wallet status banner */}
      <div className={`rounded-xl border px-4 py-3 text-sm ${walletStatusTone}`}>
        {walletLoading && !hasWalletRow ? (
          <p>Loading wallet balances...</p>
        ) : walletError ? (
          <p>Wallet data could not be loaded: {walletError}</p>
        ) : walletUnavailable ? (
          <p>No wallet record found for this user.</p>
        ) : hasWalletBalances ? (
          <p>Wallet balances are live and ready for withdrawal validation.</p>
        ) : (
          <p>Wallet loaded successfully. All balances are currently at zero.</p>
        )}
      </div>

      {payoutsError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Payout history could not be loaded: {payoutsError}
        </div>
      )}

      {pricesError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {pricesError}
        </div>
      )}

      {/* Wallet Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {showBalanceSkeleton ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={`skel-${i}`} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
              <div className="h-4 w-20 animate-pulse rounded bg-slate-700/70" />
              <div className="mt-6 h-8 w-32 animate-pulse rounded bg-slate-700/60" />
            </div>
          ))
        ) : hasWalletRow ? (
          cryptoBalances.map((crypto) => {
            const priceEntry = pricesBySymbol[crypto.name]
            const minWithdrawal = priceEntry?.minWithdrawal ?? 0
            const isWithdrawReady = canWithdraw(
              crypto.balance,
              null,
              0,
              crypto.name,
              minWithdrawal,
            )
            const requiredAmount = getRequiredCryptoAmount(
              0,
              null,
              crypto.name,
              minWithdrawal,
            )
            const precision = getCryptoPrecision(crypto.name)

            const withdrawLabel = isWithdrawReady
              ? 'Withdraw validation ready'
              : `Min ${requiredAmount?.toFixed(precision) ?? '—'} ${crypto.name} not met`

            return (
              <div
                key={crypto.name}
                className={`rounded-lg border ${crypto.color.border} ${crypto.color.bg} p-4 backdrop-blur-sm`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-sm font-bold uppercase tracking-wider ${crypto.color.text}`}>
                    {crypto.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    Earned:{' '}
                    <span className={crypto.color.text}>
                      {(totalEarned.get(crypto.name) || 0).toFixed(
                        crypto.name === 'BTC' ? 8 : crypto.name === 'ETH' ? 6 : 2
                      )}
                    </span>
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Current Balance</p>
                    <p className={`text-2xl font-bold ${crypto.color.text}`}>
                      {crypto.balance.toFixed(precision)}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Min Withdraw</span>
                      <span className={crypto.color.text}>
                        {requiredAmount !== null
                          ? `${requiredAmount.toFixed(precision)} ${crypto.name}`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-slate-200">
                        {requiredAmount
                          ? `${Math.min(100, Math.round((crypto.balance / requiredAmount) * 100))}%`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Last updated</span>
                      <span className="text-slate-200">
                        {formatDateTime(priceEntry?.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {requiredAmount && requiredAmount > 0 && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (crypto.balance / requiredAmount) * 100)}%`,
                          background: isWithdrawReady
                            ? 'linear-gradient(90deg, #059669, #34d399)'
                            : 'linear-gradient(90deg, #1e40af, #3b82f6)',
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      disabled
                      className={`w-full px-3 py-1.5 rounded-md border text-xs font-medium transition disabled:cursor-not-allowed ${
                        isWithdrawReady
                          ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200 disabled:opacity-80'
                          : 'border-slate-600/30 bg-slate-900/30 text-slate-300 disabled:opacity-60'
                      }`}
                    >
                      {withdrawLabel}
                    </button>
                    <p className="text-[10px] text-slate-500">
                      Real withdrawals coming soon.
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="lg:col-span-3 rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 text-sm text-slate-300">
            No balance rows available yet for this user.
          </div>
        )}
      </div>

      <PoolCalculationDebug
        userId={userId}
        cryptoPricesLoaded={cryptoPricesLoaded}
        zeroPriceDetected={zeroPriceDetected}
        withdrawalMinimumCalculationReady={withdrawalMinimumCalculationReady}
      />

      {/* Payout History */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100">Recent Payouts</h2>

        {payoutsLoading ? (
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-8 text-center text-slate-400">
            Loading history...
          </div>
        ) : payouts.length === 0 ? (
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-8 text-center text-slate-400">
            No payouts yet. Keep your racks running to earn!
          </div>
        ) : (
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 overflow-hidden">
            <div className="custom-scrollbar overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">Crypto</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-400">Amount</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-400">TFlops</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-400">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout: PoolPayout) => {
                    const color = getCryptoColor(payout.crypto)
                    const date = payout.created_at ? new Date(payout.created_at) : null
                    const precision = payout.crypto === 'BTC' ? 8 : payout.crypto === 'ETH' ? 6 : 2

                    return (
                      <tr key={payout.id} className="border-b border-slate-700/25 hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${color.text}`}>{payout.crypto}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                          +{payout.reward_amount.toFixed(precision)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {payout.user_tflops.toFixed(1)} TF
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 text-xs">
                          {date ? date.toLocaleString() : 'Unknown'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}