import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import shipImg       from '../../assets/sprites/playerShip2_blue.png'
import enemyBlackImg from '../../assets/sprites/enemyBlack1.png'
import enemyRedImg   from '../../assets/sprites/enemyRed2.png'
import enemyGreenImg from '../../assets/sprites/enemyGreen1.png'
import enemyBlueImg  from '../../assets/sprites/enemyBlue4.png'
import laserImg      from '../../assets/sprites/laserBlue01.png'

/* ============================================================
   SYNAPSE · PACKET STORM
   Vertical arcade shoot-'em-up. Drag to move your defense drone,
   it auto-fires upward. Malware packets descend in formation and
   dive at you. Hijackers that reach you steal a weapon slot —
   destroy another hijacker to get it back.
   ============================================================ */

/* ---- Types ---- */
type EnemyType = 'drone' | 'worm' | 'hijacker' | 'boss'
type GameStatus = 'idle' | 'playing' | 'won' | 'lost' | 'lost_obj' | 'cooldown'
type CapsuleKey = 'small' | 'medium' | 'full' | 'eff' | 'power' | 'hw'

interface LevelDef {
  n: number; rows: number; maxActive: number; spawnEvery: number
  diveProb: number; diveSpeed: number; hijackerChance: number
  wormChance: number; goal: number; lives: number; timer: number
  cd: number; wN: number
}

interface EnemyMeta { icon: string; color: string; hp: number; label: string }

interface Capsule { name: string; effect: string; color: string; rarity: string; icon: string }

interface Enemy {
  id: string; type: EnemyType; hp: number; slot: number; col: number; row: number
  x: number; y: number; state: 'formation' | 'diving'; diveT: number
  diveStartX: number; diveStartY: number; dying: boolean; dieT: number; patrolT: number
}

interface Bullet { id: string; x: number; y: number }

interface GameState {
  ship: { x: number }
  enemies: Enemy[]
  bullets: Bullet[]
  slots: (string | null)[]
  kills: number; lives: number; hijacked: boolean; bossSpawned: boolean
  fireTimer: number; spawnTimer: number; timeMs: number; swayT: number
  dragging: boolean; moveL: boolean; moveR: boolean; flash: number; dmgFlash: number
  lastTs: number | null
}

interface RenderData {
  kills: number; goal: number; lives: number; timeLeft: number
  hijacked: boolean; enemies: Enemy[]; bullets: Bullet[]; shipX: number
}

export interface PacketStormProps { onExit: () => void }

/* ---- Constants ---- */
const COLS = 5
const COL_X = [14, 32, 50, 68, 86]
const ROW_Y3 = [10, 22, 34]
const SHIP_Y = 90
const HIT_R = 5.5
const BULLET_SPEED = 150
const FIRE_INTERVAL = 0.35
const DRAG_CLAMP: [number, number] = [6, 94]

const LEVELS: LevelDef[] = [
  { n:1, rows:2, maxActive:4, spawnEvery:1.8, diveProb:0.16, diveSpeed:55, hijackerChance:0.10, wormChance:0,    goal:10, lives:3, timer:45, cd:40,  wN:3 },
  { n:2, rows:2, maxActive:5, spawnEvery:1.5, diveProb:0.20, diveSpeed:62, hijackerChance:0.13, wormChance:0.10, goal:14, lives:3, timer:50, cd:60,  wN:5 },
  { n:3, rows:3, maxActive:6, spawnEvery:1.3, diveProb:0.24, diveSpeed:70, hijackerChance:0.15, wormChance:0.16, goal:18, lives:3, timer:55, cd:80,  wN:5 },
  { n:4, rows:3, maxActive:7, spawnEvery:1.1, diveProb:0.28, diveSpeed:78, hijackerChance:0.17, wormChance:0.20, goal:22, lives:3, timer:60, cd:90,  wN:5 },
  { n:5, rows:3, maxActive:8, spawnEvery:0.9, diveProb:0.32, diveSpeed:86, hijackerChance:0.18, wormChance:0.24, goal:25, lives:3, timer:70, cd:120, wN:5 },
]

const ENEMY_META: Record<EnemyType, EnemyMeta> = {
  drone:    { icon:'▣', color:'#FF5C8A', hp:1, label:'PACKET' },
  worm:     { icon:'▦', color:'#FF7A45', hp:2, label:'WORM'   },
  hijacker: { icon:'◉', color:'#FFD24A', hp:1, label:'HIJACK' },
  boss:     { icon:'▣', color:'#C84BFF', hp:3, label:'TROJAN' },
}

