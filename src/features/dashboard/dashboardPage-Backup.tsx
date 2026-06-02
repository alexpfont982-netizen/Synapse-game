/* eslint-disable react-refresh/only-export-components */
import {
  LayoutDashboard,
  Wallet,
  Cpu,
  Zap,
  Terminal,
  Trophy,
  Settings
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

// Definición de interfaz para asegurar la consistencia en todo el dashboard
export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'laboratory', label: 'Laboratory', icon: Cpu },
  { id: 'equipment', label: 'Equipment', icon: Settings },
  { id: 'benchmark', label: 'Benchmark', icon: Zap },
  { id: 'marketplace', label: 'Marketplace', icon: Wallet },
  { id: 'wallet', label: 'Wallet', icon: Terminal },
  { id: 'achievements', label: 'Achievements', icon: Trophy }
];

export const benchmarkPanel = {
  title: "Benchmark",
  subtitle: "Neural Mesh Sprint",
  description: "Active summary of the current competitive hashing cycle.",
  timeRemaining: "01h 42m",
  timeLabel: "Time remaining",
  userPosition: "#128 / 4,832",
  positionLabel: "Player Position",
  projectedReward: "3,200 NCR",
  rewardLabel: "Projected Reward",
  bonusText: "TOP 5% KEEPS TACTICAL BONUS",
  detailsButtonText: "View Details",
  disclaimer: "Simulated data until the real competitive system is integrated."
};

export const labOverview = {
  roomName: "Garage Lab",
  infrastructureLevel: 1,
  cycleProduction: "0.08 TTLOPS",
  availableEnergy: "67%",
  progress: 2,
  activatedGpus: 2,
  totalGpuSlots: 96,
  stats: [
    { label: "Computing Power", value: "0.08 TTLOPS" },
    { label: "Storage Capacity", value: "256 GB" },
    { label: "System Memory", value: "16 GB" },
    { label: "Active GPUs", value: "2 / 96" },
    { label: "Power Draw", value: "120 W" },
    { label: "Efficiency Rating", value: "-- %" }
  ],
  currentTask: {
    title: "Current Objective",
    description: "Install your first GPU. Insert a GPU card into any available slot to begin hashing."
  }
};
const DashboardPage = () => {
  return (
    <div>
      <h1>Synapse Dashboard</h1>
      <p>{labOverview.roomName}</p>
    </div>
  );
};

export default DashboardPage;
