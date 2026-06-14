import { useState, useEffect, useRef, useCallback } from 'react'

/* ============================================================
   SYNAPSE · NET RUSH
   Race your data packet through the network circuit against
   rival AI processes. Change lanes to dodge firewalls and
   latency spikes, collect bandwidth boosts, and cross the
   finish line ahead of the pack.
   ============================================================ */

/* ---- Types ---- */
type GameStatus = 'idle' | 'playing' | 'won' | 'lost_obj' | 'cooldown'
type CapsuleKey = 'small' | 'medium' | 'full' | 'eff' | 'power' | 'hw'
type ObstacleType = 'firewall' | 'latency'

interface LevelDef {
  n: number; rivalCount: number; hazardRate: number
  puRate: number; cd: number; wN: number
}
interface Rival {
  id: string; lane: number; gap: number
  speed: number; color: string; name: string; changeCd: number
}
interface Obstacle { id: string; lane: number; y: number; type: ObstacleType }
interface Powerup  { id: string; lane: number; y: number }
interface GameState {
  playerLane: number; rivals: Rival[]
  obstacles: Obstacle[]; powerups: Powerup[]
  boostBar: number; boosting: boolean; latencyTimer: number
  finishGap: number; laneChangeCd: number
  hazardTimer: number; puTimer: number
  hitFlash: number; lastTs: number | null; timeMs: number
}
interface RenderData {
  playerLane: number
  rivals: (Rival & { screenY: number; screenX: number })[]
  obstacles: (Obstacle & { screenX: number })[]
  powerups:  (Powerup  & { screenX: number })[]
  boostBar: number; boosting: boolean; latencyTimer: number
  finishGap: number; finishScreenY: number
  hitFlash: number; position: number; timeMs: number
}
interface Capsule { name: string; effect: string; color: string; rarity: string; icon: string }

export interface NetRushProps { onExit: () => void }

/* ---- Constants ---- */
const LANES       = 3
const LANE_X      = [22, 50, 78]
const PLAYER_Y    = 76
const BASE_SPEED  = 20
const BOOST_BONUS = 16
const BOOST_MAX   = 100
const BOOST_DRAIN = 50
const BOOST_FILL_HIT = 35
const GAP_SCALE   = 9.5
const RACE_DISTANCE  = 30
const LANE_CHANGE_CD = 0.28
const uid = () => Math.random().toString(36).slice(2, 7)

const LEVELS: LevelDef[] = [
  { n:1, rivalCount:1, hazardRate:0.9,  puRate:0.7,  cd:40,  wN:3 },
  { n:2, rivalCount:2, hazardRate:1.2,  puRate:0.6,  cd:60,  wN:5 },
  { n:3, rivalCount:2, hazardRate:1.55, puRate:0.55, cd:80,  wN:5 },
  { n:4, rivalCount:3, hazardRate:1.9,  puRate:0.5,  cd:90,  wN:5 },
  { n:5, rivalCount:3, hazardRate:2.3,  puRate:0.45, cd:120, wN:5 },
]
const RIVAL_COLORS = ['#FF5C8A', '#FFD24A', '#FF7A45']
const RIVAL_SPEEDS = [BASE_SPEED*0.87, BASE_SPEED*0.91, BASE_SPEED*0.94]
const RIVAL_NAMES  = ['PROC-A', 'PROC-B', 'PROC-C']

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
  3:[['medium',0.6],['eff',1.0]],
  4:[['eff',0.4],['power',0.75],['full',1.0]],
  5:[['power',0.3],['full',0.55],['eff',0.75],['medium',0.9],['hw',1.0]],
}
const rollDrop = (n: number): CapsuleKey => {
  const r = Math.random()
  for (const [k, c] of DROP_TABLE[n]) if (r <= c) return k
  return 'small'
}

/* ---- Game state ---- */
function freshGS(level: LevelDef): GameState {
  return {
    playerLane: 1,
    rivals: Array.from({ length: level.rivalCount }, (_, i) => ({
      id: uid(), lane: Math.floor(Math.random()*LANES),
      gap: 2 + i * 1.8,
      speed: RIVAL_SPEEDS[i] ?? BASE_SPEED*0.9,
      color: RIVAL_COLORS[i], name: RIVAL_NAMES[i], changeCd: 0,
    })),
    obstacles: [], powerups: [],
    boostBar: 0, boosting: false, latencyTimer: 0,
    finishGap: RACE_DISTANCE, laneChangeCd: 0,
    hazardTimer: 1.2, puTimer: 1.8,
    hitFlash: 0, lastTs: null, timeMs: 0,
  }
}

