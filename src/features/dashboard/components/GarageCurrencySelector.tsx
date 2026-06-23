import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useUserWallet,
  type UserWallet,
} from '../../wallet/hooks/useUserWallet'

const STORAGE_KEY = 'synapse-dashboard-selected-currency'
const LEGACY_STORAGE_KEY = 'synapse.dashboard.currency-selector.v1'

type WalletBalanceKey = Exclude<keyof UserWallet, 'id' | 'updated_at'>

const CURRENCY_CONFIG = [
  {
    code: 'NCR',
    key: 'ncr_balance',
    precision: 3,
    badgeClass:
      'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    accentClass:
      'bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.7)]',
    activeRowClass:
      'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  },
  {
    code: 'BTC',
    key: 'btc_balance',
    precision: 8,
    badgeClass: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    accentClass:
      'bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.7)]',
    activeRowClass:
      'border-amber-400/25 bg-amber-400/10 text-amber-100',
  },
  {
    code: 'ETH',
    key: 'eth_balance',
    precision: 8,
    badgeClass:
      'border-violet-400/30 bg-violet-400/10 text-violet-200',
    accentClass:
      'bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.7)]',
    activeRowClass:
      'border-violet-400/25 bg-violet-400/10 text-violet-100',
  },
  {
    code: 'DOGE',
    key: 'doge_balance',
    precision: 8,
    badgeClass:
      'border-yellow-400/30 bg-yellow-400/10 text-yellow-200',
    accentClass:
      'bg-yellow-300 shadow-[0_0_14px_rgba(253,224,71,0.7)]',
    activeRowClass:
      'border-yellow-400/25 bg-yellow-400/10 text-yellow-100',
  },
  {
    code: 'POL',
    key: 'pol_balance',
    precision: 8,
    badgeClass: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
    accentClass: 'bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.7)]',
    activeRowClass: 'border-sky-400/25 bg-sky-400/10 text-sky-100',
  },
  {
    code: 'BNB',
    key: 'bnb_balance',
    precision: 8,
    badgeClass:
      'border-orange-400/30 bg-orange-400/10 text-orange-200',
    accentClass:
      'bg-orange-300 shadow-[0_0_14px_rgba(253,186,116,0.7)]',
    activeRowClass:
      'border-orange-400/25 bg-orange-400/10 text-orange-100',
  },
  {
    code: 'USDT',
    key: 'usdt_balance',
    precision: 2,
    badgeClass: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
    accentClass:
      'bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.7)]',
    activeRowClass:
      'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
  },
] as const satisfies readonly {
  code: string
  key: WalletBalanceKey
  precision: number
  badgeClass: string
  accentClass: string
  activeRowClass: string
}[]

type CurrencyCode = (typeof CURRENCY_CONFIG)[number]['code']
type CurrencyConfig = (typeof CURRENCY_CONFIG)[number]

type CurrencyBalance = CurrencyConfig & {
  balance: number
}

function readStoredCurrencyCode(): CurrencyCode | null {
  if (typeof window === 'undefined') return null

  const storedValue =
    window.localStorage.getItem(STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_STORAGE_KEY)

  return CURRENCY_CONFIG.some((currency) => currency.code === storedValue)
    ? (storedValue as CurrencyCode)
    : null
}

function writeStoredCurrencyCode(code: CurrencyCode) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, code)
}

