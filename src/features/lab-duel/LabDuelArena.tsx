import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  type MutableRefObject,
  useRef,
  useState,
} from 'react'
import { Box3, MathUtils, Ray, Sphere, Vector3 } from 'three'
import type { Group } from 'three'
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib'
import LabDuelHUD from './LabDuelHUD'
import LabDuelMap from './LabDuelMap'
import PlayerWeapon from './PlayerWeapon'
import {
  BOT_ACCURACY,
  BOT_ANCHOR,
  BOT_EYE_HEIGHT,
  BOT_FIRE_INTERVAL_MS,
  BOT_HIT_RADIUS,
  BOT_RANGE,
  BOT_STRAFE_AMPLITUDE,
  BOT_STRAFE_SPEED,
  CRITICAL_TIME_THRESHOLD,
  LOW_TIME_THRESHOLD,
  MATCH_DURATION_SECONDS,
  PANEL_DEFINITIONS,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_SPAWN,
  SHOT_RANGE,
  STARTING_HEALTH,
  WALL_BOXES,
} from './labDuelConfig'
import type {
  ArenaBox,
  DuelPhase,
  DuelResult,
  DuelStats,
  PanelState,
  ShotEffect,
  Vec3Tuple,
} from './labDuelTypes'

interface LabDuelArenaProps {
  onExit: () => void
}

interface LabDuelSceneProps {
  phase: DuelPhase
  resetTick: number
  controlsLocked: boolean
  firingPulse: number
  panelsRef: MutableRefObject<PanelState[]>
  playerAliveRef: MutableRefObject<boolean>
  rivalAliveRef: MutableRefObject<boolean>
  onControlsLockedChange: (locked: boolean) => void
  onPlayerShot: (effect: ShotEffect) => void
  onBotShot: (effect: ShotEffect) => void
  onPlayerHitBot: () => void
  onBotHitPlayer: () => void
  onPanelHit: (panelId: string) => void
  botHealth: number
  botHitPulse: number
  botDefeatedAt: number
  panels: PanelState[]
  shotEffects: ShotEffect[]
}

type MovementKey = 'KeyW' | 'KeyA' | 'KeyS' | 'KeyD'
type ShotIntersection =
  | { type: 'bot'; distance: number; point: Vector3 }
  | { type: 'panel'; id: string; distance: number; point: Vector3 }
  | { type: 'wall'; distance: number; point: Vector3 }
  | null

const MOVEMENT_KEYS: MovementKey[] = ['KeyW', 'KeyA', 'KeyS', 'KeyD']
const UP_VECTOR = new Vector3(0, 1, 0)

function createInitialPanels(): PanelState[] {
  return PANEL_DEFINITIONS.map((panel) => ({
    ...panel,
    health: panel.maxHealth,
    destroyed: false,
  }))
}

function vecToTuple(vector: Vector3): Vec3Tuple {
  return [vector.x, vector.y, vector.z]
}

function boxToBounds(box: ArenaBox) {
  const [x, y, z] = box.position
  const [width, height, depth] = box.size

  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    minY: y - height / 2,
    maxY: y + height / 2,
  }
}

function buildObstacleBoxes(panels: PanelState[]) {
  return [...WALL_BOXES, ...panels.filter((panel) => !panel.destroyed)]
}

function circleIntersectsBox2D(
  point: Vector3,
  radius: number,
  obstacle: ArenaBox,
) {
  const bounds = boxToBounds(obstacle)
  const closestX = Math.max(bounds.minX, Math.min(point.x, bounds.maxX))
  const closestZ = Math.max(bounds.minZ, Math.min(point.z, bounds.maxZ))
  const dx = point.x - closestX
  const dz = point.z - closestZ

  return dx * dx + dz * dz < radius * radius
}