/* ---- Visual components ---- */
function PlayerPod({ lane, latency, boosting, hitFlash }: {
  lane: number; latency: number; boosting: boolean; hitFlash: number
}) {
  const x = LANE_X[lane]
  const color = latency > 0 ? '#F5A524' : boosting ? '#00FFE0' : '#2DE2C5'
  return (
    <div style={{ position:'absolute', left:`${x}%`, top:`${PLAYER_Y}%`, transform:'translate(-50%,-50%)', zIndex:10 }}>
      {boosting && (
        <div style={{
          position:'absolute', left:'50%', bottom:-8, transform:'translateX(-50%)',
          width:8, height:22, borderRadius:4,
          background:'linear-gradient(to bottom, #00FFE0AA, transparent)', filter:'blur(3px)',
        }} />
      )}
      {hitFlash > 0 && (
        <div style={{
          position:'absolute', inset:-14, borderRadius:'50%',
          background:'radial-gradient(circle, #FF220055, transparent 70%)', opacity:hitFlash,
        }} />
      )}
      <svg viewBox="0 0 28 44" width="28" height="44">
        <defs>
          <linearGradient id="nrPod" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0"   stopColor={color} />
            <stop offset="0.5" stopColor="#0A1828" />
            <stop offset="1"   stopColor="#050C14" />
          </linearGradient>
          <radialGradient id="nrGlow" cx="0.5" cy="0.35" r="0.6">
            <stop offset="0" stopColor={color} stopOpacity="0.9" />
            <stop offset="1" stopColor={color} stopOpacity="0"   />
          </radialGradient>
        </defs>
        <path d="M14,2 C19,2 22,7 22,14 L22,34 C22,40 19,42 14,42 C9,42 6,40 6,34 L6,14 C6,7 9,2 14,2 Z"
          fill="url(#nrPod)" stroke={color} strokeWidth="1" strokeOpacity="0.8" />
        <ellipse cx="14" cy="10" rx="4"   ry="5.5" fill="url(#nrGlow)" />
        <ellipse cx="13" cy="8"  rx="1.5" ry="2.5" fill="#FFFFFF" opacity="0.6" />
        <path d="M6,22 L1,30 L6,32 Z"   fill={color} opacity="0.6" />
        <path d="M22,22 L27,30 L22,32 Z" fill={color} opacity="0.6" />
        <ellipse cx="14" cy="40" rx="4.5" ry="2.5" fill={color} opacity="0.4" />
      </svg>
    </div>
  )
}

function RivalPod({ x, y, color }: { x: number; y: number; color: string }) {
  const gradId = `rg-${color.replace('#','')}`
  return (
    <div style={{
      position:'absolute', left:`${x}%`, top:`${y}%`,
      transform:'translate(-50%,-50%)',
      opacity: y < 0 || y > 105 ? 0 : 1, transition:'opacity 200ms',
    }}>
      <svg viewBox="0 0 24 38" width="24" height="38">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0"   stopColor={color} />
            <stop offset="0.6" stopColor="#0A0F1A" />
            <stop offset="1"   stopColor="#050810" />
          </linearGradient>
        </defs>
        <path d="M12,2 C16,2 18,6 18,12 L18,30 C18,35 16,36 12,36 C8,36 6,35 6,30 L6,12 C6,6 8,2 12,2 Z"
          fill={`url(#${gradId})`} stroke={color} strokeWidth="0.8" strokeOpacity="0.7" />
        <ellipse cx="12" cy="9" rx="3" ry="4" fill={color} opacity="0.35" />
        <path d="M6,20 L2,27 L6,29 Z"   fill={color} opacity="0.5" />
        <path d="M18,20 L22,27 L18,29 Z" fill={color} opacity="0.5" />
      </svg>
    </div>
  )
}

