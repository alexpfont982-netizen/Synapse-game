import { startTransition, useEffect, useMemo, useState } from 'react';
import { TopResourceBar } from './components/TopResourceBar';
import {
  benchmarkPanel,
  navItems,
  roomIndicators,
} from './mockDashboardData';
import { AdSlot } from './components/AdSlot';
import { BenchmarkPanel } from './components/BenchmarkPanel';
import { DashboardLayout } from './components/DashboardLayout';
import { Sidebar } from './components/Sidebar';
import { type DashboardHardwarePiece } from './components/DashboardRackMonitor';
import { LaboratoryEditor } from './components/LaboratoryEditor';

import garageLevelOneHero from '../../assets/dashboard/garage-room-01.png';
import { GarageRackOverlay } from './components/GarageRackOverlay';
import { GarageRoomIndicators } from './components/GarageRoomIndicators';
import StorePage from '../store/pages/StorePage';
import MarketplacePage from '../marketplace/pages/MarketplacePage';
import GamesPage from '../../pages/GamesPage'
import NeuralLink from '../neural-link/NeuralLink'
import PacketStorm from '../packet-storm/PacketStorm'
import NetRush from '../net-rush/NetRush'
import { PowerSupplyAnimated } from './components/PowerSupplyAnimated'
import {
  selectMockHardwarePieces,
  useMockPlayerState,
  type MockHardwarePiece,
} from '../../data/supabasePlayerState'
import RackStatusPanel from './components/RackStatusPanel';
import { computeRackStatus } from './utils/computeRackStatus';

interface DashboardPageProps {
  session: {
    id: string;
    email?: string;
  };
  onSignOut: () => void;
}

const navItemsByPath = new Map(
  navItems.map((item) => [item.path.replace(/\/$/, '') || '/', item]),
)

