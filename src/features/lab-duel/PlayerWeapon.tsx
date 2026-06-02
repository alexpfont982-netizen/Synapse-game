import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import type { Group, MeshBasicMaterial, PointLight } from 'three'
import type { DuelPhase } from './labDuelTypes'

interface PlayerWeaponProps {
  phase: DuelPhase
  firingPulse: number
  controlsLocked: boolean
}

const weaponBaseOffset = new Vector3(0.28, -0.31, -0.72)
const weaponBaseScale = 0.82
const tempVector = new Vector3()

export default function PlayerWeapon({
  phase,
  firingPulse,
  controlsLocked,
}: PlayerWeaponProps) {
  const { camera, clock } = useThree()
  const rootRef = useRef<Group | null>(null)
  const weaponRef = useRef<Group | null>(null)
  const flashOrbMaterialRef = useRef<MeshBasicMaterial | null>(null)
  const flashConeMaterialRef = useRef<MeshBasicMaterial | null>(null)
  const flashLightRef = useRef<PointLight | null>(null)

  useFrame(() => {
    if (!rootRef.current || !weaponRef.current || phase !== 'playing') {
      return
    }

    const shotAge = firingPulse
      ? performance.now() - firingPulse
      : Number.POSITIVE_INFINITY
    const recoil = shotAge < 160 ? 1 - shotAge / 160 : 0
    const sway = controlsLocked ? Math.sin(clock.elapsedTime * 4.6) * 0.012 : 0.004

    tempVector.copy(weaponBaseOffset)
    tempVector.x += Math.sin(clock.elapsedTime * 1.8) * 0.008
    tempVector.y += sway - recoil * 0.05
    tempVector.z += recoil * 0.085
    tempVector.applyQuaternion(camera.quaternion)

    rootRef.current.position.copy(camera.position).add(tempVector)
    rootRef.current.quaternion.copy(camera.quaternion)

    weaponRef.current.rotation.set(
      recoil * 0.16,
      -0.05 - recoil * 0.08,
      0.06 + recoil * 0.12,
    )
    weaponRef.current.position.set(0, 0, 0)

    const flashOpacity =
      shotAge < 90 ? MathUtils.clamp(1 - shotAge / 90, 0, 1) : 0

    if (flashOrbMaterialRef.current) {
      flashOrbMaterialRef.current.opacity = 0.9 * flashOpacity
    }

    if (flashConeMaterialRef.current) {
      flashConeMaterialRef.current.opacity = 0.7 * flashOpacity
    }

    if (flashLightRef.current) {
      flashLightRef.current.intensity = 6 * flashOpacity
    }
  })

  if (phase === 'intro') {
    return null
  }

  return (
    <group ref={rootRef}>
      <group ref={weaponRef} scale={weaponBaseScale}>
        <mesh position={[0.14, -0.02, -0.28]} castShadow>
          <boxGeometry args={[0.24, 0.18, 0.64]} />
          <meshStandardMaterial
            color="#08101c"
            emissive="#0ea5e9"
            emissiveIntensity={0.14}
            roughness={0.28}
            metalness={0.74}
          />
        </mesh>

        <mesh
          position={[0.19, -0.02, -0.68]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.035, 0.05, 0.72, 12]} />
          <meshStandardMaterial
            color="#111827"
            emissive="#22d3ee"
            emissiveIntensity={0.18}
            roughness={0.18}
            metalness={0.82}
          />
        </mesh>

        <mesh position={[0.12, -0.13, -0.14]} castShadow rotation={[0.18, 0, 0.04]}>
          <boxGeometry args={[0.11, 0.28, 0.14]} />
          <meshStandardMaterial
            color="#111827"
            emissive="#1d4ed8"
            emissiveIntensity={0.1}
            roughness={0.2}
            metalness={0.58}
          />
        </mesh>

        <mesh position={[0.13, 0.05, -0.21]} castShadow>
          <boxGeometry args={[0.18, 0.07, 0.18]} />
          <meshStandardMaterial
            color="#1f2937"
            emissive="#67e8f9"
            emissiveIntensity={0.32}
            roughness={0.14}
            metalness={0.42}
          />
        </mesh>

        <mesh position={[0.17, -0.04, -0.02]} castShadow>
          <boxGeometry args={[0.28, 0.05, 0.12]} />
          <meshStandardMaterial
            color="#020617"
            emissive="#7c3aed"
            emissiveIntensity={0.14}
            roughness={0.2}
            metalness={0.64}
          />
        </mesh>

        <mesh position={[0.04, -0.05, 0.08]} castShadow rotation={[0, 0, 0.12]}>
          <boxGeometry args={[0.13, 0.17, 0.28]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive="#22d3ee"
            emissiveIntensity={0.12}
            roughness={0.26}
            metalness={0.56}
          />
        </mesh>

        <mesh position={[0.16, -0.02, -0.56]}>
          <boxGeometry args={[0.16, 0.02, 0.52]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.36} />
        </mesh>

        <mesh position={[0.19, -0.02, -1.04]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial
            ref={flashOrbMaterialRef}
            color="#e0f2fe"
            transparent
            opacity={0}
          />
        </mesh>
        <mesh position={[0.19, -0.02, -0.92]}>
          <coneGeometry args={[0.08, 0.18, 12]} />
          <meshBasicMaterial
            ref={flashConeMaterialRef}
            color="#67e8f9"
            transparent
            opacity={0}
          />
        </mesh>
        <pointLight
          ref={flashLightRef}
          position={[0.19, -0.02, -0.92]}
          intensity={0}
          distance={2}
          color="#67e8f9"
        />
      </group>
    </group>
  )
}
