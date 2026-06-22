import { useMemo } from 'react'
import {
  useUserWallet,
  type UserWallet,
} from '../hooks/useUserWallet'
import {
  usePoolPayoutHistory,
  type PoolPayout,
} from '../hooks/usePoolPayoutHistory'
import PoolCalculationDebug from '../components/PoolCalculationDebug'

const CRYPTO_COLORS = {
  NCR: { bg: 'bg-emerald-950/40', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  BTC: { bg: 'bg-orange-950/40', text: 'text-orange-300', border: 'border-orange-500/30' },
  ETH: { bg: 'bg-purple-950/40', text: 'text-purple-300', border: 'border-purple-500/30' },
  DOGE: { bg: 'bg-yellow-950/40', text: 'text-yellow-300', border: 'border-yellow-500/30' },
  POL: { bg: 'bg-blue-950/40', text: 'text-blue-300', border: 'border-blue-500/30' },
  BNB: { bg: 'bg-yellow-900/40', text: 'text-yellow-200', border: 'border-yellow-500/30' },
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

function getCryptoColor(crypto: string): CryptoColor {
  return CRYPTO_COLORS[crypto as CryptoCode] ?? CRYPTO_COLORS.NCR
}

export default function WalletPage({ userId }: WalletPageProps) {
  const { wallet, loading: walletLoading, refresh: refreshWallet } = useUserWallet(userId)
  const { payouts, loading: payoutsLoading, refresh: refreshPayouts } = usePoolPayoutHistory(userId, 50)

  const cryptoBalances = useMemo<CryptoBalance[]>(() => {
    if (!wallet) return []
    return [
      { name: 'NCR', key: 'ncr_balance', balance: wallet.ncr_balance, color: CRYPTO_COLORS.NCR },
      { name: 'BTC', key: 'btc_balance', balance: wallet.btc_balance, color: CRYPTO_COLORS.BTC },
      { name: 'ETH', key: 'eth_balance', balance: wallet.eth_balance, color: CRYPTO_COLORS.ETH },
      { name: 'DOGE', key: 'doge_balance', balance: wallet.doge_balance, color: CRYPTO_COLORS.DOGE },
      { name: 'POL', key: 'pol_balance', balance: wallet.pol_balance, color: CRYPTO_COLORS.POL },
      { name: 'BNB', key: 'bnb_balance', balance: wallet.bnb_balance, color: CRYPTO_COLORS.BNB },
    ]
  }, [wallet])

  const totalEarned = useMemo(() => {
    const grouped = new Map<string, number>()
    payouts.forEach((payout: PoolPayout) => {
      const current = grouped.get(payout.crypto) || 0
      grouped.set(payout.crypto, current + payout.reward_amount)
    })
    return grouped
  }, [payouts])

  const handleRefresh = async () => {
    await Promise.all([refreshWallet(), refreshPayouts()])
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
          disabled={walletLoading || payoutsLoading}
          className="px-4 py-2 rounded-lg border border-slate-600/50 bg-slate-900/50 text-sm font-medium text-slate-300 transition hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {walletLoading || payoutsLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Wallet Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cryptoBalances.map((crypto) => (
          <div
            key={crypto.name}
            className={`rounded-lg border ${crypto.color.border} ${crypto.color.bg} p-4 backdrop-blur-sm`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className={`text-sm font-bold uppercase tracking-wider ${crypto.color.text}`}>
                {crypto.name}
              </span>
              <span className="text-xs text-slate-400">
                {crypto.name === 'NCR' ? 'Earned: ' : 'Earned: '}
                <span className={crypto.color.text}>
                  {(totalEarned.get(crypto.name) || 0).toFixed(crypto.name === 'BTC' ? 6 : crypto.name === 'ETH' ? 4 : 2)}
                </span>
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-400 mb-1">Current Balance</p>
                <p className={`text-2xl font-bold ${crypto.color.text}`}>
                  {crypto.balance.toFixed(crypto.name === 'BTC' ? 8 : crypto.name === 'ETH' ? 6 : 2)}
                </p>
              </div>
              {crypto.balance > 0 && (
                <button className="w-full mt-3 px-3 py-1.5 rounded-md border border-slate-600/30 bg-slate-900/30 text-xs font-medium text-slate-300 transition hover:bg-slate-800/50">
                  Withdraw
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <PoolCalculationDebug userId={userId} />

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
                    const timeStr = date ? date.toLocaleString() : 'Unknown'
                    const isPrecision = payout.crypto === 'BTC' ? 8 : payout.crypto === 'ETH' ? 6 : 2

                    return (
                      <tr key={payout.id} className="border-b border-slate-700/25 hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${color.text}`}>
                            {payout.crypto}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                          +{payout.reward_amount.toFixed(isPrecision)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {payout.user_tflops.toFixed(1)} TF
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 text-xs">
                          {timeStr}
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