function moveWithCollisions(
  currentPosition: Vector3,
  desiredDelta: Vector3,
  obstacles: ArenaBox[],
) {
  const nextPosition = currentPosition.clone()
  const xAttempt = currentPosition.clone()
  xAttempt.x += desiredDelta.x

  if (
    !obstacles.some((obstacle) =>
      circleIntersectsBox2D(xAttempt, PLAYER_RADIUS, obstacle),
    )
  ) {
    nextPosition.x = xAttempt.x
  }

  const zAttempt = nextPosition.clone()
  zAttempt.z += desiredDelta.z

  if (
    !obstacles.some((obstacle) =>
      circleIntersectsBox2D(zAttempt, PLAYER_RADIUS, obstacle),
    )
  ) {
    nextPosition.z = zAttempt.z
  }

  nextPosition.x = MathUtils.clamp(nextPosition.x, -9.8, 9.8)
  nextPosition.z = MathUtils.clamp(nextPosition.z, -10.8, 10.8)
  nextPosition.y = PLAYER_HEIGHT

  return nextPosition
}

function findShotIntersection(
  origin: Vector3,
  direction: Vector3,
  panels: PanelState[],
  botPosition: Vector3,
): ShotIntersection {
  const ray = new Ray(origin.clone(), direction.clone())
  const hitPoint = new Vector3()
  let nearestDistance = SHOT_RANGE
  let result: ShotIntersection = null

  const botSphere = new Sphere(
    new Vector3(botPosition.x, BOT_EYE_HEIGHT, botPosition.z),
    BOT_HIT_RADIUS,
  )
  const botHit = ray.intersectSphere(botSphere, hitPoint)

  if (botHit) {
    const distance = origin.distanceTo(botHit)
    if (distance < nearestDistance) {
      nearestDistance = distance
      result = {
        type: 'bot',
        distance,
        point: botHit.clone(),
      }
    }
  }

  buildObstacleBoxes(panels).forEach((obstacle) => {
    const bounds = boxToBounds(obstacle)
    const box = new Box3(
      new Vector3(bounds.minX, bounds.minY, bounds.minZ),
      new Vector3(bounds.maxX, bounds.maxY, bounds.maxZ),
    )
    const point = ray.intersectBox(box, hitPoint)

    if (!point) {
      return
    }

    const distance = origin.distanceTo(point)
    if (distance >= nearestDistance) {
      return
    }

    nearestDistance = distance

    if ('maxHealth' in obstacle) {
      result = {
        type: 'panel',
        id: obstacle.id,
        distance,
        point: point.clone(),
      }
      return
    }

    result = {
      type: 'wall',
      distance,
      point: point.clone(),
    }
  })

  return result
}

function hasClearLineOfSight(
  origin: Vector3,
  target: Vector3,
  panels: PanelState[],
) {
  const direction = target.clone().sub(origin)
  const targetDistance = direction.length()
  const ray = new Ray(origin.clone(), direction.normalize())
  const point = new Vector3()

  return !buildObstacleBoxes(panels).some((obstacle) => {
    const bounds = boxToBounds(obstacle)
    const box = new Box3(
      new Vector3(bounds.minX, bounds.minY, bounds.minZ),
      new Vector3(bounds.maxX, bounds.maxY, bounds.maxZ),
    )
    const hit = ray.intersectBox(box, point)
    if (!hit) {
      return false
    }

    return origin.distanceTo(hit) < targetDistance - 0.25
  })
}

function getLaboratoryStatus(phase: DuelPhase, timeLeft: number) {
  if (phase === 'intro') {
    return 'Laboratory standby'
  }

  if (phase === 'finished') {
    return 'Resolution locked'
  }

  if (timeLeft <= CRITICAL_TIME_THRESHOLD) {
    return 'Explosion imminent'
  }

  if (timeLeft <= LOW_TIME_THRESHOLD) {
    return 'Containment failing'
  }

  if (timeLeft <= 60) {
    return 'Thermal load rising'
  }

  return 'Cooling stable'
}

