import { startTransition, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
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
type ComponentType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
  | 'ROOM_FAN'
  | 'ROOM_EXTRACTOR'
  | 'CONSUMABLE';

function normalizeHardwareType(type: string): ComponentType {
  if (type === 'FAN') return 'ROOM_FAN';
  if (type === 'EXTRACTOR') return 'ROOM_EXTRACTOR';
  if (type === 'CABLE') return 'CABLE_KIT';
  if (type === 'SSD' || type === 'HDD' || type === 'NVME') return 'STORAGE';
  if (type === 'POWER') return 'POWER_UNIT';

  return type as ComponentType;
}

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
  if (!pathname) {
    return '/'
  }

  return pathname.replace(/\/+$/, '') || '/'
}

function resolveSectionFromPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname)

  if (navItemsByPath.has(normalizedPath)) {
    return navItemsByPath.get(normalizedPath)?.id ?? 'dashboard'
  }

  return legacyDashboardPathMap.get(normalizedPath) ?? 'dashboard'
}

function getCanonicalPath(sectionId: string) {
  return navItems.find((item) => item.id === sectionId)?.path ?? '/dashboard'
}

export default function DashboardPage({
  session,
  onSignOut,
}: DashboardPageProps) {
  const [balance, setBalance] = useState(0);
  const [activeSection, setActiveSection] = useState(() =>
    resolveSectionFromPath(window.location.pathname),
  );
  const [installedHardware, setInstalledHardware] = useState<
    DashboardHardwarePiece[]
  >([]);
  const userEmail = session.email ?? 'Unknown user';

  useEffect(() => {
    const syncFromLocation = () => {
      const nextSection = resolveSectionFromPath(window.location.pathname)

      setActiveSection((current) =>
        current === nextSection ? current : nextSection,
      )

      const canonicalPath = getCanonicalPath(nextSection)
      const normalizedPath = normalizePathname(window.location.pathname)

      if (canonicalPath !== normalizedPath && nextSection !== 'games') {
        window.history.replaceState({}, '', canonicalPath)
      }
    }

    syncFromLocation()
    window.addEventListener('popstate', syncFromLocation)

    return () => {
      window.removeEventListener('popstate', syncFromLocation)
    }
  }, [])

  useEffect(() => {
    async function fetchHardware() {
      const { data, error } = await supabase.from('user_hardware').select('*');

      if (!error && data) {
        setInstalledHardware(
          data
            .filter((piece) => piece.slot_id !== null)
            .map((piece) => ({
              id: piece.id,
              type: normalizeHardwareType(piece.type),
              name: piece.name,
              slot_id: piece.slot_id,
              stats:
                (piece.stats as DashboardHardwarePiece['stats'] | null) ?? null,
            })),
        );
      }
    }

    async function fetchBalance() {
      const { data, error } = await supabase
        .from('user_economy')
        .select('ncr_balance')
        .eq('id', 'player-1')
        .single();

      if (!error && data) {
        setBalance(data.ncr_balance);
      }
    }

    fetchHardware();
    fetchBalance();

    const hardwareChannel = supabase
      .channel('dashboard:user_hardware')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_hardware' },
        fetchHardware,
      )
      .subscribe();

    const economyChannel = supabase
      .channel('dashboard:user_economy')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_economy' },
        fetchBalance,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(hardwareChannel);
      supabase.removeChannel(economyChannel);
    };
  }, []);

  const hardwareStats = useMemo(() => {
    let tflops = 0;
    let power = 0;
    let heat = 22;
    let cooling = 0;
    let activeGpus = 0;

    installedHardware.forEach((piece) => {
      const stats = piece.stats ?? { tflops: 0, power: 0, heat: 0 };

      power += stats.power ?? 0;

      if (piece.type === 'GPU') {
        tflops += stats.tflops ?? 0;
        heat += Math.max(0, stats.heat ?? 0);
        activeGpus += 1;
        return;
      }

      if (piece.type === 'ROOM_FAN' || piece.type === 'ROOM_EXTRACTOR') {
        cooling += Math.abs(stats.heat ?? 0);
        return;
      }

      heat += Math.max(0, stats.heat ?? 0);
    });

    return {
      tflops,
      power,
      heat: Math.max(20, heat - cooling),
      activeGpus,
    };
  }, [installedHardware]);

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-400">
        <span>Logged as: {userEmail}</span>
        <button
          onClick={onSignOut}
          className="text-red-400 transition-colors hover:text-red-300"
        >
          Sign Out
        </button>
      </div>

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
        <div className="flex h-full w-full items-center justify-center p-4 animate-in fade-in duration-300">
          {activeSection === 'dashboard' && (
            <div className="relative w-full max-w-[1360px] pb-28 xl:pb-0">
              <div className="relative aspect-video xl:ml-24">
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

                  {/* <VisualLabOverlay hardware={installedHardware} /> */}
                </div>
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
        </div>
      </DashboardLayout>
    </div>
  );
}
