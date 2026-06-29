import { useMemo, useState } from 'react'
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
import { ArrowDownToLine, History, RefreshCw, ChevronRight } from 'lucide-react'

const CRYPTO_COLORS = {
  NCR:  { bg: 'bg-emerald-950/40', text: 'text-emerald-300', border: 'border-emerald-500/30', accent: '#34d399' },
  BTC:  { bg: 'bg-orange-950/40',  text: 'text-orange-300',  border: 'border-orange-500/30',  accent: '#fb923c' },
  ETH:  { bg: 'bg-purple-950/40',  text: 'text-purple-300',  border: 'border-purple-500/30',  accent: '#c084fc' },
  DOGE: { bg: 'bg-yellow-950/40',  text: 'text-yellow-300',  border: 'border-yellow-500/30',  accent: '#fde047' },
  POL:  { bg: 'bg-blue-950/40',    text: 'text-blue-300',    border: 'border-blue-500/30',    accent: '#60a5fa' },
  BNB:  { bg: 'bg-yellow-900/40',  text: 'text-yellow-200',  border: 'border-yellow-500/30',  accent: '#fef08a' },
  USDT: { bg: 'bg-cyan-950/40',    text: 'text-cyan-200',    border: 'border-cyan-500/30',    accent: '#67e8f9' },
} as const satisfies Record<string, { bg: string; text: string; border: string; accent: string }>

type CryptoCode = keyof typeof CRYPTO_COLORS
type WalletBalanceKey = Exclude<keyof UserWallet, 'id' | 'updated_at'>