const CAPS: Record<CapsuleKey, Capsule> = {
  small:  { name:'Recharge Capsule · Small',  effect:'+10% energy bar',       color:'#2DE2C5', rarity:'COMMON',    icon:'⚡'     },
  medium: { name:'Recharge Capsule · Medium', effect:'+50% energy bar',       color:'#4DA6FF', rarity:'RARE',      icon:'⚡⚡'   },
  full:   { name:'Recharge Capsule · Full',   effect:'+100% energy bar',      color:'#C84BFF', rarity:'EPIC',      icon:'⚡⚡⚡' },
  eff:    { name:'Efficiency Capsule',        effect:'−20% consumption · 2h', color:'#F5A524', rarity:'RARE',      icon:'🔋'    },
  power:  { name:'Power Capsule',             effect:'+15% compute · 1h',     color:'#FF7A45', rarity:'EPIC',      icon:'🚀'    },
  hw:     { name:'Hardware Piece · Used',     effect:"Drop from your room's pool", color:'#FF5C8A', rarity:'LEGENDARY', icon:'🖥️' },
}

const DROP_TABLE: Record<number, [CapsuleKey, number][]> = {
  1:[['small',1.0]],
  2:[['small',0.65],['medium',1.0]],
  3:[['small',0.35],['medium',0.75],['power',1.0]],
  4:[['medium',0.35],['power',0.75],['eff',1.0]],
  5:[['power',0.30],['full',0.55],['eff',0.75],['medium',0.90],['hw',1.0]],
}

const rollDrop = (n: number): CapsuleKey => {
  const r = Math.random()
  for (const [k, c] of DROP_TABLE[n]) if (r <= c) return k
  return 'small'
}
const uid = () => Math.random().toString(36).slice(2, 8)

function rowsForLevel(rows: number) { return ROW_Y3.slice(0, rows) }

function freshGS(level: LevelDef): GameState {
  return {
    ship: { x: 50 },
    enemies: [], bullets: [],
    slots: Array(COLS * level.rows).fill(null),
    kills: 0, lives: level.lives, hijacked: false, bossSpawned: false,
    fireTimer: FIRE_INTERVAL, spawnTimer: 0.6,
    timeMs: level.timer * 1000, swayT: 0,
    dragging: false, moveL: false, moveR: false,
    flash: 0, dmgFlash: 0, lastTs: null,
  }
}

function pickType(level: LevelDef): EnemyType {
  const r = Math.random()
  if (r < level.hijackerChance) return 'hijacker'
  if (r < level.hijackerChance + level.wormChance) return 'worm'
  return 'drone'
}

/* ---- Visual: enemy sprites (Kenney Space Shooter Remastered) ---- */
const SPRITE_MAP: Record<EnemyType, string> = {
  drone:    enemyBlackImg,
  worm:     enemyRedImg,
  hijacker: enemyGreenImg,
  boss:     enemyBlueImg,
}
const SIZE_MAP: Record<EnemyType, number> = {
  drone: 34, worm: 40, hijacker: 36, boss: 62,
}

