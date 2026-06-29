import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import type { UserWallet } from '../../wallet/hooks/useUserWallet'

type WalletBalanceKey = Exclude<keyof UserWallet, 'id' | 'updated_at'>

const STORAGE_KEY = 'synapse-dashboard-selected-currency'

const CURRENCY_CONFIG = [
  { code: 'NCR',  key: 'ncr_balance',  precision: 3, badgeClass: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200', accentClass: 'bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.7)]', activeRowClass: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100' },
  { code: 'BTC',  key: 'btc_balance',  precision: 8, badgeClass: 'border-amber-400/30 bg-amber-400/10 text-amber-200',        accentClass: 'bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.7)]',   activeRowClass: 'border-amber-400/25 bg-amber-400/10 text-amber-100' },
  { code: 'ETH',  key: 'eth_balance',  precision: 8, badgeClass: 'border-violet-400/30 bg-violet-400/10 text-violet-200',     accentClass: 'bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.7)]', activeRowClass: 'border-violet-400/25 bg-violet-400/10 text-violet-100' },
  { code: 'DOGE', key: 'doge_balance', precision: 8, badgeClass: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200',     accentClass: 'bg-yellow-300 shadow-[0_0_14px_rgba(253,224,71,0.7)]',  activeRowClass: 'border-yellow-400/25 bg-yellow-400/10 text-yellow-100' },
  { code: 'POL',  key: 'pol_balance',  precision: 8, badgeClass: 'border-sky-400/30 bg-sky-400/10 text-sky-200',              accentClass: 'bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.7)]',    activeRowClass: 'border-sky-400/25 bg-sky-400/10 text-sky-100' },
  { code: 'BNB',  key: 'bnb_balance',  precision: 8, badgeClass: 'border-orange-400/30 bg-orange-400/10 text-orange-200',     accentClass: 'bg-orange-300 shadow-[0_0_14px_rgba(253,186,116,0.7)]', activeRowClass: 'border-orange-400/25 bg-orange-400/10 text-orange-100' },
  { code: 'USDT', key: 'usdt_balance', precision: 2, badgeClass: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',           accentClass: 'bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.7)]',   activeRowClass: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100' },
] as const satisfies readonly { code: string; key: WalletBalanceKey; precision: number; badgeClass: string; accentClass: string; activeRowClass: string }[]

type CurrencyCode = (typeof CURRENCY_CONFIG)[number]['code']