function toSafeBalance(
  wallet: UserWallet,
  key: WalletBalanceKey,
): number {
  const value = wallet[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function formatBalance(balance: number, precision: number) {
  return balance.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
}

function resolveFallbackCurrencyCode(
  balances: CurrencyBalance[],
): CurrencyCode | null {
  if (balances.length === 0) return null

  const storedCurrencyCode = readStoredCurrencyCode()
  if (
    storedCurrencyCode &&
    balances.some((balance) => balance.code === storedCurrencyCode)
  ) {
    return storedCurrencyCode
  }

  const ncrBalance = balances.find((balance) => balance.code === 'NCR')
  if (ncrBalance) {
    return ncrBalance.code
  }

  return balances[0]?.code ?? null
}

interface GarageCurrencySelectorProps {
  userId: string
}

export function GarageCurrencySelector({
  userId,
}: GarageCurrencySelectorProps) {
  const { wallet, loading, error } = useUserWallet(userId)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCurrencyCode, setSelectedCurrencyCode] =
    useState<CurrencyCode | null>(() => readStoredCurrencyCode())
  const containerRef = useRef<HTMLDivElement | null>(null)

  const balances = useMemo<CurrencyBalance[]>(() => {
    if (!wallet) return []

    return CURRENCY_CONFIG.map((currency) => ({
      ...currency,
      balance: toSafeBalance(wallet, currency.key),
    }))
  }, [wallet])

  const selectedBalance = useMemo(() => {
    if (!selectedCurrencyCode) return null

    return (
      balances.find(
        (balance) => balance.code === selectedCurrencyCode,
      ) ?? null
    )
  }, [balances, selectedCurrencyCode])

  useEffect(() => {
    if (balances.length === 0) return

    const selectedCurrencyStillExists =
      selectedCurrencyCode !== null &&
      balances.some((balance) => balance.code === selectedCurrencyCode)

    if (selectedCurrencyStillExists) {
      return
    }

    const fallbackCurrencyCode = resolveFallbackCurrencyCode(balances)
    if (
      fallbackCurrencyCode &&
      fallbackCurrencyCode !== selectedCurrencyCode
    ) {
      setSelectedCurrencyCode(fallbackCurrencyCode)
    }
  }, [balances, selectedCurrencyCode])

  useEffect(() => {
    if (!selectedCurrencyCode) return
    writeStoredCurrencyCode(selectedCurrencyCode)
  }, [selectedCurrencyCode])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelectCurrency = (currencyCode: CurrencyCode) => {
    setSelectedCurrencyCode(currencyCode)
    writeStoredCurrencyCode(currencyCode)
    setIsOpen(false)
  }

  const panelClassName =
    'pointer-events-auto absolute right-3 top-3 z-[120] w-[min(220px,calc(100%-1.5rem))] sm:right-4 sm:top-4 sm:w-56'
  const hudClassName =
    'relative overflow-hidden rounded-[18px] border bg-slate-950/72 shadow-[0_0_26px_rgba(34,211,238,0.12)] backdrop-blur-md isolate'

  if (loading) {
    return (
      <div className={panelClassName}>
        <div
          className={`${hudClassName} border-cyan-400/15 px-3.5 py-3 text-sm text-slate-200`}
        >
          Loading...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={panelClassName}>
        <div
          className={`${hudClassName} border-red-400/20 px-3.5 py-3 text-sm text-red-200`}
        >
          Wallet unavailable
        </div>
      </div>
    )
  }

  if (!wallet || balances.length === 0) {
    return (
      <div className={panelClassName}>
        <div
          className={`${hudClassName} border-slate-700/60 px-3.5 py-3 text-sm text-slate-300`}
        >
          No balance
        </div>
      </div>
    )
  }

  if (!selectedBalance) {
    return (
      <div className={panelClassName}>
        <div
          className={`${hudClassName} border-cyan-400/15 px-3.5 py-3 text-sm text-slate-200`}
        >
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={panelClassName}
      data-selected-currency={selectedBalance.code}
    >
      <div className={`${hudClassName} border-cyan-400/20`}>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_60%)]" />

        <button
          type="button"
          className="relative z-20 flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition hover:bg-white/[0.03]"
          onClick={() => setIsOpen((previousValue) => !previousValue)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span
            className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${selectedBalance.accentClass}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-100/60">
              Active balance
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] ${selectedBalance.badgeClass}`}
              >
                {selectedBalance.code}
              </span>
              <span className="ml-auto truncate text-right font-mono text-sm font-semibold text-slate-100">
                {formatBalance(
                  selectedBalance.balance,
                  selectedBalance.precision,
                )}
              </span>
              <span
                className={`text-xs text-slate-400 transition ${
                  isOpen ? 'rotate-180 text-cyan-200' : ''
                }`}
              >
                ▼
              </span>
            </div>
          </div>
        </button>

        {isOpen ? (
          <div className="relative z-30 border-t border-cyan-400/10 px-1.5 py-1.5 pointer-events-auto">
            <div
              className="custom-scrollbar relative z-30 max-h-64 overflow-y-auto pointer-events-auto"
              role="listbox"
              aria-label="Dashboard currency selector"
            >
              {balances.map((balance) => {
                const isSelected =
                  balance.code === selectedCurrencyCode

                return (
                  <button
                    key={balance.code}
                    type="button"
                    className={`relative z-30 flex w-full cursor-pointer pointer-events-auto items-center gap-3 rounded-[14px] border px-2.5 py-2 text-left transition ${
                      isSelected
                        ? balance.activeRowClass
                        : 'border-transparent text-slate-200 hover:border-cyan-400/15 hover:bg-slate-900/80'
                    }`}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleSelectCurrency(balance.code)
                    }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${balance.accentClass}`}
                    />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-100">
                      {balance.code}
                    </span>
                    <span className="ml-auto text-right font-mono text-[13px] text-slate-300">
                      {formatBalance(
                        balance.balance,
                        balance.precision,
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default GarageCurrencySelector
