import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { MathUtils } from 'three'
import type { Group, MeshBasicMaterial, PointLight, MeshStandardMaterial } from 'three'
import { BOT_DISPLAY_NAME } from './labDuelConfig'

interface AndroidEnemyProps {
  groupRef: { current: Group | null }
  health: number
  hitPulse: number
  defeatedAt: number
}

export default function AndroidEnemy({
  groupRef,
  health,
  hitPulse,
  defeatedAt,
}: AndroidEnemyProps) {
  const chassisRef = useRef<Group | null>(null)
  const eyeMaterialRef = useRef<MeshStandardMaterial | null>(null)
  const coreMaterialRef = useRef<MeshStandardMaterial | null>(null)
  const impactRingRef = useRef<Group | null>(null)
  const impactRingMaterialRef = useRef<MeshBasicMaterial | null>(null)
  const coreLightRef = useRef<PointLight | null>(null)
  const healthRatio = Math.max(0, health / 3)

  const barColor = useMemo(() => {
    if (healthRatio > 0.66) return '#22d3ee'
    if (healthRatio > 0.33) return '#f59e0b'
    return '#fb7185'
  }, [healthRatio])

  useFrame((state) => {
    const idleFloat = Math.sin(state.clock.elapsedTime * 2.3) * 0.045
    const idleTilt = Math.sin(state.clock.elapsedTime * 1.6) * 0.018
    const hitGlow = Math.max(0, 1 - (performance.now() - hitPulse) / 180)
    const defeatProgress = defeatedAt
      ? MathUtils.clamp((performance.now() - defeatedAt) / 720, 0, 1)
      : 0

    if (chassisRef.current) {
      chassisRef.current.position.y = MathUtils.lerp(idleFloat, -0.34, defeatProgress)
      chassisRef.current.rotation.z = MathUtils.lerp(idleTilt, -0.92, defeatProgress)
      chassisRef.current.rotation.x = MathUtils.lerp(0, 1.22, defeatProgress)
    }

    if (eyeMaterialRef.current) {
      eyeMaterialRef.current.emissiveIntensity =
        MathUtils.lerp(0.55 + hitGlow * 1.1, 0.08, defeatProgress)
    }

    if (coreMaterialRef.current) {
      coreMaterialRef.current.emissiveIntensity =
        MathUtils.lerp(0.32 + hitGlow * 0.95, 0.04, defeatProgress)
    }

    if (impactRingRef.current) {
      const impactScale = 1 + hitGlow * 0.72
      impactRingRef.current.scale.setScalar(impactScale)
      impactRingRef.current.position.y = 1.52
    }

    if (impactRingMaterialRef.current) {
      impactRingMaterialRef.current.opacity = hitGlow * (1 - defeatProgress) * 0.72
    }

    if (coreLightRef.current) {
      coreLightRef.current.intensity = MathUtils.lerp(1.9 + hitGlow * 2.4, 0.2, defeatProgress)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.8, 1.16, 40]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.68} />
      </mesh>

      <group ref={chassisRef}>
        <group ref={impactRingRef} position={[0, 1.52, 0.3]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.55, 0.06, 10, 36]} />
            <meshBasicMaterial
              ref={impactRingMaterialRef}
              color="#fda4af"
              transparent
              opacity={0}
            />
          </mesh>
        </group>

        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.2, 12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.72} roughness={0.4} />
        </mesh>

        <mesh position={[0, 1.22, 0]} castShadow>
          <boxGeometry args={[0.9, 1.3, 0.56]} />
          <meshStandardMaterial
            ref={coreMaterialRef}
            color="#0f172a"
            emissive="#22d3ee"
            emissiveIntensity={0.32}
            roughness={0.28}
            metalness={0.7}
          />
        </mesh>

        <mesh position={[0, 1.34, 0.31]} castShadow>
          <boxGeometry args={[0.48, 0.32, 0.08]} />
          <meshStandardMaterial
            color="#111827"
            emissive="#a855f7"
            emissiveIntensity={0.28}
            roughness={0.18}
            metalness={0.52}
          />
        </mesh>

        <pointLight
          ref={coreLightRef}
          position={[0, 1.42, 0.16]}
          intensity={1.9}
          distance={3.2}
          color="#fb7185"
        />

        <mesh position={[0, 2.08, 0]} castShadow>
          <sphereGeometry args={[0.34, 20, 20]} />
          <meshStandardMaterial
            color="#cbd5e1"
            emissive="#1e293b"
            emissiveIntensity={0.2}
            roughness={0.24}
            metalness={0.35}
          />
        </mesh>

        <mesh position={[0, 2.02, 0.24]} castShadow>
          <boxGeometry args={[0.42, 0.12, 0.08]} />
          <meshStandardMaterial
            color="#111827"
            emissive="#111827"
            emissiveIntensity={0.15}
            roughness={0.12}
            metalness={0.5}
          />
        </mesh>

        <mesh position={[-0.11, 2.03, 0.29]} castShadow>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial
            ref={eyeMaterialRef}
            color="#f8fafc"
            emissive="#fb7185"
            emissiveIntensity={0.55}
            roughness={0.05}
            metalness={0.2}
          />
        </mesh>

        <mesh position={[0.11, 2.03, 0.29]} castShadow>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#fb7185"
            emissiveIntensity={0.55}
            roughness={0.05}
            metalness={0.2}
          />
        </mesh>

        <mesh position={[-0.68, 1.25, 0]} castShadow rotation={[0, 0, 0.12]}>
          <boxGeometry args={[0.18, 0.95, 0.18]} />
          <meshStandardMaterial color="#0f172a" emissive="#7c3aed" emissiveIntensity={0.22} />
        </mesh>
        <mesh position={[0.68, 1.25, 0]} castShadow rotation={[0, 0, -0.12]}>
          <boxGeometry args={[0.18, 0.95, 0.18]} />
          <meshStandardMaterial color="#0f172a" emissive="#7c3aed" emissiveIntensity={0.22} />
        </mesh>

        <mesh position={[-0.84, 0.63, 0.04]} castShadow rotation={[0, 0, -0.18]}>
          <boxGeometry args={[0.16, 0.72, 0.16]} />
          <meshStandardMaterial color="#111827" emissive="#1d4ed8" emissiveIntensity={0.18} />
        </mesh>
        <mesh position={[0.84, 0.63, 0.04]} castShadow rotation={[0, 0, 0.18]}>
          <boxGeometry args={[0.16, 0.72, 0.16]} />
          <meshStandardMaterial color="#111827" emissive="#1d4ed8" emissiveIntensity={0.18} />
        </mesh>

        <mesh position={[-0.24, 0.46, 0]} castShadow rotation={[0, 0, 0.04]}>
          <boxGeometry args={[0.2, 0.98, 0.2]} />
          <meshStandardMaterial color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.18} />
        </mesh>
        <mesh position={[0.24, 0.46, 0]} castShadow rotation={[0, 0, -0.04]}>
          <boxGeometry args={[0.2, 0.98, 0.2]} />
          <meshStandardMaterial color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.18} />
        </mesh>

        <mesh position={[0, 0.04, 0.12]} castShadow>
          <boxGeometry args={[0.92, 0.16, 0.34]} />
          <meshStandardMaterial color="#020617" emissive="#67e8f9" emissiveIntensity={0.12} />
        </mesh>
      </group>

      <Billboard position={[0, 3.16, 0]} follow>
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.9, 0.22, 0.04]} />
            <meshBasicMaterial color="#020617" transparent opacity={0.82} />
          </mesh>
          {healthRatio > 0 && (
            <mesh position={[-0.95 + healthRatio * 0.95, 0, 0.02]}>
              <boxGeometry args={[1.9 * healthRatio, 0.12, 0.04]} />
              <meshBasicMaterial color={barColor} />
            </mesh>
          )}

          <Text
            position={[0, 0.34, 0.02]}
            fontSize={0.2}
            anchorX="center"
            anchorY="middle"
            color="#e2e8f0"
          >
            {BOT_DISPLAY_NAME}
          </Text>

          {health === 0 && (
            <Text
              position={[0, -0.3, 0.02]}
              fontSize={0.13}
              anchorX="center"
              anchorY="middle"
              color="#fda4af"
            >
              OFFLINE
            </Text>
          )}
        </group>
      </Billboard>
    </group>
  )
}
