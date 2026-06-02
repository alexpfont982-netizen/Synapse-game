import type { AccentTone } from './types'

export const toneStyles: Record<
  AccentTone,
  {
    cardBorder: string
    glow: string
    icon: string
    badge: string
    text: string
  }
> = {
  violet: {
    cardBorder: 'border-fuchsia-400/16',
    glow: 'from-fuchsia-500/20 via-violet-500/10 to-transparent',
    icon: 'border-fuchsia-400/20 bg-fuchsia-500/15 text-fuchsia-200',
    badge: 'bg-fuchsia-500/12 text-fuchsia-200',
    text: 'text-fuchsia-200',
  },
  cyan: {
    cardBorder: 'border-cyan-400/18',
    glow: 'from-cyan-400/20 via-sky-500/10 to-transparent',
    icon: 'border-cyan-400/20 bg-cyan-400/15 text-cyan-100',
    badge: 'bg-cyan-400/12 text-cyan-100',
    text: 'text-cyan-100',
  },
  blue: {
    cardBorder: 'border-blue-400/18',
    glow: 'from-blue-500/18 via-indigo-500/10 to-transparent',
    icon: 'border-blue-400/20 bg-blue-500/15 text-blue-100',
    badge: 'bg-blue-500/12 text-blue-100',
    text: 'text-blue-100',
  },
}