function Firewall({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position:'absolute', left:`${x}%`, top:`${y}%`, transform:'translate(-50%,-50%)', width:38, height:24 }}>
      <svg viewBox="0 0 38 24" width="38" height="24">
        <rect x="1" y="1" width="36" height="22" rx="3" fill="#1A0505" stroke="#FF2200" strokeWidth="1.5" />
        <rect x="4" y="4" width="30" height="16" rx="2" fill="#FF220015" />
        <text x="19" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#FF5533" fontFamily="monospace">FIREWALL</text>
      </svg>
    </div>
  )
}

function LatencySpike({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position:'absolute', left:`${x}%`, top:`${y}%`, transform:'translate(-50%,-50%)', width:26, height:30 }}>
      <svg viewBox="0 0 26 30" width="26" height="30">
        <polygon points="13,2 22,28 13,22 4,28" fill="#F5A52430" stroke="#F5A524" strokeWidth="1.5" />
        <text x="13" y="18" textAnchor="middle" fontSize="9" fontWeight="900" fill="#F5A524" fontFamily="monospace">!</text>
        <circle cx="13" cy="10" r="2" fill="#F5A524" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

function BandwidthPU({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position:'absolute', left:`${x}%`, top:`${y}%`, transform:'translate(-50%,-50%)', width:22, height:26 }}>
      <svg viewBox="0 0 22 26" width="22" height="26">
        <polygon points="12,2 4,14 10,14 8,24 18,10 12,10 14,2" fill="#00FFE040" stroke="#00FFE0" strokeWidth="1.3">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="0.8s" repeatCount="indefinite" />
        </polygon>
      </svg>
    </div>
  )
}

function FinishLine({ y }: { y: number }) {
  if (y < -5 || y > 105) return null
  return (
    <div style={{ position:'absolute', left:0, right:0, top:`${y}%`, transform:'translateY(-50%)', height:16, zIndex:5 }}>
      <svg width="100%" height="16" preserveAspectRatio="none">
        <defs>
          <pattern id="checker" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#FFFFFF" />
            <rect x="8" y="8" width="8" height="8" fill="#FFFFFF" />
            <rect x="8" width="8" height="8" fill="#000000" />
            <rect y="8" width="8" height="8" fill="#000000" />
          </pattern>
        </defs>
        <rect width="100%" height="16" fill="url(#checker)" opacity="0.85" />
      </svg>
      <div style={{
        position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
        background:'#000', padding:'1px 8px', borderRadius:4,
        fontSize:8, fontWeight:800, color:'#FFD700', letterSpacing:2,
      }}>FINISH</div>
    </div>
  )
}

