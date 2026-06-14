import { useState, useEffect, useMemo, useCallback, type CSSProperties } from 'react'

/* ============================================================
   SYNAPSE · NEURAL LINK
   Rotate the neural connection pieces to route the signal from
   the DATA node to the MODEL node before time runs out.
   Levels 1-5, progressive cooldowns, accumulated wins,
   loss = -1 win, capsule drops per level.
   ============================================================ */

type PieceType = 'I' | 'L' | 'T'

interface Piece {
  type: PieceType
  rot: number
}

interface BoardState {
  cells: Piece[]
  size: number
  rIn: number
  rOut: number
}

interface LevelDef {
  n: number
  size: number
  cooldown: number
  winsNeeded: number
}

type CapsuleKey = 'small' | 'medium' | 'full' | 'eff' | 'power' | 'hw'

interface Capsule {
  name: string
  effect: string
  color: string
  rarity: string
  icon: string
}

type GameStatus = 'idle' | 'playing' | 'won' | 'lost' | 'cooldown'

export interface NeuralLinkProps {
  onExit: () => void
}

const DIRS: Array<[number, number]> = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
] // N E S W
const OPP = (d: number) => (d + 2) % 4
const PIECES: Record<PieceType, number[]> = { I: [0, 2], L: [0, 1], T: [0, 1, 2] }
const mod4 = (n: number) => ((n % 4) + 4) % 4
const connsOf = (type: PieceType, rot: number) => PIECES[type].map((d) => mod4(d + rot))

const LEVELS: LevelDef[] = [
  { n: 1, size: 5, cooldown: 40, winsNeeded: 3 },
  { n: 2, size: 5, cooldown: 60, winsNeeded: 5 },
  { n: 3, size: 6, cooldown: 80, winsNeeded: 5 },
  { n: 4, size: 6, cooldown: 90, winsNeeded: 5 },
  { n: 5, size: 7, cooldown: 120, winsNeeded: 5 },
]

const CAPSULES: Record<CapsuleKey, Capsule> = {
  small: { name: 'Recharge Capsule · Small', effect: '+10% energy bar', color: '#2DE2C5', rarity: 'COMMON', icon: '⚡' },
  medium: { name: 'Recharge Capsule · Medium', effect: '+50% energy bar', color: '#4DA6FF', rarity: 'RARE', icon: '⚡⚡' },
  full: { name: 'Recharge Capsule · Full', effect: '+100% energy bar', color: '#C84BFF', rarity: 'EPIC', icon: '⚡⚡⚡' },
  eff: { name: 'Efficiency Capsule', effect: '−20% consumption · 2 hours', color: '#F5A524', rarity: 'RARE', icon: '🔋' },
  power: { name: 'Power Capsule', effect: '+15% compute · 1 hour', color: '#FF7A45', rarity: 'EPIC', icon: '🚀' },
  hw: { name: 'Hardware Piece · Used', effect: "Drop from your room's pool", color: '#FF5C8A', rarity: 'LEGENDARY', icon: '🖥️' },
}

// Drop table per level (cumulative probabilities)
const DROP_TABLE: Record<number, Array<[CapsuleKey, number]>> = {
  1: [['small', 1.0]],
  2: [['small', 1.0]],
  3: [['small', 0.7], ['medium', 1.0]],
  4: [['small', 0.4], ['medium', 0.9], ['eff', 1.0]],
  5: [['medium', 0.45], ['full', 0.65], ['eff', 0.85], ['power', 0.95], ['hw', 1.0]],
}

function rollDrop(levelN: number): CapsuleKey {
  const r = Math.random()
  for (const [key, cum] of DROP_TABLE[levelN]) if (r <= cum) return key
  return 'small'
}