function EnemySprite({ enemy }: { enemy: Enemy }) {
  const meta  = ENEMY_META[enemy.type]
  const alpha = enemy.dying ? Math.max(0, 1 - enemy.dieT / 0.3) : 1
  const size  = SIZE_MAP[enemy.type]
  const maxHp = meta.hp

  return (
    <div style={{
      position:'absolute', left:`${enemy.x}%`, top:`${enemy.y}%`,
      transform:'translate(-50%,-50%)',
      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
      opacity:alpha, transition:'opacity 150ms',
    }}>
      <div style={{
        width:size, height:size,
        filter: enemy.state==='diving'
          ? `drop-shadow(0 0 7px ${meta.color}BB)`
          : `drop-shadow(0 0 2px ${meta.color}44)`,
      }}>
        <img
          src={SPRITE_MAP[enemy.type]}
          alt={meta.label}
          draggable={false}
          style={{ width:'100%', height:'100%', objectFit:'contain', imageRendering:'pixelated', display:'block' }}
        />
      </div>
      {/* HP dots for multi-hit enemies */}
      {maxHp > 1 && (
        <div style={{ display:'flex', gap:3 }}>
          {Array.from({ length:maxHp }).map((_, i) => (
            <div key={i} style={{
              width:5, height:5, borderRadius:'50%',
              background: i < enemy.hp ? meta.color : '#16202F',
              boxShadow: i < enemy.hp ? `0 0 4px ${meta.color}` : 'none',
              transition:'background 150ms',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- Visual: player ship (Kenney playerShip2_blue) ---- */
function Ship({ x, hijacked, flash }: { x: number; hijacked: boolean; flash: number }) {
  const glow = hijacked ? '#FF2200' : '#00FFE0'
  return (
    <div style={{
      position:'absolute', left:`${x}%`, top:`${SHIP_Y}%`,
      transform:'translate(-50%,-50%)',
      width:52, height:52,
      display:'flex', flexDirection:'column', alignItems:'center',
    }}>
      {/* Damage flash halo */}
      {flash > 0 && (
        <div style={{
          position:'absolute', inset:-14, borderRadius:'50%',
          background:`radial-gradient(circle, ${glow}55, transparent 70%)`,
          opacity:flash, pointerEvents:'none',
        }} />
      )}
      {/* Engine glow */}
      <div style={{
        position:'absolute', bottom:-4, left:'50%', transform:'translateX(-50%)',
        width:18, height:8, borderRadius:'50%',
        background:glow, opacity:0.55, filter:'blur(5px)',
      }} />
      <img
        src={shipImg}
        alt="interceptor drone"
        draggable={false}
        style={{
          width:52, height:52, objectFit:'contain', imageRendering:'pixelated',
          filter: hijacked
            ? 'hue-rotate(200deg) saturate(2) drop-shadow(0 0 6px #FF220099)'
            : 'drop-shadow(0 0 4px rgba(0,255,224,0.5))',
        }}
      />
    </div>
  )
}

/* ---- Main component ---- */
export default function PacketStorm({ onExit }: PacketStormProps) {
  const [levelIdx,  setLevelIdx]  = useState(0)
  const [wins,      setWins]      = useState(0)
  const [status,    setStatus]    = useState<GameStatus>('idle')
  const [cdLeft,    setCdLeft]    = useState(0)
  const [drop,      setDrop]      = useState<CapsuleKey | null>(null)
  const [leveledUp, setLeveledUp] = useState(false)
  const [rd, setRd] = useState<RenderData>({
    kills:0, goal:10, lives:3, timeLeft:45, hijacked:false, enemies:[], bullets:[], shipX:50,
  })

  const level   = LEVELS[levelIdx]
  const gsRef   = useRef<GameState | null>(null)
  const rafRef  = useRef<number>(0)
  const runRef  = useRef(false)
  const areaRef = useRef<HTMLDivElement>(null)
  const lvRef   = useRef(level)
  useEffect(() => { lvRef.current = level }, [level])

  const startGame = useCallback(() => {
    gsRef.current = freshGS(level)
    runRef.current = true
    setDrop(null); setLeveledUp(false)
    setStatus('playing')
    setRd({ kills:0, goal:level.goal, lives:level.lives, timeLeft:level.timer, hijacked:false, enemies:[], bullets:[], shipX:50 })
    rafRef.current = requestAnimationFrame(gameLoop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level])

  const gameLoop = useCallback((ts: number) => {
    if (!runRef.current) return
    const gs = gsRef.current!
    const lv = lvRef.current
    const raw = gs.lastTs ? Math.min(ts - gs.lastTs, 50) : 16.67
    const dt  = raw / 1000
    gs.lastTs = ts
    const rowYs = rowsForLevel(lv.rows)

    if (gs.moveL) gs.ship.x = Math.max(DRAG_CLAMP[0], gs.ship.x - 60*dt)
    if (gs.moveR) gs.ship.x = Math.min(DRAG_CLAMP[1], gs.ship.x + 60*dt)

    gs.swayT += dt
    const sway = Math.sin(gs.swayT * 1.2) * 6

    gs.spawnTimer -= dt
    const activeCount = gs.enemies.filter(e => !e.dying).length
    const bossActive  = gs.enemies.some(e => e.type === 'boss' && !e.dying)

    if (lv.n === 5 && gs.kills === lv.goal - 1 && !gs.bossSpawned && activeCount === 0) {
      gs.bossSpawned = true
      gs.enemies.push({ id:uid(), type:'boss', hp:3, slot:-1, col:0, row:0, x:50, y:14, state:'formation', diveT:0, diveStartX:50, diveStartY:14, patrolT:0, dying:false, dieT:0 })
    } else if (gs.spawnTimer <= 0 && activeCount < lv.maxActive && !bossActive) {
      const empty = gs.slots.map((v,i) => v===null?i:-1).filter(i => i>=0)
      if (empty.length > 0) {
        const slot = empty[Math.floor(Math.random()*empty.length)]
        const col  = slot % COLS
        const row  = Math.floor(slot / COLS)
        const type = pickType(lv)
        const meta = ENEMY_META[type]
        const id   = uid()
        gs.slots[slot] = id
        gs.enemies.push({ id, type, hp:meta.hp, slot, col, row, x:COL_X[col], y:rowYs[row], state:'formation', diveT:0, diveStartX:COL_X[col], diveStartY:rowYs[row], patrolT:0, dying:false, dieT:0 })
      }
      gs.spawnTimer = lv.spawnEvery * (0.7 + Math.random()*0.6)
    }

    const divingCount = gs.enemies.filter(e => e.state==='diving' && !e.dying).length
    if (divingCount < 2) {
      for (const e of gs.enemies) {
        if (e.state==='formation' && !e.dying && e.type!=='boss') {
          if (Math.random() < lv.diveProb * dt) {
            e.state = 'diving'; e.diveStartX = e.x; e.diveStartY = e.y; e.diveT = 0
            break
          }
        }
      }
    }

    for (const e of gs.enemies) {
      if (e.dying) { e.dieT += dt; continue }
      if (e.type === 'boss') { e.patrolT += dt; e.x = 50 + Math.sin(e.patrolT*0.8)*32; continue }
      if (e.state === 'formation') { e.x = COL_X[e.col] + sway; e.y = rowYs[e.row] }
      else if (e.state === 'diving') {
        const span = 100 - e.diveStartY
        e.diveT += (lv.diveSpeed / span) * dt
        e.x = e.diveStartX + (gs.ship.x - e.diveStartX) * Math.min(1, e.diveT*1.3)
        e.y = e.diveStartY + span * Math.min(1, e.diveT)
        if (e.diveT >= 1) {
          if (e.type==='hijacker') { gs.hijacked = true }
          else { gs.lives = Math.max(0, gs.lives-1); gs.dmgFlash = 1 }
          gs.slots[e.slot] = null
          e.dying = true; e.dieT = 0.29
        }
      }
    }
    gs.enemies = gs.enemies.filter(e => !(e.dying && e.dieT > 0.3))

    gs.fireTimer -= dt
    if (gs.fireTimer <= 0) {
      gs.bullets.push({ id:uid(), x:gs.ship.x, y:SHIP_Y-4 })
      gs.fireTimer = gs.hijacked ? FIRE_INTERVAL*2 : FIRE_INTERVAL
    }

    gs.bullets = gs.bullets.map(b => ({ ...b, y:b.y - BULLET_SPEED*dt })).filter(b => b.y > -2)

    const remainingBullets: Bullet[] = []
    for (const b of gs.bullets) {
      let hit = false
      for (const e of gs.enemies) {
        if (e.dying) continue
        if (Math.hypot(b.x-e.x, b.y-e.y) < HIT_R) {
          e.hp -= 1; hit = true
          if (e.hp <= 0) {
            e.dying = true; e.dieT = 0
            if (e.slot >= 0) gs.slots[e.slot] = null
            gs.kills += 1; gs.flash = 1
            if (e.type==='hijacker' && gs.hijacked) gs.hijacked = false
          }
          break
        }
      }
      if (!hit) remainingBullets.push(b)
    }
    gs.bullets = remainingBullets

    gs.flash    = Math.max(0, gs.flash    - dt*4)
    gs.dmgFlash = Math.max(0, gs.dmgFlash - dt*2.5)

    gs.timeMs -= raw
    let next: GameStatus | null = null
    if (gs.lives <= 0)          { next = 'lost' }
    else if (gs.kills >= lv.goal) { setDrop(rollDrop(lv.n)); next = 'won' }
    else if (gs.timeMs <= 0)    { next = 'lost_obj' }

    setRd({
      kills:gs.kills, goal:lv.goal, lives:gs.lives,
      timeLeft:Math.max(0, Math.ceil(gs.timeMs/1000)),
      hijacked:gs.hijacked,
      enemies:gs.enemies.map(e=>({...e})),
      bullets:gs.bullets.map(b=>({...b})),
      shipX:gs.ship.x,
    })

    if (next) { runRef.current=false; setStatus(next); return }
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [])

  useEffect(() => () => { runRef.current=false; cancelAnimationFrame(rafRef.current) }, [])

  useEffect(() => {
    if (status!=='cooldown' || cdLeft<=0) return
    const t = setInterval(() => setCdLeft(s => Math.max(0,s-1)), 1000)
    return () => clearInterval(t)
  }, [status, cdLeft])

  const onPointerDown = (e: React.PointerEvent) => {
    if (status!=='playing' || !gsRef.current || !areaRef.current) return
    gsRef.current.dragging = true; moveShipTo(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!gsRef.current?.dragging) return; moveShipTo(e.clientX)
  }
  const endDrag = () => { if (gsRef.current) gsRef.current.dragging = false }
  const moveShipTo = (clientX: number) => {
    if (!areaRef.current) return
    const rect = areaRef.current.getBoundingClientRect()
    const pct  = ((clientX - rect.left) / rect.width) * 100
    gsRef.current!.ship.x = Math.max(DRAG_CLAMP[0], Math.min(DRAG_CLAMP[1], pct))
  }

  const setFlag = (key: 'moveL' | 'moveR', val: boolean) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (gsRef.current) gsRef.current[key] = val
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (status!=='playing' || !gsRef.current) return
      if (e.key==='a'||e.key==='ArrowLeft')  gsRef.current.moveL = true
      if (e.key==='d'||e.key==='ArrowRight') gsRef.current.moveR = true
    }
    const up = (e: KeyboardEvent) => {
      if (!gsRef.current) return
      if (e.key==='a'||e.key==='ArrowLeft')  gsRef.current.moveL = false
      if (e.key==='d'||e.key==='ArrowRight') gsRef.current.moveR = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown',down); window.removeEventListener('keyup',up) }
  }, [status])

  const collectReward = () => {
    const nw = wins+1
    if (nw >= level.wN && levelIdx < LEVELS.length-1) {
      setLevelIdx(levelIdx+1); setWins(0); setLeveledUp(true)
    } else { setWins(Math.min(nw, level.wN)) }
    setCdLeft(level.cd); setStatus('cooldown')
  }
  const afterLoss = () => { setWins(w => Math.max(0,w-1)); setCdLeft(level.cd); setStatus('cooldown') }

  const fmt  = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
  const tPct = (rd.timeLeft / level.timer) * 100
  const cap  = drop ? CAPS[drop] : null
  const playing = status === 'playing'

  return (
    <div style={{
      minHeight:'100vh', background:'#06090F', color:'#D8E2EC',
      fontFamily:"'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'20px 14px 40px',
      backgroundImage:'radial-gradient(circle at 50% -15%, rgba(139,124,255,0.07), transparent 55%)',
    }}>
      <style>{`
        @keyframes psPop    { from{transform:scale(0.88);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes psBlink  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes psSpin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes psGlitch { 0%,100%{transform:translateX(0)} 33%{transform:translateX(2px)} 66%{transform:translateX(-2px)} }
      `}</style>

      <div style={{ width:'100%', maxWidth:460 }}>

        {/* ← Exit button */}
        <button onClick={onExit} style={btnBack}>← GAMES</button>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:4, color:'#5B78A0' }}>SYNAPSE · MINIGAME</div>
            <div style={{ fontSize:24, fontWeight:800, letterSpacing:2, color:'#FFF' }}>
              PACKET<span style={{ color:'#8B7CFF' }}>STORM</span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{
              display:'inline-block', padding:'4px 12px', borderRadius:6,
              border:'1px solid rgba(139,124,255,0.45)', color:'#8B7CFF', fontSize:13, fontWeight:700,
            }}>LEVEL {level.n}</div>
            <div style={{ fontSize:10, color:'#5B78A0', marginTop:5 }}>cooldown {fmt(level.cd)}</div>
          </div>
        </div>

        {/* Wins */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
          <span style={{ fontSize:10, color:'#5B78A0', letterSpacing:1 }}>WINS</span>
          {Array.from({ length:level.wN }).map((_,i) => (
            <span key={i} style={{
              width:13, height:13, borderRadius:'50%',
              background: i<wins?'#8B7CFF':'transparent',
              border:`1.5px solid ${i<wins?'#8B7CFF':'#33465E'}`,
              boxShadow: i<wins?'0 0 6px rgba(139,124,255,0.7)':'none',
              transition:'all 250ms',
            }} />
          ))}
          <span style={{ fontSize:11, color:'#5B78A0', marginLeft:'auto' }}>{wins}/{level.wN}</span>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:8 }}>
          <div style={sCard}>
            <div style={sLbl}>PURGED</div>
            <div style={{ ...sVal, color:'#8B7CFF' }}>{rd.kills}<span style={{ fontSize:11, color:'#5B78A0' }}>/{rd.goal}</span></div>
          </div>
          <div style={sCard}>
            <div style={{ ...sLbl, marginBottom:4 }}>LIVES</div>
            <div style={{ display:'flex', justifyContent:'center', gap:3 }}>
              {Array.from({ length:level.lives }).map((_,i) => (
                <span key={i} style={{ fontSize:13, opacity:i<rd.lives?1:0.12,
                  filter:i<rd.lives?'drop-shadow(0 0 4px rgba(139,124,255,0.9))':'none' }}>◆</span>
              ))}
            </div>
          </div>
          <div style={sCard}>
            <div style={sLbl}>TIME</div>
            <div style={{ ...sVal, color:rd.timeLeft<=10?'#F5A524':'#FFF' }}>{fmt(rd.timeLeft)}</div>
          </div>
          <div style={sCard}>
            <div style={sLbl}>WEAPON</div>
            <div style={{ ...sVal, fontSize:13, color:rd.hijacked?'#FF5C8A':'#2DE2C5',
              animation:rd.hijacked?'psBlink 0.8s infinite':'none' }}>
              {rd.hijacked?'HIJACKED':'ONLINE'}
            </div>
          </div>
        </div>

        {/* Time bar */}
        <div style={{ height:4, background:'#11192A', borderRadius:99, overflow:'hidden', marginBottom:12 }}>
          <div style={{ height:'100%', width:`${tPct}%`, borderRadius:99,
            background:rd.timeLeft<=10?'#F5A524':'#8B7CFF', transition:'width 1s linear' }} />
        </div>

        {/* Playfield */}
        <div
          ref={areaRef}
          style={{
            position:'relative', width:'100%', height:380,
            background:'#070815', border:'1px solid #16202F', borderRadius:14, overflow:'hidden',
            touchAction:playing?'none':'auto', cursor:playing?'grab':'default',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerCancel={endDrag}
        >
          {/* Starfield */}
          {Array.from({ length:18 }).map((_,i) => (
            <div key={i} style={{
              position:'absolute', width:2, height:2, borderRadius:'50%',
              background:'rgba(139,124,255,0.18)',
              left:`${(i*37)%100}%`, top:`${(i*53)%100}%`,
            }} />
          ))}

          {/* Kill flash */}
          {rd.kills>0 && playing && (
            <div style={{ position:'absolute', inset:0, pointerEvents:'none',
              background:'rgba(139,124,255,0.05)', opacity:gsRef.current?.flash??0 }} />
          )}

          {/* Enemies */}
          {rd.enemies.map(e => <EnemySprite key={e.id} enemy={e} />)}

          {/* Bullets */}
          {rd.bullets.map(b => (
            <div key={b.id} style={{
              position:'absolute', left:`${b.x}%`, top:`${b.y}%`,
              transform:'translate(-50%,-50%)',
              width:10, height:22,
              filter:'drop-shadow(0 0 5px rgba(0,255,224,0.9))',
            }}>
              <img src={laserImg} alt="" draggable={false}
                style={{ width:'100%', height:'100%', objectFit:'contain', imageRendering:'pixelated' }} />
            </div>
          ))}

          {/* Ship */}
          {(playing||status==='lost'||status==='won'||status==='lost_obj') && (
            <Ship x={rd.shipX} hijacked={rd.hijacked} flash={gsRef.current?.dmgFlash??0} />
          )}

          {/* Drag hint */}
          {playing && (
            <div style={{ position:'absolute', bottom:6, left:0, right:0, textAlign:'center',
              fontSize:8, color:'rgba(139,124,255,0.3)', letterSpacing:1, pointerEvents:'none' }}>
              DRAG TO MOVE · AUTO-FIRE
            </div>
          )}

          {/* Overlays */}
          {!playing && (
            <div style={{
              position:'absolute', inset:0, background:'rgba(6,9,15,0.90)', backdropFilter:'blur(3px)',
              display:'flex', alignItems:'center', justifyContent:'center', zIndex:3,
            }}>
              <div style={{ textAlign:'center', padding:22, width:'100%', maxWidth:300, animation:'psPop 220ms ease' }}>

                {status==='idle' && (
                  <>
                    <div style={{ fontSize:42, marginBottom:8 }}>🛰️</div>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>Malware formation incoming</div>
                    <p style={{ fontSize:11, color:'#8FA5C0', lineHeight:1.65, margin:'0 0 8px' }}>
                      Drag to move your drone — it fires automatically. Destroy <span style={{ color:'#FF5C8A' }}>▣ packets</span> and <span style={{ color:'#FF7A45' }}>▦ worms</span>.
                    </p>
                    <p style={{ fontSize:11, color:'#8FA5C0', lineHeight:1.65, margin:'0 0 10px' }}>
                      If a <span style={{ color:'#FFD24A' }}>◉ hijacker</span> reaches you, your weapon slows down — destroy another hijacker to recover it.
                    </p>
                    <p style={{ fontSize:10, color:'#5B78A0', margin:'0 0 16px' }}>
                      Goal: <span style={{ color:'#8B7CFF' }}>{level.goal} purged</span> in {level.timer}s · {level.lives} lives
                    </p>
                    <button onClick={(e) => { e.stopPropagation(); startGame() }} style={btnViolet}>LAUNCH DRONE</button>
                  </>
                )}

                {status==='won' && cap && (
                  <>
                    <div style={{ fontSize:11, letterSpacing:3, color:'#8B7CFF', marginBottom:12 }}>SECTOR CLEARED ✓</div>
                    <div style={{
                      border:`1px solid ${cap.color}`, borderRadius:12, padding:'16px 12px',
                      background:'rgba(255,255,255,0.02)', boxShadow:`0 0 24px ${cap.color}33`, marginBottom:16,
                    }}>
                      <div style={{ fontSize:32 }}>{cap.icon}</div>
                      <div style={{ fontSize:9, letterSpacing:3, color:cap.color, margin:'6px 0 4px' }}>{cap.rarity}</div>
                      <div style={{ fontSize:12, fontWeight:700 }}>{cap.name}</div>
                      <div style={{ fontSize:10, color:'#8FA5C0', marginTop:4 }}>{cap.effect}</div>
                    </div>
                    <button onClick={collectReward} style={btnViolet}>CLAIM REWARD</button>
                  </>
                )}

                {status==='lost_obj' && (
                  <>
                    <div style={{ fontSize:36, marginBottom:8 }}>⏳</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#F5A524', marginBottom:6 }}>FORMATION SURVIVED</div>
                    <p style={{ fontSize:11, color:'#8FA5C0', margin:'0 0 6px' }}>
                      Purged <span style={{ color:'#8B7CFF' }}>{rd.kills}</span> of <span style={{ color:'#8B7CFF' }}>{rd.goal}</span> required.
                    </p>
                    <p style={{ fontSize:11, color:'#F5A524', margin:'0 0 16px' }}>−1 win accumulated.</p>
                    <button onClick={afterLoss} style={btnGhost}>CONTINUE</button>
                  </>
                )}

                {status==='lost' && (
                  <>
                    <div style={{ fontSize:38, marginBottom:8 }}>💥</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#FF2200', marginBottom:6 }}>DRONE DESTROYED</div>
                    <p style={{ fontSize:11, color:'#8FA5C0', margin:'0 0 16px', lineHeight:1.6 }}>
                      Too many packets broke through.<br /><span style={{ color:'#F5A524' }}>−1 win</span> accumulated.
                    </p>
                    <button onClick={afterLoss} style={btnGhost}>CONTINUE</button>
                  </>
                )}

                {status==='cooldown' && (
                  <>
                    {leveledUp && (
                      <div style={{ fontSize:12, fontWeight:800, color:'#8B7CFF', letterSpacing:2, marginBottom:12, textShadow:'0 0 14px rgba(139,124,255,0.65)' }}>
                        ★ LEVEL {level.n} UNLOCKED ★
                      </div>
                    )}
                    <div style={{ fontSize:10, letterSpacing:3, color:'#5B78A0', marginBottom:8 }}>COOLDOWN</div>
                    <div style={{ fontSize:44, fontWeight:800, fontVariantNumeric:'tabular-nums', color:cdLeft>0?'#FFF':'#8B7CFF' }}>
                      {fmt(cdLeft)}
                    </div>
                    <p style={{ fontSize:10, color:'#5B78A0', margin:'8px 0 18px' }}>
                      {cdLeft>0?'Server validating cooldown...':'Drone recharged.'}
                    </p>
                    <button onClick={(e) => { e.stopPropagation(); startGame() }} disabled={cdLeft>0} style={cdLeft>0?btnDisabled:btnViolet}>
                      PLAY AGAIN
                    </button>
                    {cdLeft>0 && (
                      <button onClick={(e) => { e.stopPropagation(); setCdLeft(0) }} style={{ ...btnGhost, marginTop:10, fontSize:10 }}>
                        skip cooldown (demo only)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display:'flex', justifyContent:'center', gap:14, marginTop:10 }}>
          <button
            onPointerDown={setFlag('moveL',true)} onPointerUp={setFlag('moveL',false)}
            onPointerLeave={setFlag('moveL',false)} onPointerCancel={setFlag('moveL',false)}
            style={ctrlBtn} disabled={!playing}
          >◀</button>
          <button
            onPointerDown={setFlag('moveR',true)} onPointerUp={setFlag('moveR',false)}
            onPointerLeave={setFlag('moveR',false)} onPointerCancel={setFlag('moveR',false)}
            style={ctrlBtn} disabled={!playing}
          >▶</button>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 14px', marginTop:12, fontSize:9, color:'#3D5270' }}>
          <span style={{ color:'rgba(255,92,138,0.6)'  }}>▣ packet — 1 hit</span>
          <span style={{ color:'rgba(255,122,69,0.6)'  }}>▦ worm — 2 hits</span>
          <span style={{ color:'rgba(255,210,74,0.6)'  }}>◉ hijacker — steals weapon</span>
          <span style={{ color:'rgba(200,75,255,0.6)'  }}>▣ Trojan boss — L5 finale</span>
        </div>

        {/* Progression */}
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:10, letterSpacing:3, color:'#5B78A0', marginBottom:8 }}>PROGRESSION</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
            {LEVELS.map((lv,i) => (
              <div key={lv.n} style={{
                border:`1px solid ${i===levelIdx?'rgba(139,124,255,0.5)':'#16202F'}`,
                background: i===levelIdx?'rgba(139,124,255,0.05)':'#0A1019',
                borderRadius:8, padding:'8px 4px', textAlign:'center',
              }}>
                <div style={{ fontSize:12, fontWeight:700, color:i===levelIdx?'#8B7CFF':i<levelIdx?'#8FA5C0':'#2D3F58' }}>L{lv.n}</div>
                <div style={{ fontSize:9, color:'#3D5270', marginTop:2 }}>{fmt(lv.cd)}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:10, color:'#3D5270', lineHeight:1.6, marginTop:10 }}>
            Loss (lives or time) = −1 win (min 0) · no level drop · 5h inactivity = reset to L1 · L5 ends with a Trojan boss · drops include pieces from your room's pool.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---- Style constants ---- */
const sCard: CSSProperties = { background:'#0A1019', border:'1px solid #16202F', borderRadius:8, padding:'8px 6px', textAlign:'center' }
const sLbl:  CSSProperties = { fontSize:9, color:'#5B78A0', letterSpacing:1, marginBottom:3 }
const sVal:  CSSProperties = { fontSize:18, fontWeight:800, fontVariantNumeric:'tabular-nums' }

const btnBack: CSSProperties = {
  background:'transparent', border:'1px solid #16202F', color:'#5B78A0',
  borderRadius:6, padding:'5px 12px', fontSize:10, letterSpacing:2, fontWeight:700,
  cursor:'pointer', fontFamily:'inherit', marginBottom:12,
}
const btnViolet: CSSProperties = {
  background:'#8B7CFF', color:'#06090F', border:'none', borderRadius:8,
  padding:'12px 24px', fontSize:13, fontWeight:800, letterSpacing:2,
  cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 18px rgba(139,124,255,0.4)', width:'100%',
}
const btnGhost: CSSProperties = {
  background:'transparent', color:'#8FA5C0', border:'1px solid #33465E', borderRadius:8,
  padding:'11px 24px', fontSize:12, fontWeight:700, letterSpacing:2,
  cursor:'pointer', fontFamily:'inherit', width:'100%',
}
const btnDisabled: CSSProperties = { ...btnViolet, background:'#1A2536', color:'#41546E', boxShadow:'none', cursor:'not-allowed' }
const ctrlBtn: CSSProperties = {
  width:54, height:44, borderRadius:10, background:'#0A1019',
  border:'1px solid #2D3F58', color:'#8FA5C0', fontSize:16, fontWeight:800,
  cursor:'pointer', fontFamily:'inherit', touchAction:'none',
  WebkitTapHighlightColor:'transparent', userSelect:'none',
}