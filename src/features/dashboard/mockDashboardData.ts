import {
  ArrowLeftRight,
  Cpu,
  Gamepad2,
  LayoutDashboard,
  Settings,
  Store as StoreIcon,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react'
import type {
  BenchmarkPanelData,
  NavItem,
  RoomIndicatorsData,
} from './types'

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'laboratory', label: 'Laboratory', icon: Cpu, path: '/dashboard/laboratory' },
  { id: 'equipment', label: 'Equipment', icon: Settings, path: '/dashboard/equipment' },
  { id: 'benchmark', label: 'Benchmark', icon: Zap, path: '/dashboard/benchmark' },
  { id: 'games', label: 'Games', icon: Gamepad2, path: '/games' },
  { id: 'store', label: 'Store', icon: StoreIcon, path: '/dashboard/store' },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: ArrowLeftRight,
    path: '/dashboard/marketplace',
  },
  { id: 'wallet', label: 'Wallet', icon: Wallet, path: '/dashboard/wallet' },
  { id: 'achievements', label: 'Achievements', icon: Trophy, path: '/dashboard/achievements' },
]

export const benchmarkPanel: BenchmarkPanelData = {
  title: 'Benchmark',
  subtitle: 'Neural Mesh Sprint',
  description: 'Active summary of the current competitive hashing cycle.',
  timeRemaining: '01h 42m',
  timeLabel: 'Time remaining',
  userPosition: '#128 / 4,832',
  positionLabel: 'Player Position',
  projectedReward: '3,200 NCR',
  rewardLabel: 'Projected Reward',
  bonusText: 'TOP 5% KEEPS TACTICAL BONUS',
  detailsButtonText: 'View Details',
  disclaimer: 'Simulated data until the real competitive system is integrated.',
}

export const labOverview = {
  roomName: 'Garage Lab',
  infrastructureLevel: 1,
  cycleProduction: '0.08 TTLOPS',
  availableEnergy: '67%',
  progress: 2,
  activatedGpus: 2,
  totalGpuSlots: 96,
  stats: [
    { label: 'Computing Power', value: '0.08 TTLOPS' },
    { label: 'Storage Capacity', value: '256 GB' },
    { label: 'System Memory', value: '16 GB' },
    { label: 'Active GPUs', value: '2 / 96' },
    { label: 'Power Draw', value: '120 W' },
    { label: 'Efficiency Rating', value: '-- %' },
  ],
  currentTask: {
    title: 'Current Objective',
    description:
      'Install your first GPU. Insert a GPU card into any available slot to begin hashing.',
  },
}

export const roomIndicators: RoomIndicatorsData = {
  bottom: [
    { label: 'Racks Active', value: '1 / 4' },
    { label: 'Production Rate', value: '18 NCR/h' },
    { label: 'Energy Load', value: '420W / 800W' },
    { label: 'Temperature', value: '64°C · Stable' },
  ],
  side: [
    { label: 'Room Efficiency', value: '72%' },
    { label: 'Components Installed', value: '5 / 20' },
  ],
}
