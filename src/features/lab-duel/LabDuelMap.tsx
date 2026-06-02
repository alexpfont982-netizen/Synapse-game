import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import type { Group } from 'three'
import AndroidEnemy from './AndroidEnemy'
import {
  BOT_ANCHOR,
  PANEL_DEFINITIONS,
  RACK_DISPLAY_LABELS,
  WALL_BOXES,
} from './labDuelConfig'
import DestructiblePanel from './DestructiblePanel'
import RackWall from './RackWall'
import type { PanelState, ShotEffect } from './labDuelTypes'

interface LabDuelMapProps {
  panels: PanelState[]
  botHealth: number
  botGroupRef: { current: Group | null }
  botHitPulse: number
  botDefeatedAt: number
  shotEffects: ShotEffect[]
}

function ImpactBurst({ effect }: { effect: ShotEffect }) {
  const burstColor =
    effect.impactKind === 'android'
      ? '#fb7185'
      : effect.impactKind === 'panel'
        ? '#fde68a'
        : effect.impactKind === 'player'
          ? '#fca5a5'
          : '#67e8f9'

  const burstScale =
    effect.impactKind === 'android'
      ? 1.2
      : effect.impactKind === 'panel'
        ? 1
        : 0.82

  return (
    <group position={effect.to}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06 * burstScale, 0.18 * burstScale, 20]} />
        <meshBasicMaterial color={burstColor} transparent opacity={0.78} />
      </mesh>

      {Array.from({ length: 5 }).map((_, index) => (
        <mesh
          key={`${effect.id}-spark-${index}`}
          position={[
            Math.cos(index * 1.24) * 0.1 * burstScale,
            Math.sin(index * 1.16) * 0.08 * burstScale,
            Math.sin(index * 0.82) * 0.06 * burstScale,
          ]}
          rotation={[0, 0, index * 0.42]}
        >
          <boxGeometry args={[0.02, 0.12, 0.02]} />
          <meshBasicMaterial color={burstColor} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  )
}

export default function LabDuelMap({
  panels,
  botHealth,
  botGroupRef,
  botHitPulse,
  botDefeatedAt,
  shotEffects,
}: LabDuelMapProps) {
  const wallLabels = useMemo(
    () =>
      WALL_BOXES.map((wall, index) => ({
        wall,
        label: RACK_DISPLAY_LABELS[index % RACK_DISPLAY_LABELS.length],
      })),
    [],
  )

  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 13, 40]} />

      <ambientLight intensity={0.56} color="#c7d2fe" />
      <directionalLight
        position={[7, 12, 6]}
        intensity={1.05}
        color="#dbeafe"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 4.2, 0]} intensity={20} distance={22} color="#22d3ee" />
      <pointLight position={[0, 3.4, -9]} intensity={16} distance={14} color="#8b5cf6" />
      <pointLight position={[0, 3.4, 9]} intensity={14} distance={14} color="#38bdf8" />
      <pointLight position={[8, 2.8, -6]} intensity={14} distance={11} color="#fb7185" />
      <pointLight position={[-8, 2.8, 6]} intensity={8} distance={10} color="#67e8f9" />
      <spotLight
        position={[BOT_ANCHOR[0], 6.4, BOT_ANCHOR[2] + 2]}
        angle={0.38}
        intensity={24}
        distance={18}
        penumbra={0.55}
        color="#fda4af"
        target-position={[BOT_ANCHOR[0], 1.4, BOT_ANCHOR[2]]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[24, 26, 24, 24]} />
        <meshStandardMaterial
          color="#030712"
          emissive="#020617"
          emissiveIntensity={0.18}
          roughness={0.88}
          metalness={0.22}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4, 0]}>
        <planeGeometry args={[24, 26, 16, 16]} />
        <meshStandardMaterial
          color="#020617"
          emissive="#0f172a"
          emissiveIntensity={0.34}
          roughness={0.82}
          metalness={0.22}
        />
      </mesh>

      {Array.from({ length: 8 }).map((_, index) => (
        <mesh key={`floor-glow-z-${index}`} position={[0, 0.02, -10.5 + index * 3]}>
          <boxGeometry args={[20.5, 0.03, 0.1]} />
          <meshBasicMaterial color={index % 2 === 0 ? '#22d3ee' : '#8b5cf6'} transparent opacity={0.22} />
        </mesh>
      ))}

      {Array.from({ length: 6 }).map((_, index) => (
        <mesh key={`floor-glow-x-${index}`} position={[-7.5 + index * 3, 0.02, 0]}>
          <boxGeometry args={[0.1, 0.03, 22]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} />
        </mesh>
      ))}

      {[-8.1, 0, 8.1].map((laneX, index) => (
        <mesh key={`aisle-lane-${laneX}`} position={[laneX, 0.025, 0]}>
          <boxGeometry args={[1.12, 0.02, 21.2]} />
          <meshBasicMaterial
            color={index === 1 ? '#8b5cf6' : '#38bdf8'}
            transparent
            opacity={0.1}
          />
        </mesh>
      ))}

      {Array.from({ length: 5 }).map((_, index) => (
        <mesh
          key={`ceiling-bar-${index}`}
          position={[-8 + index * 4, 3.86, 0]}
        >
          <boxGeometry args={[0.18, 0.08, 22]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.24} />
        </mesh>
      ))}

      {wallLabels.map(({ wall, label }) => (
        <RackWall key={wall.id} wall={wall} label={label} />
      ))}

      {PANEL_DEFINITIONS.map((panel) => (
        <mesh key={`${panel.id}-frame`} position={panel.position}>
          <boxGeometry
            args={[panel.size[0] + 0.12, panel.size[1] + 0.12, panel.size[2] + 0.12]}
          />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.2} />
        </mesh>
      ))}

      {panels.map((panel) => (
        <DestructiblePanel key={panel.id} panel={panel} />
      ))}

      {(botHealth > 0 || botDefeatedAt > 0) && (
        <AndroidEnemy
          groupRef={botGroupRef}
          health={botHealth}
          hitPulse={botHitPulse}
          defeatedAt={botDefeatedAt}
        />
      )}

      <mesh position={[BOT_ANCHOR[0], 0.01, BOT_ANCHOR[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.42, 36]} />
        <meshBasicMaterial color="#fb7185" transparent opacity={0.14} />
      </mesh>

      {shotEffects.map((effect) => (
        <group key={effect.id}>
          <Line
            points={[effect.from, effect.to]}
            color={effect.color}
            lineWidth={1.8}
            transparent
            opacity={0.96}
          />
          <mesh position={effect.to}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshBasicMaterial color={effect.color} transparent opacity={0.88} />
          </mesh>
          <ImpactBurst effect={effect} />
        </group>
      ))}
    </>
  )
}
