import type { ArenaBox, PanelDefinition, Vec3Tuple } from './labDuelTypes'

export const MATCH_DURATION_SECONDS = 180
export const STARTING_HEALTH = 3
export const PLAYER_HEIGHT = 1.6
export const PLAYER_RADIUS = 0.55
export const PLAYER_SPEED = 6.4
export const SHOT_RANGE = 34
export const BOT_RANGE = 20
export const BOT_FIRE_INTERVAL_MS = 1650
export const BOT_ACCURACY = 0.68
export const BOT_EYE_HEIGHT = 1.45
export const BOT_HIT_RADIUS = 0.8
export const BOT_STRAFE_AMPLITUDE = 2.4
export const BOT_STRAFE_SPEED = 0.9
export const LOW_TIME_THRESHOLD = 30
export const CRITICAL_TIME_THRESHOLD = 15
export const BOT_DISPLAY_NAME = 'ANDROID UNIT'

export const PLAYER_SPAWN: Vec3Tuple = [8.05, PLAYER_HEIGHT, 9]
export const BOT_ANCHOR: Vec3Tuple = [8.05, 0, -6.8]

export const WALL_BOXES: ArenaBox[] = [
  { id: 'north-wall', position: [0, 2, -12], size: [22, 4, 1], tone: 'cyan' },
  { id: 'south-wall', position: [0, 2, 12], size: [22, 4, 1], tone: 'cyan' },
  { id: 'west-wall', position: [-11, 2, 0], size: [1, 4, 24], tone: 'cyan' },
  { id: 'east-wall', position: [11, 2, 0], size: [1, 4, 24], tone: 'cyan' },
  { id: 'central-column', position: [0, 2, 0], size: [4, 4, 4], tone: 'violet' },
  { id: 'left-upper-divider', position: [-5.8, 2, -4.8], size: [1, 4, 7.8], tone: 'slate' },
  { id: 'right-upper-divider', position: [5.8, 2, -4.8], size: [1, 4, 7.8], tone: 'slate' },
  { id: 'left-lower-divider', position: [-5.8, 2, 4.8], size: [1, 4, 7.8], tone: 'slate' },
  { id: 'right-lower-divider', position: [5.8, 2, 4.8], size: [1, 4, 7.8], tone: 'slate' },
  { id: 'north-bridge', position: [0, 2, -8.6], size: [6.4, 4, 1], tone: 'amber' },
  { id: 'south-bridge', position: [0, 2, 8.6], size: [6.4, 4, 1], tone: 'amber' },
]

export const RACK_DISPLAY_LABELS = ['GPU NODE', 'TEMP', 'POWER', 'STATUS', 'SYNAPSE']

export const PANEL_DEFINITIONS: PanelDefinition[] = [
  {
    id: 'panel-south-left',
    position: [-2.8, 1.45, 4.2],
    size: [0.55, 2.8, 3],
    maxHealth: 3,
    tone: 'cyan',
  },
  {
    id: 'panel-south-right',
    position: [2.8, 1.45, 4.2],
    size: [0.55, 2.8, 3],
    maxHealth: 3,
    tone: 'cyan',
  },
  {
    id: 'panel-north-left',
    position: [-2.8, 1.45, -4.2],
    size: [0.55, 2.8, 3],
    maxHealth: 3,
    tone: 'violet',
  },
  {
    id: 'panel-north-right',
    position: [2.8, 1.45, -4.2],
    size: [0.55, 2.8, 3],
    maxHealth: 3,
    tone: 'violet',
  },
]