/* ---------- Solvable board generation ---------- */
function generateBoard(size: number): BoardState {
  const rIn = Math.floor(Math.random() * size)
  const rOut = Math.floor(Math.random() * size)
  const visited = new Set<string>()
  const path: Array<[number, number]> = []
  const dfs = (r: number, c: number): boolean => {
    if (r < 0 || c < 0 || r >= size || c >= size || visited.has(r + ',' + c)) return false
    visited.add(r + ',' + c)
    path.push([r, c])
    if (r === rOut && c === size - 1) return true
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5)
    for (const d of order) if (dfs(r + DIRS[d][0], c + DIRS[d][1])) return true
    path.pop()
    return false
  }
  dfs(rIn, 0)

  const moveDir = (a: [number, number], b: [number, number]) =>
    DIRS.findIndex(([dr, dc]) => a[0] + dr === b[0] && a[1] + dc === b[1])
  const matchPiece = (a: number, b: number): { type: PieceType; rot: number } => {
    const want = [a, b].sort().join(',')
    for (const type of ['I', 'L'] as PieceType[])
      for (let rot = 0; rot < 4; rot++)
        if (connsOf(type, rot).slice().sort().join(',') === want) return { type, rot }
    return { type: 'L', rot: 0 }
  }

  const cells: Piece[] = Array.from({ length: size * size }, () => {
    const type = (['I', 'L', 'L', 'I', 'T'] as PieceType[])[Math.floor(Math.random() * 5)]
    return { type, rot: Math.floor(Math.random() * 4) }
  })

  path.forEach((cell, i) => {
    const entry = i === 0 ? 3 : OPP(moveDir(path[i - 1], cell))
    const exit = i === path.length - 1 ? 1 : moveDir(cell, path[i + 1])
    const piece = matchPiece(entry, exit)
    cells[cell[0] * size + cell[1]] = { type: piece.type, rot: piece.rot + Math.floor(Math.random() * 4) }
  })

  // Make sure it doesn't start already solved
  let guard = 0
  while (computeEnergized(cells, size, rIn, rOut).won && guard < 20) {
    const [r, c] = path[Math.floor(Math.random() * path.length)]
    cells[r * size + c] = { ...cells[r * size + c], rot: cells[r * size + c].rot + 1 }
    guard++
  }
  return { cells, size, rIn, rOut }
}

/* ---------- Signal propagation ---------- */
function computeEnergized(cells: Piece[], size: number, rIn: number, rOut: number) {
  const conns = cells.map((p) => new Set(connsOf(p.type, p.rot)))
  const idx = (r: number, c: number) => r * size + c
  const energized = new Set<number>()
  const startIdx = idx(rIn, 0)
  if (conns[startIdx].has(3)) {
    energized.add(startIdx)
    const q = [startIdx]
    while (q.length) {
      const cur = q.pop() as number
      const r = Math.floor(cur / size)
      const c = cur % size
      for (const d of conns[cur]) {
        const nr = r + DIRS[d][0]
        const nc = c + DIRS[d][1]
        if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue
        const ni = idx(nr, nc)
        if (!energized.has(ni) && conns[ni].has(OPP(d))) {
          energized.add(ni)
          q.push(ni)
        }
      }
    }
  }
  const endIdx = idx(rOut, size - 1)
  return { energized, won: energized.has(endIdx) && conns[endIdx].has(1) }
}

/* ---------- SVG cell ---------- */
const EDGE: Record<number, [number, number]> = { 0: [50, 0], 1: [100, 50], 2: [50, 100], 3: [0, 50] }

