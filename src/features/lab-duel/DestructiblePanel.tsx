import { Line, Text } from '@react-three/drei'
import { useMemo } from 'react'
import type { PanelState } from './labDuelTypes'

interface DestructiblePanelProps {
  panel: PanelState
}

export default function DestructiblePanel({ panel }: DestructiblePanelProps) {
  const integrity = panel.health / panel.maxHealth

  const palette = useMemo(() => {
    if (integrity > 0.66) {
      return {
        core: '#67e8f9',
        glow: '#0f172a',
        emissive: '#0ea5e9',
        spark: '#a5f3fc',
      }
    }

    if (integrity > 0.33) {
      return {
        core: '#fbbf24',
        glow: '#1e293b',
        emissive: '#f59e0b',
        spark: '#fde68a',
      }
    }

    return {
      core: '#fb7185',
      glow: '#1e1b4b',
      emissive: '#ef4444',
      spark: '#fecdd3',
    }
  }, [integrity])

  const crackLines = useMemo(() => {
    if (integrity > 0.66) {
      return []
    }

    return [
      [
        [-1.05, 0.72, 0.03],
        [-0.26, 0.1, 0.03],
        [-0.68, -0.62, 0.03],
      ],
      [
        [0.94, 0.6, 0.03],
        [0.18, 0.06, 0.03],
        [0.54, -0.74, 0.03],
      ],
      [
        [-0.1, 0.48, 0.03],
        [0.22, -0.18, 0.03],
        [-0.04, -0.82, 0.03],
      ],
    ]
  }, [integrity])

  const sparkOffsets = useMemo(
    () => [
      [-0.72, 0.96, 0.08],
      [-0.3, 0.32, 0.08],
      [0.28, -0.12, 0.08],
      [0.72, 0.84, 0.08],
    ],
    [],
  )

  if (panel.destroyed) {
    return null
  }

  const screenWidth = panel.size[2] - 0.44
  const screenHeight = panel.size[1] - 0.44

  return (
    <group
      position={panel.position}
      rotation={[0, 0, (1 - integrity) * 0.06]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={panel.size} />
        <meshStandardMaterial
          color="#030712"
          emissive="#020617"
          emissiveIntensity={0.12}
          roughness={0.78}
          metalness={0.38}
        />
      </mesh>

      <mesh scale={[1.06, 1.02, 1.04]}>
        <boxGeometry args={panel.size} />
        <meshBasicMaterial color={palette.glow} transparent opacity={0.16} />
      </mesh>

      <group position={[panel.size[0] / 2 + 0.03, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[screenWidth, screenHeight, 0.08]} />
          <meshStandardMaterial
            color={palette.core}
            emissive={palette.emissive}
            emissiveIntensity={0.26 + (1 - integrity) * 0.2}
            roughness={0.18}
            metalness={0.22}
            transparent
            opacity={0.72 - (1 - integrity) * 0.18}
          />
        </mesh>

        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[screenWidth - 0.16, 0.16, 0.02]} />
          <meshBasicMaterial color={palette.spark} transparent opacity={0.72} />
        </mesh>

        <mesh position={[0, -0.42, 0.05]}>
          <boxGeometry args={[screenWidth - 0.28, 0.12, 0.02]} />
          <meshBasicMaterial color={palette.emissive} transparent opacity={0.64} />
        </mesh>

        <mesh position={[0, 0.48, 0.05]}>
          <boxGeometry args={[screenWidth - 0.28, 0.12, 0.02]} />
          <meshBasicMaterial color={palette.emissive} transparent opacity={0.64} />
        </mesh>

        <Text
          position={[-screenWidth / 2 + 0.24, screenHeight / 2 - 0.24, 0.06]}
          fontSize={0.14}
          anchorX="left"
          anchorY="middle"
          color="#e2e8f0"
        >
          STATUS
        </Text>

        <Text
          position={[-screenWidth / 2 + 0.24, screenHeight / 2 - 0.44, 0.06]}
          fontSize={0.09}
          anchorX="left"
          anchorY="middle"
          color={palette.spark}
        >
          SERVER PANEL
        </Text>

        {integrity < 1 &&
          sparkOffsets.map((offset, index) => (
            <mesh
              key={`${panel.id}-spark-${index}`}
              position={offset as [number, number, number]}
            >
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshBasicMaterial color={palette.spark} transparent opacity={0.8} />
            </mesh>
          ))}

        {crackLines.map((points, index) => (
          <Line
            key={`${panel.id}-crack-${index}`}
            points={points as [number, number, number][]}
            color="#0f172a"
            lineWidth={1.4}
          />
        ))}
      </group>
    </group>
  )
}