const legacyDashboardPathMap = new Map<string, string>([
  ['/', 'dashboard'],
  ['/dashboard', 'dashboard'],
  ['/laboratory', 'laboratory'],
  ['/equipment', 'equipment'],
  ['/benchmark', 'benchmark'],
  ['/store', 'store'],
  ['/marketplace', 'marketplace'],
  ['/wallet', 'wallet'],
  ['/achievements', 'achievements'],
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
  if (navItemsByPath.has(normalizedPath)) {
    return navItemsByPath.get(normalizedPath)?.id ?? 'dashboard'
  }
  return legacyDashboardPathMap.get(normalizedPath) ?? 'dashboard'
}

function getCanonicalPath(sectionId: string) {
  if (sectionId === 'neural-link') return '/games/neural-link'
  if (sectionId === 'packet-storm') return '/games/packet-storm'
  if (sectionId === 'net-rush') return '/games/net-rush'
  return navItems.find((item) => item.id === sectionId)?.path ?? '/dashboard'
}

// ── Coordenadas de los botones invisibles sobre cada rack ─────────
// Ajusta left/width si los racks en tu imagen están en posiciones distintas
const rackZoomButtons = [
  { id: 1, left: '26.5%', top: '31%', width: '10%', height: '38%' },
  { id: 2, left: '37.8%', top: '31%', width: '10%', height: '38%' },
  { id: 3, left: '49.4%', top: '31%', width: '10%', height: '38%' },
  { id: 4, left: '61.2%', top: '31%', width: '10%', height: '38%' },
]

// ── ZoomSlot ─────────────────────────────────────────────────────
function ZoomSlot({ item }: { item: MockHardwarePiece | null }) {
  if (!item) {
    return (
      <div className="h-[72px] flex-1 rounded-lg border border-dashed border-slate-700/50 bg-slate-900/40" />
    )
  }

  const isCooling = item.type === 'COOLING'
  const isPSU = item.brand === 'RustCore' && item.model === 'PS_350A' && item.condition === 'New'

  return (
    <div className="relative h-[72px] flex-1 overflow-hidden rounded-lg border border-slate-600/30 bg-slate-900/80">
      {isCooling && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center animate-spin"
          style={{ animationDuration: '3s' }}
        >
          <div className="h-4/5 w-4/5 rounded-full border-2 border-dashed border-sky-400/40" />
        </div>
      )}

      {isPSU ? (
        <PowerSupplyAnimated src={item.image} alt={item.name} />
      ) : (
        <img
          src={item.image}
          alt={item.name}
          draggable={false}
          className={`h-full w-full object-contain p-1 select-none ${isCooling ? 'mix-blend-multiply' : ''}`}
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
        <p className="truncate text-[8px] font-bold text-slate-200">{item.name}</p>
        <p className="text-[7px] uppercase tracking-wider text-slate-400">{item.condition}</p>
      </div>
    </div>
  )
}

// ── RackZoomGrid ──────────────────────────────────────────────────
function RackZoomGrid({ rackId }: { rackId: number }) {
  const { inventory } = useMockPlayerState()

  const hardwarePieces = useMemo(
    () => selectMockHardwarePieces(inventory),
    [inventory],
  )

  const slotMap = useMemo(() => {
    const r = `rack${rackId}`
    const map: Record<string, MockHardwarePiece | null> = {
      [`${r}-power1`]: null,
      [`${r}-power2`]: null,
      [`${r}-cable-kit1`]: null,
      [`${r}-cable-kit2`]: null,
      [`${r}-cooling1`]: null,
      [`${r}-cooling2`]: null,
      [`${r}-storage1`]: null,
      [`${r}-storage2`]: null,
    }
    for (let i = 1; i <= 6; i++) {
      map[`${r}-mem${i}`] = null
      map[`${r}-gpu${i}`] = null
    }
    hardwarePieces.forEach((p) => {
      if (p.slot_id && p.slot_id in map) map[p.slot_id] = p
    })
    return map
  }, [hardwarePieces, rackId])

  const g = (id: string) => slotMap[id] ?? null
  const installedPieces = Object.values(slotMap).filter(
    (p): p is MockHardwarePiece => p != null
  )

  const r = `rack${rackId}`
  const sections = [
    {
      label: 'Power System',
      color: 'text-amber-300/70',
      slots: [`${r}-power1`, `${r}-power2`],
      cols: 2,
    },
    {
      label: 'Power Cables',
      color: 'text-slate-300/70',
      slots: [`${r}-cable-kit1`, `${r}-cable-kit2`],
      cols: 2,
    },
    {
      label: 'Cooling System',
      color: 'text-sky-300/70',
      slots: [`${r}-cooling1`, `${r}-cooling2`],
      cols: 2,
    },
    {
      label: 'Storage Bay',
      color: 'text-emerald-300/70',
      slots: [`${r}-storage1`, `${r}-storage2`],
      cols: 2,
    },
    {
      label: 'Memory Bank',
      color: 'text-purple-300/70',
      slots: [`${r}-mem1`, `${r}-mem2`, `${r}-mem3`, `${r}-mem4`, `${r}-mem5`, `${r}-mem6`],
      cols: 3,
    },
    {
      label: 'GPU Array',
      color: 'text-cyan-300/70',
      slots: [`${r}-gpu1`, `${r}-gpu2`, `${r}-gpu3`, `${r}-gpu4`, `${r}-gpu5`, `${r}-gpu6`],
      cols: 3,
    },
  ]

  return (
    <div className="flex gap-4">
      <div className="w-44 shrink-0 self-start sticky top-0">
        <RackStatusPanel
          {...computeRackStatus(installedPieces)}
          variant="compact"
        />
      </div>
      <div className="flex flex-col gap-2 w-[320px] shrink-0">
        {sections.map((section) => (
          <div key={section.label}>
            <p className={`mb-1 text-[8px] font-black uppercase tracking-[0.22em] ${section.color}`}>
              {section.label}
            </p>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${section.cols}, 1fr)` }}
            >
              {section.slots.map((id) => (
                <ZoomSlot key={id} item={g(id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DashboardPage ─────────────────────────────────────────────────
export default function DashboardPage({
  session,
  onSignOut,
}: DashboardPageProps) {
  const [activeSection, setActiveSection] = useState(() =>
    resolveSectionFromPath(window.location.pathname),
  )
  // null = ningún rack abierto; 1-4 = rack abierto
  const [zoomedRackId, setZoomedRackId] = useState<number | null>(null)

  const { balance, inventory } = useMockPlayerState()
  const userEmail = session.email ?? 'Unknown user'
  const isLaboratorySection =
    activeSection === 'laboratory' ||
    activeSection === 'neural-link' ||
    activeSection === 'packet-storm' ||
    activeSection === 'net-rush'

  useEffect(() => {
    const syncFromLocation = () => {
      const nextSection = resolveSectionFromPath(window.location.pathname)
      setActiveSection((current) =>
        current === nextSection ? current : nextSection,
      )
      const canonicalPath = getCanonicalPath(nextSection)
      const normalizedPath = normalizePathname(window.location.pathname)
      if (
        canonicalPath !== normalizedPath &&
        nextSection !== 'games' &&
        nextSection !== 'neural-link' &&
        nextSection !== 'packet-storm' &&
        nextSection !== 'net-rush'
      ) {
        window.history.replaceState({}, '', canonicalPath)
      }
    }

    syncFromLocation()
    window.addEventListener('popstate', syncFromLocation)

    return () => {
      window.removeEventListener('popstate', syncFromLocation)
    }
  }, [])

  const installedHardware = useMemo<DashboardHardwarePiece[]>(
    () =>
      selectMockHardwarePieces(inventory).filter(
        (piece) => piece.slot_id !== null,
      ),
    [inventory],
  )

  const hardwareStats = useMemo(() => {
    let tflops = 0
    let power = 0
    let heat = 22
    let cooling = 0
    let activeGpus = 0

    installedHardware.forEach((piece) => {
      const stats = piece.stats ?? { tflops: 0, power: 0, heat: 0 }
      power += stats.power ?? 0
      if (piece.type === 'GPU') {
        tflops += stats.tflops ?? 0
        heat += Math.max(0, stats.heat ?? 0)
        activeGpus += 1
        return
      }
      if (piece.type === 'COOLING') {
        cooling += Math.abs(stats.heat ?? 0)
        return
      }
      heat += Math.max(0, stats.heat ?? 0)
    })

    return {
      tflops,
      power,
      heat: Math.max(20, heat - cooling),
      activeGpus,
    }
  }, [installedHardware])

  return (
    <div className="dashboard-container">
      {activeSection === 'dashboard' && (
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-400">
          <span>Logged as: {userEmail}</span>
          <button
            onClick={onSignOut}
            className="text-red-400 transition-colors hover:text-red-300"
          >
            Sign Out
          </button>
        </div>
      )}

      <DashboardLayout
        sidebar={
          <Sidebar
            items={navItems}
            activeItem={activeSection}
            onSelect={(item) => {
              startTransition(() => setActiveSection(item.id))
              if (window.location.pathname !== item.path) {
                window.history.pushState({}, '', item.path)
              }
            }}
          />
        }
        topBar={
          activeSection === 'dashboard' ? (
            <TopResourceBar
              performanceScore={Math.round(hardwareStats.tflops * 100)}
              balance={balance}
            />
          ) : null
        }
        aside={
          activeSection === 'dashboard' ? (
            <div className="relative z-30 space-y-3">
              <BenchmarkPanel
                benchmark={benchmarkPanel}
                performanceScore={Math.round(hardwareStats.tflops * 100)}
              />
              <AdSlot position="right-rail" size="300x250" label="Ad space" />
            </div>
          ) : null
        }
      >
        <div
          className={`flex h-full w-full justify-center animate-in fade-in duration-300 ${isLaboratorySection ? 'items-start p-0' : 'items-center p-4'
            }`}
        >
          {activeSection === 'dashboard' && (
            <div className="relative w-full max-w-[1360px] pb-28 xl:pb-0">
              <div className="relative aspect-video xl:ml-24">

                {/* ── Contenedor principal del garage ── */}
                <div className="absolute inset-0 overflow-hidden rounded-xl border border-slate-800/60 bg-[#0a0f16] shadow-[0_0_40px_rgba(34,211,238,0.05)]">
                  <img
                    src={garageLevelOneHero}
                    alt="Garage Base"
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/15 via-transparent to-slate-950/35" />

                  <GarageRackOverlay />
                  <GarageRoomIndicators
                    items={roomIndicators.bottom}
                    placement="bottom"
                  />

                  {/* ── Botones invisibles sobre cada rack ── */}
                  {rackZoomButtons.map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setZoomedRackId(btn.id)}
                      className="absolute z-40 cursor-zoom-in rounded-sm transition-all focus:outline-none hover:ring-2 hover:ring-cyan-400/50 hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                      style={{
                        left: btn.left,
                        top: btn.top,
                        width: btn.width,
                        height: btn.height,
                      }}
                      aria-label={`Ver RACK 0${btn.id} en detalle`}
                    />
                  ))}
                </div>

                {/* ── Modal de zoom del rack ── */}
                {zoomedRackId !== null && (
                  <div
                    className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-black/75 backdrop-blur-sm"
                    onClick={() => setZoomedRackId(null)}
                  >
                    <div
                      className="custom-scrollbar relative overflow-y-auto rounded-2xl border border-cyan-400/20 bg-slate-950 p-4 shadow-[0_0_60px_rgba(34,211,238,0.15)]"
                      style={{ width: '600px', maxHeight: '90%' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
                          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-100">
                            RACK 0{zoomedRackId}
                          </span>
                          <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-[2px] text-[8px] font-black uppercase tracking-widest text-emerald-200">
                            ACTIVE
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setZoomedRackId(null)}
                          className="text-lg leading-none text-slate-500 transition-colors hover:text-slate-200"
                        >
                          ✕
                        </button>
                      </div>
                      <RackZoomGrid rackId={zoomedRackId} />
                    </div>
                  </div>
                )}
              </div>

              <GarageRoomIndicators
                items={roomIndicators.side}
                placement="side"
              />
            </div>
          )}

          {activeSection === 'laboratory' && <LaboratoryEditor />}
          {activeSection === 'store' && <StorePage />}
          {activeSection === 'marketplace' && <MarketplacePage />}
          {activeSection === 'games' && (
            <GamesPage
              onNavigate={(path) => {
                const next = resolveSectionFromPath(path)
                startTransition(() => setActiveSection(next))
                if (window.location.pathname !== path) {
                  window.history.pushState({}, '', path)
                }
              }}
            />
          )}
          {activeSection === 'neural-link' && (
            <NeuralLink onExit={() => {
              startTransition(() => setActiveSection('games'))
              window.history.pushState({}, '', '/games')
            }} />
          )}
          {activeSection === 'packet-storm' && (
            <PacketStorm onExit={() => {
              startTransition(() => setActiveSection('games'))
              window.history.pushState({}, '', '/games')
            }} />
          )}
          {activeSection === 'net-rush' && (
            <NetRush onExit={() => {
              startTransition(() => setActiveSection('games'))
              window.history.pushState({}, '', '/games')
            }} />
          )}
        </div>
      </DashboardLayout>
    </div>
  )
}