// ── Matrix Rain Static ───────────────────────────────────────────
function MatrixRain() {
  const cols = 80
  const rows = 8
  const chars = '01アイウエカキクサシスタチツナニアイ01ウエオカキ10クケコサ01シスセソ'

  const columns = Array.from({ length: cols }, (_, colIdx) => {
    const startRow = Math.floor(Math.random() * 4)
    const length   = 3 + Math.floor(Math.random() * 5)
    return Array.from({ length: rows }, (_, rowIdx) => {
      const active = rowIdx >= startRow && rowIdx < startRow + length
      const isHead = rowIdx === startRow
      const fade   = active ? Math.max(0, 1 - (rowIdx - startRow) / length) : 0
      const char   = chars[Math.floor((colIdx * 7 + rowIdx * 13) % chars.length)]
      return { char, active, isHead, fade }
    })
  })

  return (
    <div className="absolute inset-0 flex w-full h-full overflow-hidden pointer-events-none select-none opacity-35">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col justify-start" style={{ width: `${100 / cols}%` }}>
          {col.map((cell, ri) => (
            <div
              key={ri}
              className="text-center font-mono leading-none"
              style={{
                fontSize: '9px',
                height: `${100 / rows}%`,
                color: cell.isHead
                  ? `rgba(103,232,249,${0.85})`
                  : cell.active
                    ? `rgba(20,184,166,${cell.fade * 0.6})`
                    : 'transparent',
                textShadow: cell.isHead ? '0 0 6px rgba(103,232,249,0.8)' : 'none',
              }}
            >
              {cell.active ? cell.char : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ScientistAvatar({ avatarUrl }: { avatarUrl?: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="avatar" className="h-full w-full rounded-full object-cover" />
  }
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <circle cx="20" cy="20" r="20" fill="#0f172a"/>
      <ellipse cx="20" cy="13" rx="9" ry="7" fill="#6366f1"/>
      <rect x="11" y="10" width="18" height="5" rx="2" fill="#6366f1"/>
      <ellipse cx="20" cy="18" rx="7" ry="7.5" fill="#fde68a"/>
      <circle cx="17" cy="17" r="1.5" fill="#1e1b4b"/>
      <circle cx="23" cy="17" r="1.5" fill="#1e1b4b"/>
      <circle cx="17.6" cy="16.5" r="0.5" fill="white"/>
      <circle cx="23.6" cy="16.5" r="0.5" fill="white"/>
      <path d="M17 21 Q20 23 23 21" stroke="#92400e" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
      <rect x="14.5" y="15.5" width="4.5" height="3" rx="1" stroke="#818cf8" strokeWidth="0.8" fill="none"/>
      <rect x="21" y="15.5" width="4.5" height="3" rx="1" stroke="#818cf8" strokeWidth="0.8" fill="none"/>
      <line x1="19" y1="17" x2="21" y2="17" stroke="#818cf8" strokeWidth="0.8"/>
      <line x1="14.5" y1="17" x2="13" y2="16.5" stroke="#818cf8" strokeWidth="0.8"/>
      <line x1="25.5" y1="17" x2="27" y2="16.5" stroke="#818cf8" strokeWidth="0.8"/>
      <rect x="18" y="25" width="4" height="3" fill="#fde68a"/>
      <path d="M11 40 L11 30 Q14 27 18 26 L20 28 L22 26 Q26 27 29 30 L29 40Z" fill="white"/>
      <path d="M18 26 L17 32 L20 30 L23 32 L22 26" fill="#e0e7ff"/>
      <rect x="22" y="31" width="4" height="3" rx="0.5" fill="#e0e7ff" stroke="#c7d2fe" strokeWidth="0.5"/>
      <line x1="23.5" y1="31" x2="23.5" y2="29.5" stroke="#06b6d4" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="25" y1="31" x2="25" y2="29.5" stroke="#a78bfa" strokeWidth="0.8" strokeLinecap="round"/>
    </svg>
  )
}

function readStoredCode(): CurrencyCode | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(STORAGE_KEY)
  return CURRENCY_CONFIG.some(c => c.code === v) ? (v as CurrencyCode) : null
}

function writeStoredCode(code: CurrencyCode) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, code)
}

function toSafe(wallet: UserWallet, key: WalletBalanceKey): number {
  const v = wallet[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function fmt(balance: number, precision: number) {
  return balance.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })
}

interface DashboardHeaderProps {
  userId: string
  wallet: UserWallet | null
  loading?: boolean
  onNavigateWallet: () => void
  onNavigateProfile?: () => void
  onSignOut: () => void
}

export function DashboardHeader({ userId, wallet, loading = false, onNavigateWallet, onNavigateProfile, onSignOut }: DashboardHeaderProps) {
  const [isOpen, setIsOpen]           = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [selected, setSelected]       = useState<CurrencyCode | null>(() => readStoredCode())
  const [username, setUsername]       = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const profileRef   = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('user_profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username ?? null)
          setAvatarUrl((data as { username: string | null; avatar_url?: string | null }).avatar_url ?? null)
        }
      })
  }, [userId])

  const balances = useMemo(() => {
    if (!wallet) return []
    return CURRENCY_CONFIG.map(c => ({ ...c, balance: toSafe(wallet, c.key) }))
  }, [wallet])

  const selectedBalance = useMemo(
    () => balances.find(b => b.code === selected) ?? null,
    [balances, selected],
  )

  useEffect(() => {
    if (balances.length === 0 || selected) return
    const ncr = balances.find(b => b.code === 'NCR')
    if (ncr) setSelected(ncr.code)
  }, [balances, selected])

  useEffect(() => {
    if (selected) writeStoredCode(selected)
  }, [selected])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cyan-400/10 bg-slate-950 overflow-hidden">
      <MatrixRain />
      <div className="relative flex h-26 w-full items-center justify-between">

        {/* Logo — pegado al borde izquierdo, sin padding */}
        <div className="flex h-full items-center pl-18">
          <img
            src="/assets/logo-full.png"
            alt="Synapse World Grid"
           className="h-32 w-auto object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 pr-6 bg-slate-950/70 backdrop-blur-sm px-6 py-2 rounded-[16px]">

          {/* Wallet button — mismo tamaño que avatar */}
          <button
            type="button"
            onClick={onNavigateWallet}
            className="flex items-center gap-3 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-4 py-2 transition hover:border-cyan-400/25 hover:bg-white/[0.07]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10">
              <svg className="h-5 w-5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Navigation</span>
              <span className="text-[15px] font-bold text-slate-100 tracking-wide">Wallet</span>
            </div>
          </button>

          {/* Divider */}
          <div className="h-10 w-px bg-white/[0.08]" />

          {/* Active Balance — mismo tamaño que avatar */}
          <div ref={containerRef} className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(v => !v)}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-3 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-4 py-2 transition hover:border-cyan-400/25 hover:bg-white/[0.07]"
            >
              {loading || !selectedBalance ? (
                <span className="text-[14px] text-slate-500">Loading...</span>
              ) : (
                <>
                  <span className={`h-10 w-10 shrink-0 rounded-full ${selectedBalance.accentClass} flex items-center justify-center`}>
                    <span className="text-[9px] font-black text-slate-900 uppercase">{selectedBalance.code}</span>
                  </span>
                  <div className="flex flex-col leading-none">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Active balance</span>
                    <span className="mt-0.5 font-mono text-[15px] font-bold text-slate-100">
                      {fmt(selectedBalance.balance, selectedBalance.precision)}
                    </span>
                  </div>
                  <span className={`text-[12px] text-slate-500 transition ${isOpen ? 'rotate-180 text-cyan-300' : ''}`}>▼</span>
                </>
              )}
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 overflow-hidden rounded-[16px] border border-white/[0.08] bg-slate-950/95 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
                <div className="px-1.5 py-1.5" role="listbox" aria-label="Select currency">
                  {balances.map(b => {
                    const isSel = b.code === selected
                    return (
                      <button
                        key={b.code}
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-[12px] border px-3 py-2 text-left transition ${
                          isSel ? b.activeRowClass : 'border-transparent text-slate-300 hover:border-cyan-400/15 hover:bg-slate-900/80'
                        }`}
                        onPointerDown={e => {
                          e.preventDefault()
                          setSelected(b.code)
                          writeStoredCode(b.code)
                          setIsOpen(false)
                        }}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${b.accentClass}`} />
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-100">{b.code}</span>
                        <span className="ml-auto font-mono text-[12px] text-slate-300">{fmt(b.balance, b.precision)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-white/[0.08]" />

          {/* Avatar + Username + dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-4 py-2 transition hover:border-indigo-400/30 hover:bg-white/[0.06]"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-indigo-400/30 bg-slate-900 shadow-[0_0_8px_rgba(99,102,241,0.3)]">
                <ScientistAvatar avatarUrl={avatarUrl} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Agent</span>
                <span className="text-[15px] font-bold text-slate-100 tracking-wide">
                  {username ?? '—'}
                </span>
              </div>
              <span className={`text-[12px] text-slate-500 transition ${profileOpen ? 'rotate-180 text-indigo-300' : ''}`}>▼</span>
            </button>

            {/* Profile dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 overflow-hidden rounded-[16px] border border-white/[0.08] bg-slate-950/95 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
                <div className="px-1.5 py-1.5 flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); onNavigateProfile?.() }}
                    className="flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-3 py-2 text-left text-[13px] text-slate-300 transition hover:border-indigo-400/20 hover:bg-slate-900/80 hover:text-indigo-200"
                  >
                    <span>👤</span> Edit Profile
                  </button>
                  <div className="my-0.5 h-px bg-white/[0.06]" />
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); onSignOut() }}
                    className="flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-3 py-2 text-left text-[13px] text-red-400 transition hover:border-red-500/20 hover:bg-red-500/10"
                  >
                    <span>⏻</span> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}

export default DashboardHeader