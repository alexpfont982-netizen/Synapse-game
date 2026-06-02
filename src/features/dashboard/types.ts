import type { LucideIcon } from 'lucide-react'

export type AccentTone = 'violet' | 'cyan' | 'blue'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
}

export interface ResourceCardData {
  id: string
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone: AccentTone
}

export interface LabOverviewData {
  title: string
  description: string
  progress: number
  nextLevelLabel: string
  cycleWindow: string
  cycleProduction: string
  energyReserve: string
  efficiency: string
}

export interface BenchmarkPanelData {
  title: string
  subtitle: string
  description: string
  timeRemaining: string
  timeLabel: string
  userPosition: string
  positionLabel: string
  projectedReward: string
  rewardLabel: string
  bonusText: string
  detailsButtonText: string
  disclaimer: string
}

export interface RoomIndicatorItem {
  label: string
  value: string
}

export interface RoomIndicatorsData {
  bottom: RoomIndicatorItem[]
  side: RoomIndicatorItem[]
}