interface CryptoBalance {
  name: CryptoCode
  key: WalletBalanceKey
  balance: number
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

const CRYPTO_LIST: { name: CryptoCode; key: WalletBalanceKey }[] = [
  { name: 'NCR',  key: 'ncr_balance'  },
  { name: 'BTC',  key: 'btc_balance'  },
  { name: 'ETH',  key: 'eth_balance'  },
  { name: 'DOGE', key: 'doge_balance' },
  { name: 'POL',  key: 'pol_balance'  },
  { name: 'BNB',  key: 'bnb_balance'  },
  { name: 'USDT', key: 'usdt_balance' },
]

type TabType = 'history' | 'withdrawals'

export default function WalletPage({ userId }: WalletPageProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCode | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('history')

  const { wallet, loading: walletLoading, refresh: refreshWallet } = useUserWallet(userId)
  const { payouts, loading: payoutsLoading, refresh: refreshPayouts } = usePoolPayoutHistory(userId, 100)
  const {
    pricesBySymbol,
    loading: pricesLoading,
    refresh: refreshPrices,
    cryptoPricesLoaded,
    zeroPriceDetected,
    withdrawalMinimumCalculationReady,
  } = useCryptoPrices()

  const cryptoBalances = useMemo<CryptoBalance[]>(() => {
    if (!wallet) return []
    return CRYPTO_LIST.map(c => ({ name: c.name, key: c.key, balance: wallet[c.key] as number }))
  }, [wallet])

  const totalEarned = useMemo(() => {
    const grouped = new Map<string, number>()
    payouts.forEach((p: PoolPayout) => {
      grouped.set(p.crypto, (grouped.get(p.crypto) || 0) + p.reward_amount)
    })
    return grouped
  }, [payouts])

  const handleRefresh = async () => {
    await Promise.all([refreshWallet(), refreshPayouts(), refreshPrices()])
  }

  const selected = selectedCrypto
    ? cryptoBalances.find(c => c.name === selectedCrypto) ?? null
    : null

  const selectedColor = selectedCrypto ? CRYPTO_COLORS[selectedCrypto] : null
  const selectedPrecision = selectedCrypto ? getCryptoPrecision(selectedCrypto) : 2
  const selectedPriceEntry = selectedCrypto ? pricesBySymbol[selectedCrypto] : null
  const selectedMinWithdrawal = selectedPriceEntry?.minWithdrawal ?? 0
  const selectedIsReady = selected
    ? canWithdraw(selected.balance, null, 0, selectedCrypto!, selectedMinWithdrawal)
    : false
  const selectedRequired = selected
    ? getRequiredCryptoAmount(0, null, selectedCrypto!, selectedMinWithdrawal)
    : null
  const selectedEarned = selectedCrypto ? (totalEarned.get(selectedCrypto) || 0) : 0

  const filteredPayouts = selectedCrypto
    ? payouts.filter((p: PoolPayout) => p.crypto === selectedCrypto)
    : payouts

  return (
    <div className="w-full max-w-6xl mx-auto p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-100">Wallets</h1>
          <p className="mt-1 text-sm text-slate-400">Your crypto balances and earning history</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={walletLoading || payoutsLoading || pricesLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600/50 bg-slate-900/50 text-sm font-medium text-slate-300 transition hover:bg-slate-800/50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${(walletLoading || payoutsLoading) ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex gap-6">

        {/* Left — Crypto list */}
        <div className="w-64 shrink-0 space-y-1.5">
          {walletLoading ? (
            Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-[14px] bg-slate-800/40" />
            ))
          ) : (
            cryptoBalances.map(crypto => {
              const color = CRYPTO_COLORS[crypto.name]
              const precision = getCryptoPrecision(crypto.name)
              const isSelected = selectedCrypto === crypto.name
              const priceEntry = pricesBySymbol[crypto.name]
              const minW = priceEntry?.minWithdrawal ?? 0
              const isReady = canWithdraw(crypto.balance, null, 0, crypto.name, minW)

              return (
                <button
                  key={crypto.name}
                  type="button"
                  onClick={() => setSelectedCrypto(prev => prev === crypto.name ? null : crypto.name)}
                  className={`w-full flex items-center justify-between rounded-[14px] border px-3.5 py-3 text-left transition ${
                    isSelected
                      ? `${color.border} ${color.bg}`
                      : 'border-white/[0.06] bg-slate-900/40 hover:border-white/[0.12] hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black"
                      style={{ background: `${CRYPTO_COLORS[crypto.name].accent}22`, color: CRYPTO_COLORS[crypto.name].accent }}
                    >
                      {crypto.name.slice(0, 1)}
                    </div>
                    <div>
                      <p className={`text-[12px] font-bold ${isSelected ? color.text : 'text-slate-200'}`}>
                        {crypto.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {crypto.balance.toFixed(precision)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isReady && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                    )}
                    <ChevronRight className={`h-3.5 w-3.5 transition ${isSelected ? color.text : 'text-slate-600'}`} />
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Right — Detail panel */}
        <div className="flex-1 min-w-0">
          {!selectedCrypto ? (
            <div className="flex h-64 items-center justify-center rounded-[20px] border border-white/[0.06] bg-slate-900/40 text-slate-500 text-sm">
              Select a currency to view details
            </div>
          ) : (
            <div className="space-y-4">

              {/* Balance card */}
              <div className={`rounded-[20px] border ${selectedColor!.border} ${selectedColor!.bg} p-5`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${selectedColor!.text}`}>
                      {selectedCrypto}
                    </p>
                    <p className={`mt-1 text-4xl font-black ${selectedColor!.text}`}>
                      {selected?.balance.toFixed(selectedPrecision)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Total earned: <span className={selectedColor!.text}>{selectedEarned.toFixed(selectedPrecision)}</span>
                    </p>
                  </div>

                  {/* Withdraw button */}
                  <button
                    type="button"
                    disabled
                    className={`flex items-center gap-2 rounded-[14px] border px-4 py-2.5 text-[12px] font-semibold transition disabled:cursor-not-allowed ${
                      selectedIsReady
                        ? `${selectedColor!.border} ${selectedColor!.bg} ${selectedColor!.text} disabled:opacity-90`
                        : 'border-slate-600/30 bg-slate-900/30 text-slate-500 disabled:opacity-60'
                    }`}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    {selectedIsReady ? 'Withdraw' : 'Withdraw'}
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-slate-400">
                      Min withdrawal: <span className={selectedColor!.text}>
                        {selectedRequired?.toFixed(selectedPrecision)} {selectedCrypto}
                      </span>
                    </span>
                    <span className="text-slate-300">
                      {selectedRequired
                        ? `${Math.min(100, Math.round(((selected?.balance ?? 0) / selectedRequired) * 100))}%`
                        : '—'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: selectedRequired
                          ? `${Math.min(100, ((selected?.balance ?? 0) / selectedRequired) * 100)}%`
                          : '0%',
                        background: selectedIsReady
                          ? `linear-gradient(90deg, ${selectedColor!.accent}88, ${selectedColor!.accent})`
                          : 'linear-gradient(90deg, #1e40af, #3b82f6)',
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-500">
                    Last updated: {formatDateTime(selectedPriceEntry?.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 rounded-[14px] border border-white/[0.06] bg-slate-900/40 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] py-2 text-[12px] font-semibold transition ${
                    activeTab === 'history'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('withdrawals')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] py-2 text-[12px] font-semibold transition ${
                    activeTab === 'withdrawals'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Withdrawals
                </button>
              </div>

              {/* Tab content */}
              {activeTab === 'history' && (
                <div className="rounded-[16px] border border-white/[0.06] bg-slate-900/40 overflow-hidden">
                  {payoutsLoading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading history...</div>
                  ) : filteredPayouts.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No earnings yet for {selectedCrypto}. Keep your racks running!
                    </div>
                  ) : (
                    <div className="custom-scrollbar overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm">
                          <tr className="border-b border-slate-700/50">
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">TFlops</th>
                            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayouts.map((payout: PoolPayout) => {
                            const date = payout.created_at ? new Date(payout.created_at) : null
                            const precision = payout.crypto === 'BTC' ? 8
                              : payout.crypto === 'ETH' ? 8
                              : payout.crypto === 'BNB' ? 8
                              : payout.crypto === 'DOGE' ? 6
                              : payout.crypto === 'POL' ? 6
                              : payout.crypto === 'NCR' ? 4
                              : 8
                            return (
                              <tr key={payout.id} className="border-b border-slate-700/20 hover:bg-slate-800/30 transition">
                                <td className="px-4 py-2.5">
                                  <span className={`font-mono font-semibold ${selectedColor!.text}`}>
                                    +{payout.reward_amount.toFixed(precision)}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-400 text-[12px]">
                                  {payout.user_tflops.toFixed(1)} TF
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-500 text-[11px]">
                                  {date ? date.toLocaleString() : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'withdrawals' && (
                <div className="rounded-[16px] border border-white/[0.06] bg-slate-900/40 p-8 text-center text-slate-500 text-sm">
                  No withdrawals yet for {selectedCrypto}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <PoolCalculationDebug
          userId={userId}
          cryptoPricesLoaded={cryptoPricesLoaded}
          zeroPriceDetected={zeroPriceDetected}
          withdrawalMinimumCalculationReady={withdrawalMinimumCalculationReady}
        />
      </div>
    </div>
  )
}