/* ---- Main component ---- */
export default function NetRush({ onExit }: NetRushProps) {
  const [levelIdx,  setLevelIdx]  = useState(0)
  const [wins,      setWins]      = useState(0)
  const [status,    setStatus]    = useState<GameStatus>('idle')
  const [cdLeft,    setCdLeft]    = useState(0)
  const [drop,      setDrop]      = useState<CapsuleKey | null>(null)
  const [leveledUp, setLeveledUp] = useState(false)
  const [rd, setRd] = useState<RenderData>({
    playerLane:1, rivals:[], obstacles:[], powerups:[],
    boostBar:0, boosting:false, latencyTimer:0,
    finishGap:RACE_DISTANCE, finishScreenY: PLAYER_Y - RACE_DISTANCE * GAP_SCALE,
    hitFlash:0, position:1, timeMs:0,
  })

  const level  = LEVELS[levelIdx]
  const gsRef  = useRef<GameState | null>(null)
  const rafRef = useRef<number>(0)
  const runRef = useRef(false)
  const lvRef  = useRef(level)
  useEffect(() => { lvRef.current = level }, [level])

  const gameLoop = useCallback((ts: number) => {
    if (!runRef.current) return
    const gs  = gsRef.current!
    const lv  = lvRef.current
    const raw = gs.lastTs ? Math.min(ts - gs.lastTs, 50) : 16.67
    const dt  = raw / 1000
    gs.lastTs = ts

    const speedMult  = gs.latencyTimer > 0 ? 0.45 : 1
    const playerSpeed = (BASE_SPEED + (gs.boosting && gs.boostBar > 0 ? BOOST_BONUS : 0)) * speedMult

    if (gs.boosting && gs.boostBar > 0) gs.boostBar = Math.max(0, gs.boostBar - BOOST_DRAIN * dt)
    if (gs.latencyTimer > 0) gs.latencyTimer -= dt

    for (const r of gs.rivals) {
      r.gap -= (playerSpeed - r.speed) * dt * 0.1
      r.changeCd -= dt
      if (r.changeCd <= 0) {
        const lanes = ([0,1,2] as number[]).filter(l => l !== r.lane)
        r.lane = lanes[Math.floor(Math.random()*lanes.length)]
        r.changeCd = 2 + Math.random()*3
      }
    }

    gs.finishGap -= playerSpeed * dt * 0.1
    gs.laneChangeCd = Math.max(0, gs.laneChangeCd - dt)

    gs.hazardTimer -= dt
    if (gs.hazardTimer <= 0) {
      const lane = Math.floor(Math.random()*LANES)
      const type: ObstacleType = Math.random() < 0.55 ? 'firewall' : 'latency'
      gs.obstacles.push({ id:uid(), lane, y:-8, type })
      gs.hazardTimer = (1 / lv.hazardRate) * (0.6 + Math.random()*0.8)
    }

    gs.puTimer -= dt
    if (gs.puTimer <= 0) {
      gs.powerups.push({ id:uid(), lane:Math.floor(Math.random()*LANES), y:-8 })
      gs.puTimer = (1 / lv.puRate) * (0.8 + Math.random()*1.2)
    }

    const scrollRate = playerSpeed * 1.1
    gs.obstacles = gs.obstacles.map(o => ({ ...o, y: o.y + scrollRate * dt })).filter(o => o.y < 108)
    gs.powerups  = gs.powerups.map(p  => ({ ...p, y: p.y + scrollRate * dt })).filter(p => p.y < 108)

    const newObstacles: Obstacle[] = []
    for (const o of gs.obstacles) {
      if (Math.abs(o.y - PLAYER_Y) < 7 && o.lane === gs.playerLane) {
        if (o.type === 'firewall') {
          gs.hitFlash = 1
          for (const r of gs.rivals) r.gap = Math.max(0, r.gap - 1.5)
          gs.finishGap = Math.min(RACE_DISTANCE, gs.finishGap + 1.5)
        } else {
          gs.latencyTimer = 2.0
        }
      } else { newObstacles.push(o) }
    }
    gs.obstacles = newObstacles

    const newPU: Powerup[] = []
    for (const p of gs.powerups) {
      if (Math.abs(p.y - PLAYER_Y) < 7 && p.lane === gs.playerLane) {
        gs.boostBar = Math.min(BOOST_MAX, gs.boostBar + BOOST_FILL_HIT)
      } else { newPU.push(p) }
    }
    gs.powerups = newPU

    gs.hitFlash = Math.max(0, gs.hitFlash - dt*3)
    gs.timeMs  += raw

    const position = gs.rivals.filter(r => r.gap > 0).length + 1

    setRd({
      playerLane: gs.playerLane,
      rivals: gs.rivals.map(r => ({ ...r, screenY: PLAYER_Y - r.gap * GAP_SCALE, screenX: LANE_X[r.lane] })),
      obstacles: gs.obstacles.map(o => ({ ...o, screenX: LANE_X[o.lane] })),
      powerups:  gs.powerups.map(p  => ({ ...p, screenX: LANE_X[p.lane] })),
      boostBar: gs.boostBar, boosting: gs.boosting,
      latencyTimer: gs.latencyTimer, finishGap: gs.finishGap,
      finishScreenY: PLAYER_Y - gs.finishGap * GAP_SCALE,
      hitFlash: gs.hitFlash, position, timeMs: gs.timeMs,
    })

    if (gs.finishGap <= 0) {
      runRef.current = false
      if (position <= Math.min(2, lv.rivalCount)) { setDrop(rollDrop(lv.n)); setStatus('won') }
      else setStatus('lost_obj')
      return
    }
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [])

  const startGame = useCallback(() => {
    gsRef.current = freshGS(level)
    runRef.current = true
    setDrop(null); setLeveledUp(false); setStatus('playing')
    setRd({
      playerLane:1, rivals:[], obstacles:[], powerups:[],
      boostBar:0, boosting:false, latencyTimer:0,
      finishGap:RACE_DISTANCE, finishScreenY: PLAYER_Y - RACE_DISTANCE*GAP_SCALE,
      hitFlash:0, position:1, timeMs:0,
    })
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [level, gameLoop])

  useEffect(() => () => { runRef.current=false; cancelAnimationFrame(rafRef.current) }, [])

  useEffect(() => {
    if (status !== 'cooldown' || cdLeft <= 0) return
    const t = setInterval(() => setCdLeft(s => Math.max(0,s-1)), 1000)
    return () => clearInterval(t)
  }, [status, cdLeft])

  const shiftLane = useCallback((dir: number) => {
    const gs = gsRef.current
    if (!gs || gs.laneChangeCd > 0) return
    const next = Math.max(0, Math.min(LANES-1, gs.playerLane + dir))
    if (next === gs.playerLane) return
    gs.playerLane = next; gs.laneChangeCd = LANE_CHANGE_CD
  }, [])

  const setBoost = useCallback((val: boolean) => {
    if (gsRef.current) gsRef.current.boosting = val
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (status !== 'playing') return
      if (e.key==='ArrowLeft'  || e.key==='a') shiftLane(-1)
      if (e.key==='ArrowRight' || e.key==='d') shiftLane(1)
      if (e.key===' ' || e.key==='Shift') setBoost(true)
    }
    const up = (e: KeyboardEvent) => {
      if (e.key===' ' || e.key==='Shift') setBoost(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown',down); window.removeEventListener('keyup',up) }
  }, [status, shiftLane, setBoost])

  const collectReward = () => {
    const nw = wins+1
    if (nw >= level.wN && levelIdx < LEVELS.length-1) {
      setLevelIdx(i => i+1); setWins(0); setLeveledUp(true)
    } else { setWins(Math.min(nw, level.wN)) }
    setCdLeft(level.cd); setStatus('cooldown')
  }
  const afterLoss = () => { setWins(w => Math.max(0,w-1)); setCdLeft(level.cd); setStatus('cooldown') }

  const fmt  = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
  const cap  = drop ? CAPS[drop] : null
  const playing  = status === 'playing'
  const progPct  = Math.max(0, ((RACE_DISTANCE - rd.finishGap) / RACE_DISTANCE) * 100)
  const posLabel = (['1ST','2ND','3RD','4TH'] as const)[rd.position-1] ?? `${rd.position}TH`
  const boostActive = rd.boosting && rd.boostBar > 0

  return (
    <div style={{
      minHeight:'100vh', background:'#06090F', color:'#D8E2EC',
      fontFamily:"'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'20px 14px 40px',
      backgroundImage:'radial-gradient(circle at 50% -15%, rgba(0,255,224,0.06), transparent 55%)',
    }}>
      <style>{`
        @keyframes nrPop  { from{transform:scale(0.88);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes nrRoad { from{background-position:0 0} to{background-position:0 60px} }
      `}</style>

      <div style={{ width:'100%', maxWidth:440 }}>

        {/* ← Exit */}
        <button onClick={onExit} style={btnBack}>← GAMES</button>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:4, color:'#5B78A0' }}>SYNAPSE · MINIGAME</div>
            <div style={{ fontSize:24, fontWeight:800, letterSpacing:2, color:'#FFF' }}>
              NET<span style={{ color:'#00FFE0' }}>RUSH</span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{
              display:'inline-block', padding:'4px 12px', borderRadius:6,
              border:'1px solid rgba(0,255,224,0.4)', color:'#00FFE0', fontSize:13, fontWeight:700,
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
              background: i<wins?'#00FFE0':'transparent',
              border:`1.5px solid ${i<wins?'#00FFE0':'#33465E'}`,
              boxShadow: i<wins?'0 0 6px rgba(0,255,224,0.7)':'none',
              transition:'all 250ms',
            }} />
          ))}
          <span style={{ fontSize:11, color:'#5B78A0', marginLeft:'auto' }}>{wins}/{level.wN}</span>
        </div>

        {/* Race stats */}
        {playing && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
            <div style={sCard}>
              <div style={sLbl}>POSITION</div>
              <div style={{ ...sVal, color: rd.position===1?'#00FFE0':rd.position===2?'#F5C84A':'#FF5C8A' }}>{posLabel}</div>
            </div>
            <div style={sCard}>
              <div style={sLbl}>BOOST</div>
              <div style={{ height:6, background:'#11192A', borderRadius:99, overflow:'hidden', marginTop:4 }}>
                <div style={{ height:'100%', width:`${rd.boostBar}%`, borderRadius:99,
                  background: boostActive?'#00FFE0':'#2DE2C5BB', transition:'width 100ms' }} />
              </div>
              <div style={{ fontSize:9, color:'#5B78A0', marginTop:3 }}>{Math.round(rd.boostBar)}%</div>
            </div>
            <div style={sCard}>
              <div style={sLbl}>PROGRESS</div>
              <div style={{ height:6, background:'#11192A', borderRadius:99, overflow:'hidden', marginTop:4 }}>
                <div style={{ height:'100%', width:`${progPct}%`, borderRadius:99, background:'#00FFE0BB', transition:'width 200ms' }} />
              </div>
              <div style={{ fontSize:9, color:'#5B78A0', marginTop:3 }}>{Math.round(progPct)}%</div>
            </div>
          </div>
        )}

        {/* Playfield */}
        <div style={{
          position:'relative', width:'100%', height:420,
          borderRadius:14, overflow:'hidden', border:'1px solid #16202F', background:'#040810',
        }}>
          {/* Road grid */}
          <div style={{
            position:'absolute', inset:0,
            backgroundImage:`
              repeating-linear-gradient(180deg, transparent, transparent 28px, #0D1E2A 28px, #0D1E2A 30px),
              repeating-linear-gradient(90deg,  transparent, transparent 28px, #0D1E2A 28px, #0D1E2A 30px)
            `,
            backgroundSize:'30px 30px',
            animation: playing ? 'nrRoad 0.4s linear infinite' : 'none',
            opacity:0.5,
          }} />
          {/* Lane dividers */}
          {[33, 66].map(x => (
            <div key={x} style={{
              position:'absolute', left:`${x}%`, top:0, bottom:0, width:1,
              backgroundImage:'repeating-linear-gradient(180deg, rgba(0,255,224,0.18) 0px, rgba(0,255,224,0.18) 12px, transparent 12px, transparent 26px)',
            }} />
          ))}
          {/* Edge barriers */}
          <div style={{ position:'absolute', left:'8%',  top:0, bottom:0, width:2, background:'rgba(139,124,255,0.3)', boxShadow:'0 0 6px rgba(139,124,255,0.4)' }} />
          <div style={{ position:'absolute', right:'8%', top:0, bottom:0, width:2, background:'rgba(139,124,255,0.3)', boxShadow:'0 0 6px rgba(139,124,255,0.4)' }} />

          {playing && <FinishLine y={rd.finishScreenY} />}

          {rd.powerups.map(p  => <BandwidthPU key={p.id} x={p.screenX} y={p.y} />)}
          {rd.obstacles.map(o => o.type==='firewall'
            ? <Firewall     key={o.id} x={o.screenX} y={o.y} />
            : <LatencySpike key={o.id} x={o.screenX} y={o.y} />
          )}
          {rd.rivals.map(r => <RivalPod key={r.id} x={r.screenX} y={r.screenY} color={r.color} />)}

          {playing && (
            <PlayerPod lane={rd.playerLane} latency={rd.latencyTimer}
              boosting={boostActive} hitFlash={rd.hitFlash} />
          )}

          {/* Rival name tags */}
          {playing && rd.rivals.filter(r => r.screenY > 2 && r.screenY < 95).map(r => (
            <div key={`tag-${r.id}`} style={{
              position:'absolute', left:`${r.screenX}%`, top:`${r.screenY - 7}%`,
              transform:'translateX(-50%)', fontSize:7, fontWeight:800,
              color:r.color, textShadow:`0 0 6px ${r.color}`, whiteSpace:'nowrap',
            }}>{r.name}</div>
          ))}

          {/* Latency warning */}
          {rd.latencyTimer > 0 && (
            <div style={{
              position:'absolute', top:8, left:0, right:0, textAlign:'center',
              fontSize:10, fontWeight:800, color:'#F5A524', letterSpacing:2, textShadow:'0 0 8px #F5A524',
            }}>⚠ LATENCY SPIKE — {rd.latencyTimer.toFixed(1)}s</div>
          )}

          {/* Overlays */}
          {!playing && (
            <div style={{
              position:'absolute', inset:0, background:'rgba(4,8,16,0.92)', backdropFilter:'blur(3px)',
              display:'flex', alignItems:'center', justifyContent:'center', zIndex:10,
            }}>
              <div style={{ textAlign:'center', padding:22, width:'100%', maxWidth:300, animation:'nrPop 220ms ease' }}>

                {status==='idle' && (
                  <>
                    <div style={{ fontSize:42, marginBottom:8 }}>🏎️</div>
                    <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Network race initializing</div>
                    <p style={{ fontSize:11, color:'#8FA5C0', lineHeight:1.65, margin:'0 0 8px' }}>
                      Race your data pod through the network circuit.
                      Dodge <span style={{ color:'#FF2200' }}>firewalls</span> and <span style={{ color:'#F5A524' }}>latency spikes</span>,
                      collect <span style={{ color:'#00FFE0' }}>⚡ bandwidth boosts</span>.
                    </p>
                    <p style={{ fontSize:10, color:'#5B78A0', margin:'0 0 16px' }}>
                      Finish <span style={{ color:'#00FFE0' }}>1st or 2nd</span> to earn a capsule.
                    </p>
                    <div style={{ fontSize:10, color:'#5B78A0', margin:'0 0 16px', lineHeight:1.8 }}>
                      ◀▶ Change lane &nbsp;·&nbsp; BOOST = speed burst
                    </div>
                    <button onClick={startGame} style={btnCyan}>START RACE</button>
                  </>
                )}

                {status==='won' && cap && (
                  <>
                    <div style={{ fontSize:11, letterSpacing:3, color:'#00FFE0', marginBottom:8 }}>RACE COMPLETE ✓</div>
                    <div style={{ fontSize:28, fontWeight:800, color:'#00FFE0', marginBottom:12 }}>{posLabel}</div>
                    <div style={{
                      border:`1px solid ${cap.color}`, borderRadius:12, padding:'16px 12px',
                      background:'rgba(255,255,255,0.02)', boxShadow:`0 0 24px ${cap.color}33`, marginBottom:16,
                    }}>
                      <div style={{ fontSize:32 }}>{cap.icon}</div>
                      <div style={{ fontSize:9, letterSpacing:3, color:cap.color, margin:'6px 0 4px' }}>{cap.rarity}</div>
                      <div style={{ fontSize:12, fontWeight:700 }}>{cap.name}</div>
                      <div style={{ fontSize:10, color:'#8FA5C0', marginTop:4 }}>{cap.effect}</div>
                    </div>
                    <button onClick={collectReward} style={btnCyan}>CLAIM REWARD</button>
                  </>
                )}

                {status==='lost_obj' && (
                  <>
                    <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#F5A524', marginBottom:6 }}>
                      RACE ENDED — {posLabel}
                    </div>
                    <p style={{ fontSize:11, color:'#8FA5C0', margin:'0 0 16px' }}>
                      Needed top 2 to score. −1 win accumulated.
                    </p>
                    <button onClick={afterLoss} style={btnGhost}>CONTINUE</button>
                  </>
                )}

                {status==='cooldown' && (
                  <>
                    {leveledUp && (
                      <div style={{ fontSize:12, fontWeight:800, color:'#00FFE0', letterSpacing:2, marginBottom:12 }}>
                        ★ LEVEL {level.n} UNLOCKED ★
                      </div>
                    )}
                    <div style={{ fontSize:10, letterSpacing:3, color:'#5B78A0', marginBottom:8 }}>COOLDOWN</div>
                    <div style={{ fontSize:44, fontWeight:800, color:cdLeft>0?'#FFF':'#00FFE0', fontVariantNumeric:'tabular-nums' }}>
                      {fmt(cdLeft)}
                    </div>
                    <p style={{ fontSize:10, color:'#5B78A0', margin:'8px 0 18px' }}>
                      {cdLeft>0?'Network refreshing...':'Circuit ready.'}
                    </p>
                    <button onClick={startGame} disabled={cdLeft>0} style={cdLeft>0?btnDisabled:btnCyan}>
                      RACE AGAIN
                    </button>
                    {cdLeft>0 && (
                      <button onClick={()=>setCdLeft(0)} style={{ ...btnGhost, marginTop:10, fontSize:10 }}>
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
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:16, marginTop:12 }}>
          <button onPointerDown={()=>shiftLane(-1)} style={ctrlBtn} disabled={!playing}>◀</button>
          <button
            onPointerDown={()=>setBoost(true)}
            onPointerUp={()=>setBoost(false)}
            onPointerLeave={()=>setBoost(false)}
            style={{
              ...ctrlBtn, width:90, fontSize:10, letterSpacing:2,
              background: boostActive && playing ? 'rgba(0,255,224,0.12)' : '#0A1019',
              color:  boostActive && playing ? '#00FFE0' : '#33465E',
              border: `1px solid ${boostActive && playing ? '#00FFE0' : '#2D3F58'}`,
            }}
            disabled={!playing || rd.boostBar===0}
          >⚡ BOOST</button>
          <button onPointerDown={()=>shiftLane(1)} style={ctrlBtn} disabled={!playing}>▶</button>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', marginTop:12, fontSize:9, color:'#3D5270' }}>
          <span style={{ color:'rgba(255,34,0,0.65)'  }}>▬ Firewall — knocks you back</span>
          <span style={{ color:'rgba(245,165,36,0.65)'}}>▲ Latency spike — 2s slowdown</span>
          <span style={{ color:'rgba(0,255,224,0.65)' }}>⚡ Bandwidth — fills boost bar</span>
        </div>

        {/* Progression */}
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:10, letterSpacing:3, color:'#5B78A0', marginBottom:8 }}>PROGRESSION</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
            {LEVELS.map((lv,i) => (
              <div key={lv.n} style={{
                border:`1px solid ${i===levelIdx?'rgba(0,255,224,0.5)':'#16202F'}`,
                background: i===levelIdx?'rgba(0,255,224,0.05)':'#0A1019',
                borderRadius:8, padding:'8px 4px', textAlign:'center',
              }}>
                <div style={{ fontSize:12, fontWeight:700, color:i===levelIdx?'#00FFE0':i<levelIdx?'#8FA5C0':'#2D3F58' }}>L{lv.n}</div>
                <div style={{ fontSize:9, color:'#3D5270', marginTop:2 }}>{lv.rivalCount}v</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:10, color:'#3D5270', lineHeight:1.6, marginTop:10 }}>
            Finish top 2 to win · loss = −1 win (min 0) · no level drop · L5 = 3 rival processes.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---- Styles ---- */
const sCard = { background:'#0A1019', border:'1px solid #16202F', borderRadius:8, padding:'6px 6px', textAlign:'center' as const }
const sLbl  = { fontSize:9, color:'#5B78A0', letterSpacing:1, marginBottom:1 }
const sVal  = { fontSize:16, fontWeight:800, fontVariantNumeric:'tabular-nums' as const }

const btnBack = {
  background:'transparent', border:'1px solid #16202F', color:'#5B78A0',
  borderRadius:6, padding:'5px 12px', fontSize:10, letterSpacing:2, fontWeight:700,
  cursor:'pointer' as const, fontFamily:'inherit', marginBottom:12,
}
const btnCyan = {
  background:'#00FFE0', color:'#06090F', border:'none', borderRadius:8,
  padding:'12px 24px', fontSize:13, fontWeight:800, letterSpacing:2,
  cursor:'pointer' as const, fontFamily:'inherit', boxShadow:'0 0 18px rgba(0,255,224,0.4)', width:'100%',
}
const btnGhost = {
  background:'transparent', color:'#8FA5C0', border:'1px solid #33465E', borderRadius:8,
  padding:'11px 24px', fontSize:12, fontWeight:700, letterSpacing:2,
  cursor:'pointer' as const, fontFamily:'inherit', width:'100%',
}
const btnDisabled = { ...btnCyan, background:'#1A2536', color:'#41546E', boxShadow:'none', cursor:'not-allowed' as const }
const ctrlBtn = {
  width:56, height:44, borderRadius:10, background:'#0A1019',
  border:'1px solid #2D3F58', color:'#8FA5C0', fontSize:16, fontWeight:800,
  cursor:'pointer' as const, fontFamily:'inherit', touchAction:'none' as const,
  WebkitTapHighlightColor:'transparent', userSelect:'none' as const,
}