function Cell({
  piece,
  energized,
  won,
  onClick,
}: {
  piece: Piece
  energized: boolean
  won: boolean
  onClick: () => void
}) {
  const base = PIECES[piece.type]
  const stroke = energized ? '#2DE2C5' : '#33465E'
  return (
    <button
      onClick={onClick}
      aria-label="Rotate connection"
      style={{
        background: energized ? 'rgba(45,226,197,0.07)' : '#0C1320',
        border: '1px solid ' + (energized ? 'rgba(45,226,197,0.35)' : '#16202F'),
        borderRadius: 8,
        padding: 0,
        cursor: 'pointer',
        width: '100%',
        aspectRatio: '1',
        transition: 'background 200ms, border-color 200ms',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
        <g
          style={{
            transform: `rotate(${piece.rot * 90}deg)`,
            transformOrigin: '50px 50px',
            transition: 'transform 160ms ease',
          }}
        >
          {base.map((d) => (
            <line
              key={d}
              x1="50"
              y1="50"
              x2={EDGE[d][0]}
              y2={EDGE[d][1]}
              stroke={stroke}
              strokeWidth="11"
              strokeLinecap="round"
              className={energized && won ? 'nl-pulse' : ''}
              style={{ transition: 'stroke 200ms', filter: energized ? 'drop-shadow(0 0 5px rgba(45,226,197,0.8))' : 'none' }}
            />
          ))}
        </g>
        <circle cx="50" cy="50" r="9" fill={energized ? '#2DE2C5' : '#22344A'} style={{ transition: 'fill 200ms' }} />
      </svg>
    </button>
  )
}

/* ---------- Main component ---------- */
export default function NeuralLink({ onExit }: NeuralLinkProps) {
  const [levelIdx, setLevelIdx] = useState(0)
  const [wins, setWins] = useState(0)
  const [status, setStatus] = useState<GameStatus>('idle')
  const [board, setBoard] = useState<BoardState | null>(null)
  const [timeLeft, setTimeLeft] = useState(60)
  const [cdLeft, setCdLeft] = useState(0)
  const [drop, setDrop] = useState<CapsuleKey | null>(null)
  const [leveledUp, setLeveledUp] = useState(false)

  const level = LEVELS[levelIdx]

  const startGame = useCallback(() => {
    setBoard(generateBoard(level.size))
    setTimeLeft(60)
    setDrop(null)
    setLeveledUp(false)
    setStatus('playing')
  }, [level.size])

  // Match timer
  useEffect(() => {
    if (status !== 'playing') return
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t)
          setStatus('lost')
          setWins((w) => Math.max(0, w - 1)) // loss = -1 win (floor 0)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [status])

  // Cooldown between matches
  useEffect(() => {
    if (status !== 'cooldown' || cdLeft <= 0) return
    const t = setInterval(() => setCdLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [status, cdLeft])

  const { energized, won } = useMemo(() => {
    if (!board) return { energized: new Set<number>(), won: false }
    return computeEnergized(board.cells, board.size, board.rIn, board.rOut)
  }, [board])

  const rotateCell = (i: number) => {
    if (status !== 'playing') return
    setBoard((b) => {
      if (!b) return b
      const cells = b.cells.slice()
      cells[i] = { ...cells[i], rot: cells[i].rot + 1 }
      return { ...b, cells }
    })
  }

  // Win detection
  useEffect(() => {
    if (status === 'playing' && won) {
      const d = rollDrop(level.n)
      setDrop(d)
      const t = setTimeout(() => setStatus('won'), 900) // let the pulse animation play
      return () => clearTimeout(t)
    }
  }, [won, status, level.n])

  const collectReward = () => {
    const newWins = wins + 1
    if (newWins >= level.winsNeeded && levelIdx < LEVELS.length - 1) {
      setLevelIdx(levelIdx + 1)
      setWins(0)
      setLeveledUp(true)
    } else {
      setWins(Math.min(newWins, level.winsNeeded))
    }
    setCdLeft(level.cooldown)
    setStatus('cooldown')
  }

  const afterLoss = () => {
    setCdLeft(level.cooldown)
    setStatus('cooldown')
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const cap = drop ? CAPSULES[drop] : null
  const timePct = (timeLeft / 60) * 100

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#06090F',
        color: '#D8E2EC',
        fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 14px 40px',
        backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(45,226,197,0.06), transparent 60%)',
      }}
    >
      <style>{`
        @keyframes nlPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }
        .nl-pulse { animation: nlPulse 0.6s ease-in-out infinite; }
        @keyframes nlPop { from { transform: scale(0.85); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .nl-pulse { animation: none } }
      `}</style>

      {/* ===== Header ===== */}
      <div style={{ width: '100%', maxWidth: 460 }}>
        <button
          onClick={onExit}
          style={{
            background: 'transparent',
            border: '1px solid #16202F',
            color: '#5B78A0',
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 10,
            letterSpacing: 2,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginBottom: 12,
          }}
        >
          ← GAMES
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#5B78A0' }}>SYNAPSE · MINIGAME</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, color: '#FFFFFF' }}>
              NEURAL<span style={{ color: '#2DE2C5' }}>LINK</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 6,
                border: '1px solid rgba(45,226,197,0.4)',
                color: '#2DE2C5',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              LEVEL {level.n}
            </div>
            <div style={{ fontSize: 10, color: '#5B78A0', marginTop: 5 }}>cooldown {fmt(level.cooldown)}</div>
          </div>
        </div>

        {/* Accumulated wins */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '14px 0 8px' }}>
          <span style={{ fontSize: 10, color: '#5B78A0', letterSpacing: 1 }}>WINS</span>
          {Array.from({ length: level.winsNeeded }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: i < wins ? '#2DE2C5' : 'transparent',
                border: '1.5px solid ' + (i < wins ? '#2DE2C5' : '#33465E'),
                boxShadow: i < wins ? '0 0 6px rgba(45,226,197,0.7)' : 'none',
                transition: 'all 250ms',
              }}
            />
          ))}
          <span style={{ fontSize: 11, color: '#5B78A0', marginLeft: 'auto' }}>
            {wins}/{level.winsNeeded} to level up
          </span>
        </div>

        {/* Time bar */}
        <div style={{ height: 7, background: '#11192A', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
          <div
            style={{
              height: '100%',
              width: timePct + '%',
              borderRadius: 99,
              background: timeLeft <= 15 ? '#F5A524' : '#2DE2C5',
              transition: 'width 1s linear, background 300ms',
            }}
          />
        </div>
      </div>

      {/* ===== Board ===== */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 460 }}>
        {board && (
          <>
            {/* Input node (DATA) */}
            <div
              style={{
                position: 'absolute',
                left: -6,
                top: `calc(${((board.rIn + 0.5) * 100) / board.size}% - 11px)`,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '11px solid transparent',
                  borderBottom: '11px solid transparent',
                  borderLeft: '13px solid #2DE2C5',
                  filter: 'drop-shadow(0 0 6px rgba(45,226,197,0.9))',
                }}
              />
            </div>
            {/* Output node (MODEL) */}
            <div
              style={{
                position: 'absolute',
                right: -6,
                top: `calc(${((board.rOut + 0.5) * 100) / board.size}% - 11px)`,
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '11px solid transparent',
                  borderBottom: '11px solid transparent',
                  borderLeft: '13px solid ' + (won ? '#2DE2C5' : '#33465E'),
                  filter: won ? 'drop-shadow(0 0 8px rgba(45,226,197,1))' : 'none',
                  transition: 'all 300ms',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${board.size}, 1fr)`,
                gap: 5,
                background: '#0A1019',
                border: '1px solid #16202F',
                borderRadius: 14,
                padding: 10,
              }}
            >
              {board.cells.map((p, i) => (
                <Cell key={i} piece={p} won={won} energized={energized.has(i)} onClick={() => rotateCell(i)} />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#5B78A0', marginTop: 8, letterSpacing: 1 }}>
              <span>◀ DATA</span>
              <span>{status === 'playing' ? 'Tap a piece to rotate it' : ''}</span>
              <span>MODEL ▶</span>
            </div>
          </>
        )}

        {/* ===== Overlay screens ===== */}
        {status !== 'playing' && (
          <div
            style={{
              position: board ? 'absolute' : 'relative',
              inset: 0,
              background: board ? 'rgba(6,9,15,0.88)' : 'transparent',
              backdropFilter: board ? 'blur(3px)' : 'none',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: board ? undefined : 380,
              zIndex: 3,
            }}
          >
            <div style={{ textAlign: 'center', padding: 24, animation: 'nlPop 250ms ease', width: '100%', maxWidth: 330 }}>
              {status === 'idle' && (
                <>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>🧠</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Connect the neural network</div>
                  <p style={{ fontSize: 12, color: '#8FA5C0', lineHeight: 1.6, margin: '0 0 18px' }}>
                    Rotate the pieces to route the signal from DATA to MODEL before time runs out.
                  </p>
                  <button onClick={startGame} style={btnPrimary}>
                    START LINK
                  </button>
                </>
              )}

              {status === 'won' && cap && (
                <>
                  <div style={{ fontSize: 12, letterSpacing: 3, color: '#2DE2C5', marginBottom: 12 }}>LINK COMPLETE ✓</div>
                  <div
                    style={{
                      border: '1px solid ' + cap.color,
                      borderRadius: 12,
                      padding: '18px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      boxShadow: `0 0 24px ${cap.color}33`,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontSize: 34 }}>{cap.icon}</div>
                    <div style={{ fontSize: 10, letterSpacing: 3, color: cap.color, margin: '6px 0 4px' }}>{cap.rarity}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{cap.name}</div>
                    <div style={{ fontSize: 11, color: '#8FA5C0', marginTop: 4 }}>{cap.effect}</div>
                  </div>
                  <button onClick={collectReward} style={btnPrimary}>
                    CLAIM REWARD
                  </button>
                </>
              )}

              {status === 'lost' && (
                <>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>⏱️</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#F5A524', marginBottom: 6 }}>OUT OF TIME</div>
                  <p style={{ fontSize: 12, color: '#8FA5C0', margin: '0 0 18px' }}>
                    You lose 1 accumulated win (minimum 0).
                    <br />
                    You remain at level {level.n}.
                  </p>
                  <button onClick={afterLoss} style={btnGhost}>
                    CONTINUE
                  </button>
                </>
              )}

              {status === 'cooldown' && (
                <>
                  {leveledUp && (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#2DE2C5',
                        letterSpacing: 2,
                        marginBottom: 14,
                        textShadow: '0 0 12px rgba(45,226,197,0.6)',
                      }}
                    >
                      ★ LEVEL {level.n} UNLOCKED ★
                    </div>
                  )}
                  <div style={{ fontSize: 11, letterSpacing: 3, color: '#5B78A0', marginBottom: 8 }}>COOLDOWN</div>
                  <div style={{ fontSize: 42, fontWeight: 800, color: cdLeft > 0 ? '#FFFFFF' : '#2DE2C5', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(cdLeft)}
                  </div>
                  <p style={{ fontSize: 11, color: '#8FA5C0', margin: '8px 0 18px' }}>
                    {cdLeft > 0 ? 'The server validates this time, not the client.' : 'Ready for the next match.'}
                  </p>
                  <button onClick={startGame} disabled={cdLeft > 0} style={cdLeft > 0 ? btnDisabled : btnPrimary}>
                    PLAY AGAIN
                  </button>
                  {cdLeft > 0 && (
                    <button onClick={() => setCdLeft(0)} style={{ ...btnGhost, marginTop: 10, fontSize: 10 }}>
                      skip cooldown (demo only)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== Footer: level table ===== */}
      <div style={{ width: '100%', maxWidth: 460, marginTop: 22 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: '#5B78A0', marginBottom: 8 }}>PROGRESSION</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {LEVELS.map((lv, i) => (
            <div
              key={lv.n}
              style={{
                border: '1px solid ' + (i === levelIdx ? 'rgba(45,226,197,0.5)' : '#16202F'),
                background: i === levelIdx ? 'rgba(45,226,197,0.06)' : '#0A1019',
                borderRadius: 8,
                padding: '8px 4px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: i === levelIdx ? '#2DE2C5' : i < levelIdx ? '#8FA5C0' : '#33465E' }}>
                N{lv.n}
              </div>
              <div style={{ fontSize: 9, color: '#5B78A0', marginTop: 2 }}>{fmt(lv.cooldown)}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 10, color: '#41546E', lineHeight: 1.6, marginTop: 10 }}>
          3 wins at L1 · 5 wins at L2–L4 · loss = −1 win (no level drop) · 5h inactivity = reset to L1 · L5 drops include pieces from your room's pool.
        </p>
      </div>
    </div>
  )
}

const btnPrimary: CSSProperties = {
  background: '#2DE2C5',
  color: '#06090F',
  border: 'none',
  borderRadius: 8,
  padding: '12px 26px',
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: 2,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 0 18px rgba(45,226,197,0.35)',
}
const btnGhost: CSSProperties = {
  background: 'transparent',
  color: '#8FA5C0',
  border: '1px solid #33465E',
  borderRadius: 8,
  padding: '11px 24px',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 2,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
const btnDisabled: CSSProperties = { ...btnPrimary, background: '#1A2536', color: '#41546E', boxShadow: 'none', cursor: 'not-allowed' }