import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  benchmarkPanel,
  navItems,
} from './mockDashboardData';
import { BenchmarkPanel } from './components/BenchmarkPanel';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHeader } from './components/DashboardHeader';
import { useUserWallet } from '../wallet/hooks/useUserWallet';
import { Sidebar } from './components/Sidebar';
import { type DashboardHardwarePiece } from './components/DashboardRackMonitor';
import { LaboratoryEditor } from './components/LaboratoryEditor';

import garageLevelOneHero from '../../assets/dashboard/garage-room-01.png';
import { GarageRackOverlay } from './components/GarageRackOverlay';
import { GarageRoomIndicators } from './components/GarageRoomIndicators';
import StorePage from '../store/pages/StorePage';
import MarketplacePage from '../marketplace/pages/MarketplacePage';
import WalletPage from '../wallet/pages/WalletPage';
import GamesPage from '../../pages/GamesPage'
import { isLegalRoute } from '../../pages/legal/legalRoutes';
import NeuralLink from '../neural-link/NeuralLink'
import PacketStorm from '../packet-storm/PacketStorm'
import NetRush from '../net-rush/NetRush'
import ProfilePage from './components/ProfilePage'
import { PowerSupplyAnimated } from './components/PowerSupplyAnimated'
import {
  selectMockHardwarePieces,
  useMockPlayerState,
  type MockHardwarePiece,
  useRackBuffs,
  useConditionalEffects,
  type RackRuntimeStats,
  useRackTFlops,
  usePlayerEnergy,
  type PlayerEnergy,
  useUserBatteries,
  useBattery,
  usePoolAllocation,
} from '../../data/supabasePlayerState'
import RackStatusPanel from './components/RackStatusPanel';
import { computeRackStatus } from './utils/computeRackStatus';
import { PoolAllocationPanel } from './components/PoolAllocationPanel';

interface DashboardPageProps {
  session: { id: string; email?: string };
  onSignOut: () => void;
}

const navItemsByPath = new Map(navItems.map((item) => [item.path.replace(/\/$/, '') || '/', item]))

const legacyDashboardPathMap = new Map<string, string>([
  ['/', 'dashboard'], ['/dashboard', 'dashboard'], ['/laboratory', 'laboratory'],
  ['/equipment', 'equipment'], ['/benchmark', 'benchmark'], ['/store', 'store'],
  ['/marketplace', 'marketplace'], ['/wallet', 'wallet'], ['/achievements', 'achievements'],
])

function normalizePathname(pathname: string) {
  if (!pathname) return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

function resolveSectionFromPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname)
  if (normalizedPath === '/games/neural-link') return 'neural-link'
  if (normalizedPath === '/games/packet-storm') return 'packet-storm'
  if (normalizedPath === '/games/net-rush') return 'net-rush'
  if (normalizedPath === '/profile') return 'profile'
  if (navItemsByPath.has(normalizedPath)) return navItemsByPath.get(normalizedPath)?.id ?? 'dashboard'
  return legacyDashboardPathMap.get(normalizedPath) ?? 'dashboard'
}

function getCanonicalPath(sectionId: string) {
  if (sectionId === 'neural-link') return '/games/neural-link'
  if (sectionId === 'packet-storm') return '/games/packet-storm'
  if (sectionId === 'net-rush') return '/games/net-rush'
  if (sectionId === 'profile') return '/profile'
  return navItems.find((item) => item.id === sectionId)?.path ?? '/dashboard'
}

const rackZoomButtons = [
  { id: 1, left: '26.5%', top: '31%', width: '10%', height: '38%' },
  { id: 2, left: '37.8%', top: '31%', width: '10%', height: '38%' },
  { id: 3, left: '49.4%', top: '31%', width: '10%', height: '38%' },
  { id: 4, left: '61.2%', top: '31%', width: '10%', height: '38%' },
]

const MAX_COMPONENTS_PER_ROOM = 80
const MAX_ROOM_POWER_W = 7200
const MAX_BATTERY_WH = 151200

function useGarageScale(ref: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    if (!ref.current) return
    const BASE_WIDTH = 1360
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / BASE_WIDTH))
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return scale
}

