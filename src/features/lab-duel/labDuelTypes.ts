export type DuelPhase = 'intro' | 'playing' | 'finished'

export type DuelResultTone = 'emerald' | 'rose' | 'amber' | 'cyan'

export type DuelResultTitle =
  | 'Victory'
  | 'Defeat'
  | 'Draw'
  | 'Laboratory Explosion'

export type Vec3Tuple = [number, number, number]

export type ArenaTone = 'cyan' | 'slate' | 'violet' | 'amber'

export type ShotImpactKind = 'android' | 'panel' | 'wall' | 'player'

export interface ArenaBox {
  id: string
  position: Vec3Tuple
  size: Vec3Tuple
  tone?: ArenaTone
}

export interface PanelDefinition extends ArenaBox {
  maxHealth: number
}

export interface PanelState extends PanelDefinition {
  health: number
  destroyed: boolean
}

export interface ShotEffect {
  id: number
  from: Vec3Tuple
  to: Vec3Tuple
  color: string
  impactKind?: ShotImpactKind
}

export interface DuelResult {
  title: DuelResultTitle
  subtitle: string
  tone: DuelResultTone
}

export interface DuelStats {
  timeLeft: number
  playerHealth: number
  rivalHealth: number
  hitsLanded: number
  hitsTaken: number
  panelsDestroyed: number
  statusLabel: string
  controlsLocked: boolean
}