function LabDuelScene({
  phase,
  resetTick,
  controlsLocked,
  firingPulse,
  panelsRef,
  playerAliveRef,
  rivalAliveRef,
  onControlsLockedChange,
  onPlayerShot,
  onBotShot,
  onPlayerHitBot,
  onBotHitPlayer,
  onPanelHit,
  botHealth,
  botHitPulse,
  botDefeatedAt,
  panels,
  shotEffects,
}: LabDuelSceneProps) {
  const { camera, gl, clock } = useThree()
  const controlsRef = useRef<PointerLockControlsImpl | null>(null)
  const botGroupRef = useRef<Group | null>(null)
  const keyStateRef = useRef<Record<MovementKey, boolean>>({
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
  })
  const playerPositionRef = useRef(new Vector3(...PLAYER_SPAWN))
  const botPositionRef = useRef(
    new Vector3(BOT_ANCHOR[0], BOT_EYE_HEIGHT, BOT_ANCHOR[2]),
  )
  const lastBotShotAtRef = useRef(0)
  const roundStartedAtRef = useRef(0)

  useEffect(() => {
    const resetPosition = new Vector3(...PLAYER_SPAWN)
    const lookTarget = new Vector3(
      BOT_ANCHOR[0],
      BOT_EYE_HEIGHT + 0.22,
      BOT_ANCHOR[2],
    )

    playerPositionRef.current.copy(resetPosition)
    botPositionRef.current.set(BOT_ANCHOR[0], BOT_EYE_HEIGHT, BOT_ANCHOR[2])
    camera.position.copy(resetPosition)
    camera.lookAt(lookTarget)
    if (botGroupRef.current) {
      botGroupRef.current.position.set(BOT_ANCHOR[0], 0, BOT_ANCHOR[2])
      botGroupRef.current.lookAt(resetPosition.x, 1.05, resetPosition.z)
    }
    controlsRef.current?.unlock()
    onControlsLockedChange(false)
    lastBotShotAtRef.current = 0
    roundStartedAtRef.current = clock.getElapsedTime()
  }, [camera, clock, onControlsLockedChange, resetTick])

  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement
      onControlsLockedChange(locked)
    }

    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [gl, onControlsLockedChange])

  useEffect(() => {
    if (phase !== 'playing') {
      controlsRef.current?.unlock()
      onControlsLockedChange(false)
    }
  }, [onControlsLockedChange, phase])

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (MOVEMENT_KEYS.includes(event.code as MovementKey)) {
      keyStateRef.current[event.code as MovementKey] = true
    }
  })

  const handleKeyUp = useEffectEvent((event: KeyboardEvent) => {
    if (MOVEMENT_KEYS.includes(event.code as MovementKey)) {
      keyStateRef.current[event.code as MovementKey] = false
    }
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => handleKeyDown(event)
    const onKeyUp = (event: KeyboardEvent) => handleKeyUp(event)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const firePlayerShot = useEffectEvent(() => {
    if (
      phase !== 'playing' ||
      !playerAliveRef.current ||
      !rivalAliveRef.current
    ) {
      return
    }

    const direction = new Vector3()
    camera.getWorldDirection(direction)
    const origin = camera.position.clone()
    const hit = findShotIntersection(
      origin,
      direction,
      panelsRef.current,
      botPositionRef.current,
    )

    if (hit?.type === 'bot') {
      onPlayerHitBot()
      onPlayerShot({
        id: Date.now() + Math.random(),
        from: vecToTuple(origin),
        to: vecToTuple(hit.point),
        color: '#67e8f9',
        impactKind: 'android',
      })
      return
    }

    if (hit && hit.type === 'panel' && 'id' in hit) {
      onPanelHit(hit.id)
      onPlayerShot({
        id: Date.now() + Math.random(),
        from: vecToTuple(origin),
        to: vecToTuple(hit.point),
        color: '#67e8f9',
        impactKind: 'panel',
      })
      return
    }

    onPlayerShot({
      id: Date.now() + Math.random(),
      from: vecToTuple(origin),
      to: vecToTuple(
        hit?.point ?? origin.clone().add(direction.multiplyScalar(SHOT_RANGE)),
      ),
      color: '#67e8f9',
      impactKind: hit?.type === 'wall' ? 'wall' : undefined,
    })
  })

  const handleMouseDown = useEffectEvent((event: MouseEvent) => {
    if (phase !== 'playing' || event.button !== 0) {
      return
    }

    if (!controlsRef.current?.isLocked) {
      controlsRef.current?.lock()
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock?.()
      }
      return
    }

    firePlayerShot()
  })

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => handleMouseDown(event)
    gl.domElement.addEventListener('mousedown', handlePointer)

    return () => {
      gl.domElement.removeEventListener('mousedown', handlePointer)
    }
  }, [gl])

  useFrame((_, delta) => {
    if (phase !== 'playing') {
      return
    }

    const controlsLocked = controlsRef.current?.isLocked ?? false

    const forward = new Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = forward.clone().cross(UP_VECTOR).normalize()
    const moveVector = new Vector3()

    if (keyStateRef.current.KeyW) moveVector.add(forward)
    if (keyStateRef.current.KeyS) moveVector.sub(forward)
    if (keyStateRef.current.KeyA) moveVector.sub(right)
    if (keyStateRef.current.KeyD) moveVector.add(right)

    if (controlsLocked && moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(PLAYER_SPEED * delta)
      const nextPosition = moveWithCollisions(
        playerPositionRef.current,
        moveVector,
        buildObstacleBoxes(panelsRef.current),
      )

      playerPositionRef.current.copy(nextPosition)
      camera.position.copy(nextPosition)
    }

    const elapsed = clock.getElapsedTime()
    const roundElapsed = Math.max(0, elapsed - roundStartedAtRef.current)
    const strafeElapsed = Math.max(0, roundElapsed - 1.1)
    botPositionRef.current.set(
      BOT_ANCHOR[0] + Math.sin(strafeElapsed * BOT_STRAFE_SPEED) * BOT_STRAFE_AMPLITUDE,
      BOT_EYE_HEIGHT,
      BOT_ANCHOR[2] + Math.sin(strafeElapsed * 0.42) * 0.64,
    )

    if (botGroupRef.current) {
      botGroupRef.current.position.set(
        botPositionRef.current.x,
        0,
        botPositionRef.current.z,
      )

      botGroupRef.current.lookAt(
        playerPositionRef.current.x,
        1.05,
        playerPositionRef.current.z,
      )
    }

    const now = performance.now()
    const target = new Vector3(
      playerPositionRef.current.x,
      PLAYER_HEIGHT,
      playerPositionRef.current.z,
    )
    const botOrigin = new Vector3(
      botPositionRef.current.x,
      BOT_EYE_HEIGHT,
      botPositionRef.current.z,
    )

    if (
      rivalAliveRef.current &&
      playerAliveRef.current &&
      botHealth > 0 &&
      controlsLocked &&
      now - lastBotShotAtRef.current > BOT_FIRE_INTERVAL_MS
    ) {
      const distance = botOrigin.distanceTo(target)
      const hasSight =
        distance <= BOT_RANGE &&
        hasClearLineOfSight(botOrigin, target, panelsRef.current)

      if (hasSight) {
        lastBotShotAtRef.current = now

        const aimTarget =
          Math.random() <= BOT_ACCURACY
            ? target
            : target.clone().add(
                new Vector3(
                  MathUtils.randFloatSpread(1.8),
                  MathUtils.randFloatSpread(0.8),
                  MathUtils.randFloatSpread(1.8),
                ),
              )

        onBotShot({
          id: Date.now() + Math.random(),
          from: vecToTuple(botOrigin),
          to: vecToTuple(aimTarget),
          color: '#fb7185',
          impactKind: Math.random() <= BOT_ACCURACY ? 'player' : undefined,
        })

        if (Math.random() <= BOT_ACCURACY) {
          onBotHitPlayer()
        }
      }
    }
  })

  return (
    <>
      <PointerLockControls ref={controlsRef} />
      <LabDuelMap
        panels={panels}
        botHealth={botHealth}
        botGroupRef={botGroupRef}
        botHitPulse={botHitPulse}
        botDefeatedAt={botDefeatedAt}
        shotEffects={shotEffects}
      />
      <PlayerWeapon
        phase={phase}
        firingPulse={firingPulse}
        controlsLocked={controlsLocked}
      />
    </>
  )
}

