import { useEffect, useRef } from 'react'

// Posiciones de los 4 LEDs tomadas del HTML original (rustcore_original_anim.html)
// Cada LED: { left, top, width, height } en % relativo a la imagen
const LEDS = [
  { id: 'l1', left: 19.92, top: 15.14, w: 6.51, h: 1.66, color: '#00dcff', glow: '#00ccff' },
  { id: 'l2', left: 70.96, top: 15.14, w: 5.53, h: 1.66, color: '#00b4ff', glow: '#0088ff' },
  { id: 'l3', left: 35.87, top: 61.52, w: 2.93, h: 1.95, color: '#0078ff', glow: '#0055ff' },
  { id: 'l4', left: 83.20, top: 81.64, w: 2.21, h: 1.46, color: '#00c8ff', glow: '#00aaff' },
]

// 4 frames: opacidad de cada LED [l1, l2, l3, l4]
const FRAMES = [
  [1,    0.15, 0,    0   ],
  [0.2,  1,    1,    0   ],
  [1,    0.15, 0,    1   ],
  [0.7,  1,    1,    1   ],
]

const GLOWS = [
  ['0 0 14px 5px #00ccff, 0 0 35px 10px rgba(0,200,255,0.4)', '0 0 3px 1px rgba(0,100,100,0.3)'],
  ['0 0 10px 3px #0088ff', '0 0 2px 1px rgba(0,50,100,0.2)'],
  ['0 0 12px 5px #0055ff, 0 0 25px 8px rgba(0,80,255,0.3)', 'none'],
  ['0 0 10px 3px #00aaff', 'none'],
]

const FPS = 4

interface PowerSupplyAnimatedProps {
  src: string
  alt?: string
}

export function PowerSupplyAnimated({ src, alt = 'Power Supply' }: PowerSupplyAnimatedProps) {
  const ledRefs = useRef<(HTMLDivElement | null)[]>([])
  const frameRef = useRef(0)

  useEffect(() => {
    const tick = () => {
      frameRef.current = (frameRef.current + 1) % 4
      const f = frameRef.current
      FRAMES[f].forEach((opacity, j) => {
        const el = ledRefs.current[j]
        if (!el) return
        el.style.opacity = String(opacity)
        el.style.boxShadow = opacity > 0.4 ? GLOWS[j][0] : GLOWS[j][1]
      })
    }

    const iv = setInterval(tick, 1000 / FPS)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="relative h-full w-full">
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="h-full w-full object-contain p-1 select-none"
      />

      {LEDS.map((led, i) => (
        <div
          key={led.id}
          ref={(el) => { ledRefs.current[i] = el }}
          className="pointer-events-none absolute rounded-sm"
          style={{
            left:    `${led.left}%`,
            top:     `${led.top}%`,
            width:   `${led.w}%`,
            height:  `${led.h}%`,
            background: led.color,
            opacity: FRAMES[0][i],
            boxShadow: FRAMES[0][i] > 0.4 ? GLOWS[i][0] : GLOWS[i][1],
            transition: 'opacity 0.08s',
          }}
        />
      ))}
    </div>
  )
}