function ZoomSlot({ item }: { item: MockHardwarePiece | null }) {
  if (!item) return <div className="h-[72px] flex-1 rounded-lg border border-dashed border-slate-700/50 bg-slate-900/40" />
  const isCooling = item.type === 'COOLING'
  const isPSU = item.brand === 'RustCore' && item.model === 'PS_350A' && item.condition === 'New'
  return (
    <div className="relative h-[72px] flex-1 overflow-hidden rounded-lg border border-slate-600/30 bg-slate-900/80">
      {isCooling && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
          <div className="h-4/5 w-4/5 rounded-full border-2 border-dashed border-sky-400/40" />
        </div>
      )}
      {isPSU ? (
        <PowerSupplyAnimated src={item.image} alt={item.name} />
      ) : (
        <img src={item.image} alt={item.name} draggable={false} className={`h-full w-full object-contain p-1 select-none ${isCooling ? 'mix-blend-multiply' : ''}`} />
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
        <p className="truncate text-[8px] font-bold text-slate-200">{item.name}</p>
        <p className="text-[7px] uppercase tracking-wider text-slate-400">{item.condition}</p>
      </div>
    </div>
  )
}

function RackZoomGrid({ rackId, userId }: { rackId: number; userId: string }) {
  const { inventory } = useMockPlayerState(userId)
  const hardwarePieces = useMemo(() => selectMockHardwarePieces(inventory), [inventory])
  const slotMap = useMemo(() => {
    const r = `rack${rackId}`
    const map: Record<string, MockHardwarePiece | null> = {
      [`${r}-power1`]: null, [`${r}-power2`]: null,
      [`${r}-cable-kit1`]: null, [`${r}-cable-kit2`]: null,
      [`${r}-cooling1`]: null, [`${r}-cooling2`]: null,
      [`${r}-storage1`]: null, [`${r}-storage2`]: null,
    }
    for (let i = 1; i <= 6; i++) { map[`${r}-mem${i}`] = null; map[`${r}-gpu${i}`] = null }
    hardwarePieces.forEach((p) => { if (p.slot_id && p.slot_id in map) map[p.slot_id] = p })
    return map
  }, [hardwarePieces, rackId])

  const g = (id: string) => slotMap[id] ?? null
  const installedPieces = Object.values(slotMap).filter((p): p is MockHardwarePiece => p != null)
  const installedItemIds = installedPieces.map(p => p.item_id)
  const rackBuffs = useRackBuffs(installedItemIds)

  // ── Paso 1: SP Base sin buffs → para rackStats ───────────────
  const rackStatusBase = computeRackStatus(installedPieces)

  const rackStats: RackRuntimeStats = useMemo(() => ({
    temperature: rackStatusBase.temperature,
    power_load:  rackStatusBase.powerLoad,
    stability:   rackStatusBase.stability,
  }), [rackStatusBase.temperature, rackStatusBase.powerLoad, rackStatusBase.stability])

  // ── Paso 2: efectos condicionales usando rackStats base ──────
  const { activeBoosts: conditionalBoosts, activePenalties: conditionalPenalties, potentialPenalties } = useConditionalEffects(installedItemIds, rackStats)

  // ── Paso 3: SP Efectivo con buffs/penalties ──────────────────
  const rackStatusData = computeRackStatus(installedPieces, conditionalBoosts, conditionalPenalties)

  const rackTFlops = useRackTFlops(installedPieces, rackBuffs.buffs)

  const r = `rack${rackId}`
  const sections = [
    { label: 'Power System', color: 'text-amber-300/70', slots: [`${r}-power1`, `${r}-power2`], cols: 2 },
    { label: 'Power Cables', color: 'text-slate-300/70', slots: [`${r}-cable-kit1`, `${r}-cable-kit2`], cols: 2 },
    { label: 'Cooling System', color: 'text-sky-300/70', slots: [`${r}-cooling1`, `${r}-cooling2`], cols: 2 },
    { label: 'Storage Bay', color: 'text-emerald-300/70', slots: [`${r}-storage1`, `${r}-storage2`], cols: 2 },
    { label: 'Memory Bank', color: 'text-purple-300/70', slots: [`${r}-mem1`, `${r}-mem2`, `${r}-mem3`, `${r}-mem4`, `${r}-mem5`, `${r}-mem6`], cols: 3 },
    { label: 'GPU Array', color: 'text-cyan-300/70', slots: [`${r}-gpu1`, `${r}-gpu2`, `${r}-gpu3`, `${r}-gpu4`, `${r}-gpu5`, `${r}-gpu6`], cols: 3 },
  ]

  type StatGroup = { stat: string; count: number; total: number; isTemp: boolean }
  function groupByStat(effects: typeof conditionalBoosts): StatGroup[] {
    const map = new Map<string, StatGroup>()
    for (const e of effects) {
      const key = e.stat_affected; const isTemp = key === 'temperature'
      if (!map.has(key)) map.set(key, { stat: key, count: 0, total: 0, isTemp })
      const g = map.get(key)!; g.count += 1; g.total += e.numeric_value
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }
  const boostGroups = groupByStat(conditionalBoosts)
  const penaltyGroups = groupByStat(conditionalPenalties)
  const warningGroups = groupByStat(potentialPenalties)
  function formatStatLabel(stat: string) { return stat.replace('_', ' ') }

  return (
    <div className="flex gap-4">
      <div className="w-44 shrink-0 self-start sticky top-0 flex flex-col gap-2">
        <RackStatusPanel
          {...rackStatusData}
          aiOutput={rackTFlops?.effectiveAiOutput ?? rackStatusData.aiOutput}
          variant="compact"
        />
        {rackTFlops && (
          <div className="rounded-md border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-2">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/80 mb-1.5">TFLOPS Breakdown</div>
            <div className="flex flex-col gap-1 text-[10px]">
              <div className="flex justify-between"><span className="text-slate-400">Base (GPUs)</span><span className="text-slate-200 font-mono">{rackTFlops.baseAiOutput}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Individual</span><span className={`font-mono ${rackTFlops.individualEfficiencyPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{rackTFlops.individualEfficiencyPct >= 0 ? '+' : ''}{rackTFlops.individualEfficiencyPct}%</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Combos</span><span className={`font-mono ${rackTFlops.combosEfficiencyPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{rackTFlops.combosEfficiencyPct >= 0 ? '+' : ''}{rackTFlops.combosEfficiencyPct}%</span></div>
              <div className="flex justify-between border-t border-cyan-500/15 pt-1 mt-0.5"><span className="text-cyan-300/80 font-bold">Total</span><span className="text-cyan-300 font-mono font-bold">{rackTFlops.totalEfficiencyPct >= 0 ? '+' : ''}{rackTFlops.totalEfficiencyPct}%</span></div>
              <div className="flex justify-between"><span className="text-violet-300/80 font-bold">TFLOPS</span><span className="text-violet-300 font-mono font-bold">{rackTFlops.effectiveAiOutput.toFixed(1)}</span></div>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 w-[320px] shrink-0">
        {sections.map((section) => (
          <div key={section.label}>
            <p className={`mb-1 text-[9px] font-black uppercase tracking-[0.24em] ${section.color}`}>{section.label}</p>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${section.cols}, 1fr)` }}>
              {section.slots.map((id) => (<ZoomSlot key={id} item={g(id)} />))}
            </div>
          </div>
        ))}
      </div>
      <div className="w-44 shrink-0 self-start sticky top-0 flex flex-col gap-2">
        <div className="rounded-md border border-emerald-500/20 bg-emerald-950/30 px-2.5 py-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-emerald-400 text-[10px]">▲</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/80">Buffs</span>
            <span className="ml-auto text-[9px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-1.5 py-0.5">{conditionalBoosts.length}</span>
          </div>
          {boostGroups.length === 0 ? <p className="text-[10px] text-slate-500 italic">No active buffs</p> : (
            <div className="flex flex-col gap-1.5">
              {boostGroups.map((g) => (
                <div key={g.stat} className="rounded border border-emerald-500/15 bg-emerald-900/20 px-2 py-1.5">
                  <div className="flex items-baseline justify-between"><span className="text-[9px] text-emerald-200/60">{g.count} active</span><span className="text-[12px] font-bold text-emerald-300">+{g.total}{g.isTemp ? '°C' : '%'}</span></div>
                  <p className="mt-0.5 text-[9px] text-emerald-400/70 uppercase tracking-wide">{formatStatLabel(g.stat)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-md border border-red-500/20 bg-red-950/30 px-2.5 py-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-red-400 text-[10px]">▼</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/80">Penalties</span>
            <span className="ml-auto text-[9px] font-bold text-red-300 bg-red-500/20 border border-red-500/30 rounded-full px-1.5 py-0.5">{conditionalPenalties.length}</span>
          </div>
          {penaltyGroups.length === 0 ? <p className="text-[10px] text-slate-500 italic">No active penalties</p> : (
            <div className="flex flex-col gap-1.5">
              {penaltyGroups.map((g) => (
                <div key={g.stat} className="rounded border border-red-500/15 bg-red-900/20 px-2 py-1.5">
                  <div className="flex items-baseline justify-between"><span className="text-[9px] text-red-200/60">{g.count} active</span><span className="text-[12px] font-bold text-red-300">{g.isTemp ? '+' : '-'}{g.total}{g.isTemp ? '°C' : '%'}</span></div>
                  <p className="mt-0.5 text-[9px] text-red-400/70 uppercase tracking-wide">{formatStatLabel(g.stat)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-md border border-amber-500/15 bg-amber-950/20 px-2.5 py-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-amber-500/70 text-[10px]">⚠</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/70">Warnings</span>
            <span className="ml-auto text-[9px] font-bold text-amber-400/70 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5">{potentialPenalties.length}</span>
          </div>
          {warningGroups.length === 0 ? <p className="text-[10px] text-slate-500 italic">No warnings</p> : (
            <div className="flex flex-col gap-1.5">
              {warningGroups.map((g) => (
                <div key={g.stat} className="rounded border border-amber-500/10 bg-amber-900/10 px-2 py-1.5">
                  <div className="flex items-baseline justify-between"><span className="text-[9px] text-amber-200/40">{g.count} potential</span><span className="text-[12px] font-bold text-amber-400/70">{g.isTemp ? '+' : '-'}{g.total}{g.isTemp ? '°C' : '%'}</span></div>
                  <p className="mt-0.5 text-[9px] text-amber-500/60 uppercase tracking-wide">{formatStatLabel(g.stat)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="w-96 shrink-0 self-start sticky top-0">
        <div className="rounded-md border border-violet-500/15 bg-violet-950/25 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-violet-400 text-xs">⬡</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/80">Combos</span>
            <span className="ml-auto text-[10px] font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30 rounded-full px-2 py-0.5">{rackBuffs.buffs.length}</span>
          </div>
          {rackBuffs.buffs.length === 0 ? <p className="text-[11px] text-slate-500 italic">No combos detected</p> : (
            <div className="grid grid-cols-2 gap-2">
              {rackBuffs.buffs.map((b, i) => {
                const isBoost = b.effect_type === 'boost'
                return (
                  <div key={`combo-${i}`} className="rounded-lg border border-violet-500/15 bg-violet-900/20 px-3 py-2.5">
                    <span className={`text-[13px] font-bold ${isBoost ? 'text-emerald-300' : 'text-red-300'}`}>{isBoost ? '▲' : '▼'} {b.effect_value}</span>
                    <p className="mt-1 text-[10px] text-violet-200/60 leading-snug">{b.description}</p>
                    <p className="mt-1 text-[9px] text-slate-500 uppercase tracking-wide leading-snug break-words">{b.item_a}<br />+ {b.item_b}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface RoomGaugesData {
  totalTFlops: number
  totalSP: number
  totalPower: number
  maxPower: number
  avgTemperature: number
  avgStability: number
  installedComponents: number
  maxComponents: number
  batteryWh: number
  maxBatteryWh: number
}

function useRoomTFlops(hardwarePieces: MockHardwarePiece[]): number {
  const rack1Pieces = useMemo(() => hardwarePieces.filter(p => p.slot_id?.startsWith('rack1-')), [hardwarePieces])
  const rack2Pieces = useMemo(() => hardwarePieces.filter(p => p.slot_id?.startsWith('rack2-')), [hardwarePieces])
  const rack3Pieces = useMemo(() => hardwarePieces.filter(p => p.slot_id?.startsWith('rack3-')), [hardwarePieces])
  const rack4Pieces = useMemo(() => hardwarePieces.filter(p => p.slot_id?.startsWith('rack4-')), [hardwarePieces])
  const rack1Ids = useMemo(() => rack1Pieces.map(p => p.item_id), [rack1Pieces])
  const rack2Ids = useMemo(() => rack2Pieces.map(p => p.item_id), [rack2Pieces])
  const rack3Ids = useMemo(() => rack3Pieces.map(p => p.item_id), [rack3Pieces])
  const rack4Ids = useMemo(() => rack4Pieces.map(p => p.item_id), [rack4Pieces])
  const buffs1 = useRackBuffs(rack1Ids); const buffs2 = useRackBuffs(rack2Ids)
  const buffs3 = useRackBuffs(rack3Ids); const buffs4 = useRackBuffs(rack4Ids)
  const tflops1 = useRackTFlops(rack1Pieces, buffs1.buffs); const tflops2 = useRackTFlops(rack2Pieces, buffs2.buffs)
  const tflops3 = useRackTFlops(rack3Pieces, buffs3.buffs); const tflops4 = useRackTFlops(rack4Pieces, buffs4.buffs)
  return useMemo(() => (tflops1?.effectiveAiOutput ?? 0) + (tflops2?.effectiveAiOutput ?? 0) + (tflops3?.effectiveAiOutput ?? 0) + (tflops4?.effectiveAiOutput ?? 0), [tflops1, tflops2, tflops3, tflops4])
}

// ── SP Efectivo por sala — incluye buffs/penalties activos ──────
// Necesita hooks separados porque useConditionalEffects no puede
// llamarse dentro de useMemo
function useRoomEffectiveSP(hardwarePieces: MockHardwarePiece[]): number {
  const rack1Pieces = useMemo(() => hardwarePieces.filter(p => p.slot_id?.startsWith('rack1-')), [hardwarePieces])
  const rack2Pieces = useMemo(() => hardwarePieces.filter(p => p.slot_id?.startsWith('rack2-')), [hardwarePieces])
  const rack3Pieces = useMemo(() => hardwarePieces.filter(p => p.slot_id?.startsWith('rack3-')), [hardwarePieces])
  const rack4Pieces = useMemo(() => hardwarePieces.filter(p => p.slot_id?.startsWith('rack4-')), [hardwarePieces])

  const rack1Ids = useMemo(() => rack1Pieces.map(p => p.item_id), [rack1Pieces])
  const rack2Ids = useMemo(() => rack2Pieces.map(p => p.item_id), [rack2Pieces])
  const rack3Ids = useMemo(() => rack3Pieces.map(p => p.item_id), [rack3Pieces])
  const rack4Ids = useMemo(() => rack4Pieces.map(p => p.item_id), [rack4Pieces])

  // Stats base de cada rack para evaluar condiciones
  const base1 = useMemo(() => computeRackStatus(rack1Pieces), [rack1Pieces])
  const base2 = useMemo(() => computeRackStatus(rack2Pieces), [rack2Pieces])
  const base3 = useMemo(() => computeRackStatus(rack3Pieces), [rack3Pieces])
  const base4 = useMemo(() => computeRackStatus(rack4Pieces), [rack4Pieces])

  const stats1: RackRuntimeStats = useMemo(() => ({ temperature: base1.temperature, power_load: base1.powerLoad, stability: base1.stability }), [base1.temperature, base1.powerLoad, base1.stability])
  const stats2: RackRuntimeStats = useMemo(() => ({ temperature: base2.temperature, power_load: base2.powerLoad, stability: base2.stability }), [base2.temperature, base2.powerLoad, base2.stability])
  const stats3: RackRuntimeStats = useMemo(() => ({ temperature: base3.temperature, power_load: base3.powerLoad, stability: base3.stability }), [base3.temperature, base3.powerLoad, base3.stability])
  const stats4: RackRuntimeStats = useMemo(() => ({ temperature: base4.temperature, power_load: base4.powerLoad, stability: base4.stability }), [base4.temperature, base4.powerLoad, base4.stability])

  const { activeBoosts: boosts1, activePenalties: penalties1 } = useConditionalEffects(rack1Ids, stats1)
  const { activeBoosts: boosts2, activePenalties: penalties2 } = useConditionalEffects(rack2Ids, stats2)
  const { activeBoosts: boosts3, activePenalties: penalties3 } = useConditionalEffects(rack3Ids, stats3)
  const { activeBoosts: boosts4, activePenalties: penalties4 } = useConditionalEffects(rack4Ids, stats4)

  const sp1 = useMemo(() => computeRackStatus(rack1Pieces, boosts1, penalties1).synapsepowerEffective ?? 0, [rack1Pieces, boosts1, penalties1])
  const sp2 = useMemo(() => computeRackStatus(rack2Pieces, boosts2, penalties2).synapsepowerEffective ?? 0, [rack2Pieces, boosts2, penalties2])
  const sp3 = useMemo(() => computeRackStatus(rack3Pieces, boosts3, penalties3).synapsepowerEffective ?? 0, [rack3Pieces, boosts3, penalties3])
  const sp4 = useMemo(() => computeRackStatus(rack4Pieces, boosts4, penalties4).synapsepowerEffective ?? 0, [rack4Pieces, boosts4, penalties4])

  return useMemo(() => sp1 + sp2 + sp3 + sp4, [sp1, sp2, sp3, sp4])
}

function useRoomGaugesData(hardwarePieces: MockHardwarePiece[], energy: PlayerEnergy | null, roomTFlops?: number): RoomGaugesData {
  return useMemo(() => {
    let totalTFlops = 0, totalSP = 0, totalPower = 0
    let tempSum = 0, stabilitySum = 0, activeRackCount = 0, installedComponents = 0

    ;[1, 2, 3, 4].forEach((rackId) => {
      const rackPieces = hardwarePieces.filter((p) => p.slot_id?.startsWith(`rack${rackId}-`))
      if (rackPieces.length === 0) return
      const status = computeRackStatus(rackPieces)
      installedComponents += status.installedCount
      totalPower         += status.powerLoad
      totalTFlops        += status.aiOutput / 10
      totalSP            += status.synapsepower ?? 0
      tempSum            += status.temperature
      stabilitySum       += status.stability
      activeRackCount    += 1
    })

    return {
      totalTFlops: roomTFlops ?? totalTFlops,
      totalSP,
      totalPower,
      maxPower: MAX_ROOM_POWER_W,
      avgTemperature: activeRackCount > 0 ? tempSum / activeRackCount : 25,
      avgStability:   activeRackCount > 0 ? stabilitySum / activeRackCount : 100,
      installedComponents,
      maxComponents: MAX_COMPONENTS_PER_ROOM,
      batteryWh:    energy?.currentWh  ?? MAX_BATTERY_WH,
      maxBatteryWh: energy?.maxWh      ?? MAX_BATTERY_WH,
    }
  }, [hardwarePieces, energy, roomTFlops])
}

export default function DashboardPage({ session, onSignOut }: DashboardPageProps) {
  const [activeSection, setActiveSection] = useState(() => resolveSectionFromPath(window.location.pathname))
  const [zoomedRackId, setZoomedRackId]   = useState<number | null>(null)
  const garageRef = useRef<HTMLDivElement | null>(null)
  const scale     = useGarageScale(garageRef)

  const userId = session.id
  const { wallet, loading: walletLoading } = useUserWallet(userId)
  const { inventory } = useMockPlayerState(userId)

  const isLaboratorySection = activeSection === 'laboratory' || activeSection === 'neural-link' || activeSection === 'packet-storm' || activeSection === 'net-rush'

  useEffect(() => {
    const syncFromLocation = () => {
      if (isLegalRoute(window.location.pathname)) return
      const nextSection = resolveSectionFromPath(window.location.pathname)
      setActiveSection((current) => current === nextSection ? current : nextSection)
      const canonicalPath  = getCanonicalPath(nextSection)
      const normalizedPath = normalizePathname(window.location.pathname)
      if (canonicalPath !== normalizedPath && nextSection !== 'games' && nextSection !== 'neural-link' && nextSection !== 'packet-storm' && nextSection !== 'net-rush') {
        window.history.replaceState({}, '', canonicalPath)
      }
    }
    syncFromLocation()
    window.addEventListener('popstate', syncFromLocation)
    return () => window.removeEventListener('popstate', syncFromLocation)
  }, [])

  const installedHardware = useMemo<DashboardHardwarePiece[]>(() => selectMockHardwarePieces(inventory).filter((piece) => piece.slot_id !== null), [inventory])
  const allHardwarePieces = useMemo(() => selectMockHardwarePieces(inventory), [inventory])
  const { energy, refresh: refreshEnergy }             = usePlayerEnergy(userId)
  const roomTFlops                                     = useRoomTFlops(allHardwarePieces)
  const roomEffectiveSP                                = useRoomEffectiveSP(allHardwarePieces)
  const roomGaugesData                                 = useRoomGaugesData(allHardwarePieces, energy, roomTFlops)
  const { batteries: unusedBatteries, refresh: refreshBatteries } = useUserBatteries(userId)
  const [batteryFeedback, setBatteryFeedback]          = useState<string | null>(null)
  const { allocation, refresh: refreshAllocation }     = usePoolAllocation(userId)

  const handleUseBattery = async (batteryId: string) => {
    const result = await useBattery(batteryId)
    if (!result.success) { setBatteryFeedback(result.message); return }
    await refreshEnergy(); await refreshBatteries()
    setBatteryFeedback(result.whWasted && result.whWasted > 0
      ? `+${Math.round(result.whAdded ?? 0).toLocaleString()} Wh added (${Math.round(result.whWasted).toLocaleString()} Wh wasted)`
      : `+${Math.round(result.whAdded ?? 0).toLocaleString()} Wh added to energy reserve`)
    setTimeout(() => setBatteryFeedback(null), 4000)
  }

  const hardwareStats = useMemo(() => {
    let tflops = 0, power = 0, heat = 22, cooling = 0, activeGpus = 0
    installedHardware.forEach((piece) => {
      const stats = piece.stats ?? { tflops: 0, power: 0, heat: 0 }
      power += stats.power ?? 0
      if (piece.type === 'GPU')     { tflops += stats.tflops ?? 0; heat += Math.max(0, stats.heat ?? 0); activeGpus += 1; return }
      if (piece.type === 'COOLING') { cooling += Math.abs(stats.heat ?? 0); return }
      heat += Math.max(0, stats.heat ?? 0)
    })
    return { tflops, power, heat: Math.max(20, heat - cooling), activeGpus }
  }, [installedHardware])

  const navigateToWallet = () => {
    startTransition(() => setActiveSection('wallet'))
    window.history.pushState({}, '', '/wallet')
  }

  return (
    <div className="dashboard-container">
      <DashboardLayout
        header={
          <DashboardHeader
            userId={userId} wallet={wallet} loading={walletLoading}
            onNavigateWallet={navigateToWallet}
            onNavigateProfile={() => { startTransition(() => setActiveSection('profile')); window.history.pushState({}, '', '/profile') }}
            onSignOut={onSignOut}
          />
        }
        sidebar={
          <Sidebar items={navItems} activeItem={activeSection}
            onSelect={(item) => {
              startTransition(() => setActiveSection(item.id))
              if (window.location.pathname !== item.path) window.history.pushState({}, '', item.path)
            }}
          />
        }
        topBar={null}
        aside={
          activeSection === 'dashboard' ? (
            <div className="relative z-30 space-y-3">
              <BenchmarkPanel
                benchmark={benchmarkPanel}
                performanceScore={Math.round(hardwareStats.tflops * 100)}
                userId={userId}
                roomTFlops={roomEffectiveSP}
              />
            </div>
          ) : null
        }
      >
        <div className={`flex h-full w-full justify-center animate-in fade-in duration-300 ${isLaboratorySection ? 'items-start p-0' : 'items-center p-4'}`}>
          {activeSection === 'dashboard' && (
            <div className="relative w-full max-w-[1960px] pb-28 xl:pb-0">
              <div ref={garageRef} className="relative aspect-video xl:ml-8">
                <div className="absolute inset-0 overflow-hidden rounded-xl border border-slate-800/60 bg-[#0a0f16] shadow-[0_0_40px_rgba(34,211,238,0.05)]">
                  <img src={garageLevelOneHero} alt="Garage Base" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/15 via-transparent to-slate-950/35" />

                  <div
                    className="absolute inset-0"
                    style={{ transformOrigin: 'top left', transform: `scale(${scale})`, width: `${100/scale}%`, height: `${100/scale}%` }}
                  >
                    {/* Energy + Batteries */}
                    <div className="pointer-events-none absolute left-4 top-4 z-40 flex items-start gap-2">
                      <div className="relative overflow-hidden rounded-[18px] border border-white/8 bg-slate-950/62 px-3.5 py-3 shadow-[0_0_24px_rgba(52,211,153,0.08)] backdrop-blur-md">
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_55%)]" />
                        <div className="absolute left-3 top-3 h-8 w-px bg-emerald-300/55" />
                        <div className="relative flex items-center gap-3 pl-3.5">
                          <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0">
                            <path d="M 10.2 25.8 A 13 13 0 1 1 25.8 25.8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-700/50" />
                            {(() => {
                              const pct = Math.min(1, Math.max(0, roomGaugesData.batteryWh / roomGaugesData.maxBatteryWh))
                              const isLow = pct < 0.2
                              const angle = -135 + pct * 270
                              const rad = (angle * Math.PI) / 180
                              const needleX = 18 + 11 * Math.sin(rad); const needleY = 18 - 11 * Math.cos(rad)
                              const startRad = (-135 * Math.PI) / 180
                              const sx = 18 + 13 * Math.sin(startRad); const sy = 18 - 13 * Math.cos(startRad)
                              const ex = 18 + 13 * Math.sin(rad); const ey = 18 - 13 * Math.cos(rad)
                              const largeArc = pct > 0.5 ? 1 : 0
                              const stroke = isLow ? '#f87171' : '#34d399'
                              const glow = isLow ? 'rgba(248,113,113,0.5)' : 'rgba(52,211,153,0.5)'
                              return (
                                <>
                                  {pct > 0.01 && <path d={`M ${sx} ${sy} A 13 13 0 ${largeArc} 1 ${ex} ${ey}`} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 2px ${glow})` }} />}
                                  <line x1="18" y1="18" x2={needleX} y2={needleY} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
                                  <circle cx="18" cy="18" r="2" fill={stroke} />
                                </>
                              )
                            })()}
                          </svg>
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-100/72">Energy</p>
                            <p className="mt-1.5 text-sm font-semibold tracking-[0.04em] text-slate-50">
                              {Math.round(roomGaugesData.batteryWh).toLocaleString()} / {Math.round(roomGaugesData.maxBatteryWh).toLocaleString()} Wh
                            </p>
                          </div>
                        </div>
                      </div>

                      {unusedBatteries.length > 0 && (() => {
                        const groups = new Map<number, typeof unusedBatteries>()
                        for (const b of unusedBatteries) {
                          if (!groups.has(b.whAmount)) groups.set(b.whAmount, [])
                          groups.get(b.whAmount)!.push(b)
                        }
                        const sorted = Array.from(groups.entries()).sort((a, b) => b[0] - a[0])
                        return (
                          <div className="pointer-events-auto flex flex-col gap-1 overflow-hidden rounded-[18px] border border-white/8 bg-slate-950/62 px-2 py-2 shadow-[0_0_24px_rgba(52,211,153,0.06)] backdrop-blur-md">
                            <p className="px-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-100/50 mb-0.5">Batteries</p>
                            {sorted.map(([wh, batteries]) => (
                              <button key={wh} type="button" onClick={() => handleUseBattery(batteries[0].id)}
                                className="flex items-center justify-between gap-2 rounded-[12px] border border-emerald-400/15 bg-slate-900/60 px-2.5 py-1.5 transition hover:border-emerald-300/40 hover:bg-emerald-950/40">
                                <span className="text-[10px] font-semibold text-emerald-100/80">+{Math.round(wh).toLocaleString()} Wh</span>
                                <div className="flex items-center gap-1">
                                  <span className="rounded-full bg-slate-800 px-1.5 py-px text-[9px] font-bold text-emerald-400">×{batteries.length}</span>
                                  <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-1.5 py-px text-[9px] font-bold uppercase text-emerald-200">Use</span>
                                </div>
                              </button>
                            ))}
                            {batteryFeedback && <p className="mt-0.5 px-1 text-[9px] text-emerald-300/80">{batteryFeedback}</p>}
                          </div>
                        )
                      })()}
                    </div>

                    {/* Pool Allocation */}
                    <div className="pointer-events-auto absolute left-4 top-24 z-40 w-[220px]">
                      <PoolAllocationPanel allocation={allocation} onSaved={refreshAllocation} />
                    </div>

                    <GarageRackOverlay userId={userId} currentTflops={roomGaugesData.totalTFlops} />

                    <GarageRoomIndicators
                      items={[
                        {
                          label: 'SYNAPSE POWER',
                          value: roomEffectiveSP.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' SP',
                          gauge: { value: roomEffectiveSP, max: Math.max(roomEffectiveSP * 1.2, 1000), color: 'cyan' }
                        },
                        { label: 'Power',       value: `${roomGaugesData.totalPower.toLocaleString()}W / ${roomGaugesData.maxPower.toLocaleString()}W`, gauge: { value: roomGaugesData.totalPower, max: roomGaugesData.maxPower, color: 'red' } },
                        { label: 'Stability',   value: `${Math.round(roomGaugesData.avgStability)}%`,  gauge: { value: roomGaugesData.avgStability,  max: 100, color: 'emerald' } },
                        { label: 'Temperature', value: `${Math.round(roomGaugesData.avgTemperature)}°C`, gauge: { value: roomGaugesData.avgTemperature, max: 120, color: 'amber' } },
                        { label: 'Components',  value: `${roomGaugesData.installedComponents} / ${roomGaugesData.maxComponents}` },
                      ]}
                      placement="bottom"
                    />

                    {rackZoomButtons.map((btn) => (
                      <button key={btn.id} type="button" onClick={() => setZoomedRackId(btn.id)}
                        className="absolute z-40 cursor-zoom-in rounded-sm transition-all focus:outline-none hover:ring-2 hover:ring-cyan-400/50 hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                        style={{ left: btn.left, top: btn.top, width: btn.width, height: btn.height }}
                        aria-label={`Ver RACK 0${btn.id} en detalle`}
                      />
                    ))}
                  </div>
                </div>

                {zoomedRackId !== null && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-black/75 backdrop-blur-sm" onClick={() => setZoomedRackId(null)}>
                    <div className="custom-scrollbar relative overflow-y-auto rounded-2xl border border-cyan-400/20 bg-slate-950 p-4 shadow-[0_0_60px_rgba(34,211,238,0.15)]"
                      style={{ width: '1400px', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
                          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-100">RACK 0{zoomedRackId}</span>
                          <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-[2px] text-[8px] font-black uppercase tracking-widest text-emerald-200">ACTIVE</span>
                        </div>
                        <button type="button" onClick={() => setZoomedRackId(null)} className="text-lg leading-none text-slate-500 transition-colors hover:text-slate-200">✕</button>
                      </div>
                      <RackZoomGrid rackId={zoomedRackId} userId={userId} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'laboratory'  && <LaboratoryEditor userId={userId} />}
          {activeSection === 'store'        && <StorePage userId={userId} />}
          {activeSection === 'marketplace'  && <MarketplacePage />}
          {activeSection === 'wallet'       && <WalletPage userId={userId} />}
          {activeSection === 'games'        && (
            <GamesPage onNavigate={(path) => {
              const next = resolveSectionFromPath(path)
              startTransition(() => setActiveSection(next))
              if (window.location.pathname !== path) window.history.pushState({}, '', path)
            }} />
          )}
          {activeSection === 'neural-link'  && <NeuralLink  onExit={() => { startTransition(() => setActiveSection('games')); window.history.pushState({}, '', '/games') }} />}
          {activeSection === 'packet-storm' && <PacketStorm onExit={() => { startTransition(() => setActiveSection('games')); window.history.pushState({}, '', '/games') }} />}
          {activeSection === 'net-rush'     && <NetRush     onExit={() => { startTransition(() => setActiveSection('games')); window.history.pushState({}, '', '/games') }} />}
          {activeSection === 'profile'      && (
            <ProfilePage userId={userId} onBack={() => { startTransition(() => setActiveSection('dashboard')); window.history.pushState({}, '', '/dashboard') }} />
          )}
        </div>
      </DashboardLayout>
    </div>
  )
}