export default function LabDuelArena({ onExit }: LabDuelArenaProps) {
  const [phase, setPhase] = useState<DuelPhase>('intro')
  const [playerHealth, setPlayerHealth] = useState(STARTING_HEALTH)
  const [rivalHealth, setRivalHealth] = useState(STARTING_HEALTH)
  const [hitsLanded, setHitsLanded] = useState(0)
  const [hitsTaken, setHitsTaken] = useState(0)
  const [panels, setPanels] = useState<PanelState[]>(() => createInitialPanels())
  const [timeLeft, setTimeLeft] = useState(MATCH_DURATION_SECONDS)
  const [controlsLocked, setControlsLocked] = useState(false)
  const [result, setResult] = useState<DuelResult | null>(null)
  const [resetTick, setResetTick] = useState(0)
  const [shotEffects, setShotEffects] = useState<ShotEffect[]>([])
  const [firingPulse, setFiringPulse] = useState(0)
  const [botHitPulse, setBotHitPulse] = useState(0)
  const [botDefeatedAt, setBotDefeatedAt] = useState(0)
  const [showHitConfirm, setShowHitConfirm] = useState(false)
  const [showDamageFlash, setShowDamageFlash] = useState(false)

  const endTimeRef = useRef<number | null>(null)
  const panelsRef = useRef(panels)
  const playerAliveRef = useRef(true)
  const rivalAliveRef = useRef(true)
  const hitConfirmTimeoutRef = useRef<number | null>(null)
  const damageFlashTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    panelsRef.current = panels
  }, [panels])

  useEffect(() => {
    playerAliveRef.current = playerHealth > 0
  }, [playerHealth])

  useEffect(() => {
    rivalAliveRef.current = rivalHealth > 0
  }, [rivalHealth])

  useEffect(
    () => () => {
      if (hitConfirmTimeoutRef.current) {
        window.clearTimeout(hitConfirmTimeoutRef.current)
      }

      if (damageFlashTimeoutRef.current) {
        window.clearTimeout(damageFlashTimeoutRef.current)
      }
    },
    [],
  )

  const pushShotEffect = useCallback((effect: ShotEffect) => {
    setShotEffects((current) => [...current.slice(-5), effect])

    window.setTimeout(() => {
      setShotEffects((current) => current.filter((item) => item.id !== effect.id))
    }, 130)
  }, [])

  const registerPlayerFire = useCallback(
    (effect: ShotEffect) => {
      pushShotEffect(effect)
      setFiringPulse(Date.now())
    },
    [pushShotEffect],
  )

  useEffect(() => {
    if (firingPulse === 0) {
      return undefined
    }

    const timeout = window.setTimeout(() => setFiringPulse(0), 120)

    return () => window.clearTimeout(timeout)
  }, [firingPulse])

  const finalizeMatch = useCallback((nextResult: DuelResult) => {
    endTimeRef.current = null
    setPhase('finished')
    setControlsLocked(false)
    setResult(nextResult)
  }, [])

  const startMatch = () => {
    setPanels(createInitialPanels())
    setPlayerHealth(STARTING_HEALTH)
    setRivalHealth(STARTING_HEALTH)
    setHitsLanded(0)
    setHitsTaken(0)
    setResult(null)
    setShotEffects([])
    setTimeLeft(MATCH_DURATION_SECONDS)
    setControlsLocked(false)
    setPhase('playing')
    setResetTick((current) => current + 1)
    setFiringPulse(0)
    setBotHitPulse(0)
    setBotDefeatedAt(0)
    setShowHitConfirm(false)
    setShowDamageFlash(false)
    endTimeRef.current = Date.now() + MATCH_DURATION_SECONDS * 1000
  }

  const restartMatch = () => {
    startMatch()
  }

  useEffect(() => {
    if (phase !== 'playing') {
      return undefined
    }

    const interval = window.setInterval(() => {
      if (!endTimeRef.current) {
        return
      }

      const nextTimeLeft = Math.max(
        0,
        Math.ceil((endTimeRef.current - Date.now()) / 1000),
      )
      setTimeLeft(nextTimeLeft)

      if (nextTimeLeft > 0) {
        return
      }

      if (hitsTaken > hitsLanded) {
        finalizeMatch({
          title: 'Laboratory Explosion',
          subtitle:
            'Critical failure reached zero and you had absorbed more impacts than the rival unit.',
          tone: 'rose',
        })
        return
      }

      if (hitsTaken < hitsLanded) {
        finalizeMatch({
          title: 'Laboratory Explosion',
          subtitle:
            'The lab detonated, but you were ahead on clean hits when the chamber collapsed.',
          tone: 'amber',
        })
        return
      }

      finalizeMatch({
        title: 'Draw',
        subtitle:
          'The reactor blew with both duelists tied on impact count. No winner this cycle.',
        tone: 'cyan',
      })
    }, 250)

    return () => window.clearInterval(interval)
  }, [finalizeMatch, hitsLanded, hitsTaken, phase])

  const handlePlayerHitBot = () => {
    const impactTimestamp = Date.now()
    setBotHitPulse(impactTimestamp)
    setShowHitConfirm(true)
    if (hitConfirmTimeoutRef.current) {
      window.clearTimeout(hitConfirmTimeoutRef.current)
    }
    hitConfirmTimeoutRef.current = window.setTimeout(() => {
      setShowHitConfirm(false)
    }, 170)
    setHitsLanded((current) => current + 1)
    setRivalHealth((current) => {
      const nextValue = Math.max(0, current - 1)

      if (nextValue === 0) {
        setBotDefeatedAt(impactTimestamp)
        finalizeMatch({
          title: 'Victory',
          subtitle:
            'The android unit lost all three integrity points before the chamber could collapse.',
          tone: 'emerald',
        })
      }

      return nextValue
    })
  }

  const handleBotHitPlayer = () => {
    setShowDamageFlash(true)
    if (damageFlashTimeoutRef.current) {
      window.clearTimeout(damageFlashTimeoutRef.current)
    }
    damageFlashTimeoutRef.current = window.setTimeout(() => {
      setShowDamageFlash(false)
    }, 220)
    setHitsTaken((current) => current + 1)
    setPlayerHealth((current) => {
      const nextValue = Math.max(0, current - 1)

      if (nextValue === 0) {
        finalizeMatch({
          title: 'Defeat',
          subtitle:
            'The android unit landed the third confirmed impact and forced the duel offline.',
          tone: 'rose',
        })
      }

      return nextValue
    })
  }

  const handlePanelImpact = useCallback((panelId: string) => {
    setPanels((current) =>
      current.map((panel) => {
        if (panel.id !== panelId || panel.destroyed) {
          return panel
        }

        const nextHealth = Math.max(0, panel.health - 1)

        return {
          ...panel,
          health: nextHealth,
          destroyed: nextHealth === 0,
        }
      }),
    )
  }, [])

  const panelsDestroyed = useMemo(
    () => panels.filter((panel) => panel.destroyed).length,
    [panels],
  )

  const stats: DuelStats = useMemo(
    () => ({
      timeLeft,
      playerHealth,
      rivalHealth,
      hitsLanded,
      hitsTaken,
      panelsDestroyed,
      statusLabel: getLaboratoryStatus(phase, timeLeft),
      controlsLocked,
    }),
    [
      controlsLocked,
      hitsLanded,
      hitsTaken,
      panelsDestroyed,
      phase,
      playerHealth,
      rivalHealth,
      timeLeft,
    ],
  )

  return (
    <section className="relative w-full max-w-[1400px]">
      <div className="surface-panel relative overflow-hidden rounded-[32px] border border-cyan-400/16 bg-slate-950/90 shadow-[0_0_50px_rgba(8,145,178,0.12)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.14),transparent_30%)]" />

        <div className="relative h-[calc(100vh-150px)] min-h-[680px] w-full">
          <Canvas
            shadows
            camera={{ fov: 75, position: PLAYER_SPAWN }}
            gl={{ antialias: true }}
          >
            <LabDuelScene
              phase={phase}
              resetTick={resetTick}
              controlsLocked={controlsLocked}
              firingPulse={firingPulse}
              panelsRef={panelsRef}
              playerAliveRef={playerAliveRef}
              rivalAliveRef={rivalAliveRef}
              onControlsLockedChange={setControlsLocked}
              onPlayerShot={registerPlayerFire}
              onBotShot={pushShotEffect}
              onPlayerHitBot={handlePlayerHitBot}
              onBotHitPlayer={handleBotHitPlayer}
              onPanelHit={handlePanelImpact}
              botHealth={rivalHealth}
              botHitPulse={botHitPulse}
              botDefeatedAt={botDefeatedAt}
              panels={panels}
              shotEffects={shotEffects}
            />
          </Canvas>

          <LabDuelHUD
            phase={phase}
            stats={stats}
            result={result}
            showHitConfirm={showHitConfirm}
            showDamageFlash={showDamageFlash}
            onStart={startMatch}
            onRestart={restartMatch}
            onExit={onExit}
          />
        </div>
      </div>
    </section>
  )
}
