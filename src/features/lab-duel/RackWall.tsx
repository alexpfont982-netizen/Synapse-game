import { Text } from '@react-three/drei'
import { useMemo } from 'react'
import type { ArenaBox, ArenaTone } from './labDuelTypes'

interface RackWallProps {
  wall: ArenaBox
  label: string
}

function getRackPalette(tone: ArenaTone | undefined) {
  switch (tone) {
    case 'amber':
      return {
        shell: '#1a120a',
        edge: '#6b3f15',
        accent: '#f59e0b',
        screen: '#fef3c7',
        trim: '#fdba74',
      }
    case 'violet':
      return {
        shell: '#17112b',
        edge: '#43257a',
        accent: '#8b5cf6',
        screen: '#ede9fe',
        trim: '#c4b5fd',
      }
    case 'cyan':
      return {
        shell: '#0b1727',
        edge: '#1b4d63',
        accent: '#22d3ee',
        screen: '#ecfeff',
        trim: '#67e8f9',
      }
    default:
      return {
        shell: '#151c2e',
        edge: '#334155',
        accent: '#cbd5e1',
        screen: '#e2e8f0',
        trim: '#94a3b8',
      }
  }
}

export default function RackWall({ wall, label }: RackWallProps) {
  const [sizeX, sizeY, sizeZ] = wall.size
  const alongX = sizeX >= sizeZ
  const isColumn = Math.abs(sizeX - sizeZ) < 0.25
  const rackLength = alongX ? sizeX : sizeZ
  const rackDepth = alongX ? sizeZ : sizeX
  const rackHeight = sizeY
  const palette = getRackPalette(wall.tone)

  const segmentCount = Math.max(2, Math.round(rackLength / (isColumn ? 1.35 : 2.15)))
  const segmentWidth = (rackLength - 0.42) / segmentCount
  const segmentOffsets = useMemo(
    () =>
      Array.from({ length: segmentCount }, (_, index) => {
        const start = -rackLength / 2 + segmentWidth / 2 + 0.18
        return start + index * segmentWidth
      }),
    [rackLength, segmentCount, segmentWidth],
  )

  const panelRows = [-rackHeight * 0.28, 0, rackHeight * 0.28]
  const faceRotations = isColumn
    ? [0, Math.PI / 2, Math.PI, Math.PI * 1.5]
    : [0]

  return (
    <group
      position={wall.position}
      rotation={[0, alongX ? 0 : Math.PI / 2, 0]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[rackLength, rackHeight, rackDepth]} />
        <meshStandardMaterial
          color={palette.shell}
          emissive={palette.edge}
          emissiveIntensity={0.18}
          roughness={0.64}
          metalness={0.62}
        />
      </mesh>

      <mesh scale={[1.02, 1.02, 1.05]}>
        <boxGeometry args={[rackLength, rackHeight, rackDepth]} />
        <meshBasicMaterial color={palette.trim} transparent opacity={0.045} />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[rackLength - 0.22, rackHeight - 0.16, rackDepth - 0.22]} />
        <meshStandardMaterial
          color="#020617"
          emissive={palette.edge}
          emissiveIntensity={0.04}
          roughness={0.84}
          metalness={0.32}
        />
      </mesh>

      <mesh position={[0, rackHeight / 2 - 0.16, 0]}>
        <boxGeometry args={[rackLength - 0.1, 0.14, rackDepth - 0.14]} />
        <meshStandardMaterial
          color={palette.edge}
          emissive={palette.accent}
          emissiveIntensity={0.22}
          roughness={0.4}
          metalness={0.75}
        />
      </mesh>

      <mesh position={[0, -rackHeight / 2 + 0.18, 0]}>
        <boxGeometry args={[rackLength - 0.16, 0.08, rackDepth - 0.1]} />
        <meshBasicMaterial color={palette.trim} transparent opacity={0.22} />
      </mesh>

      {faceRotations.map((faceRotation, faceIndex) => (
        <group
          key={`${wall.id}-face-${faceRotation}`}
          rotation={[0, faceRotation, 0]}
          position={[0, 0, rackDepth / 2 + 0.04]}
        >
          <mesh position={[-rackLength / 2 + 0.16, 0, 0.06]}>
            <boxGeometry args={[0.06, rackHeight - 0.44, 0.04]} />
            <meshBasicMaterial color={palette.trim} transparent opacity={0.42} />
          </mesh>

          <mesh position={[rackLength / 2 - 0.16, 0, 0.06]}>
            <boxGeometry args={[0.06, rackHeight - 0.44, 0.04]} />
            <meshBasicMaterial color={palette.trim} transparent opacity={0.42} />
          </mesh>

          {segmentOffsets.map((offset, segmentIndex) => (
            <group key={`${wall.id}-segment-${segmentIndex}`} position={[offset, 0, 0]}>
              {panelRows.map((rowOffset, rowIndex) => (
                <group
                  key={`${wall.id}-segment-${segmentIndex}-row-${rowIndex}`}
                  position={[0, rowOffset, 0]}
                >
                  <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[segmentWidth * 0.82, 0.82, 0.18]} />
                    <meshStandardMaterial
                      color="#020617"
                      emissive={palette.edge}
                      emissiveIntensity={0.14}
                      roughness={0.58}
                      metalness={0.72}
                    />
                  </mesh>

                  <mesh position={[0, 0, 0.11]}>
                    <boxGeometry args={[segmentWidth * 0.74, 0.18, 0.04]} />
                    <meshBasicMaterial color={palette.accent} transparent opacity={0.88} />
                  </mesh>

                  <mesh
                    position={[
                      segmentWidth * 0.17,
                      0.18,
                      0.11,
                    ]}
                  >
                    <boxGeometry args={[segmentWidth * 0.22, 0.18, 0.04]} />
                    <meshBasicMaterial color={palette.screen} transparent opacity={0.98} />
                  </mesh>
                </group>
              ))}

              {segmentIndex % 2 === faceIndex % 2 && (
                <group position={[0, -rackHeight * 0.36, 0.12]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.18, 0.05, 10, 22]} />
                    <meshStandardMaterial
                      color="#111827"
                      emissive={palette.accent}
                      emissiveIntensity={0.2}
                      roughness={0.42}
                      metalness={0.58}
                    />
                  </mesh>
                  {Array.from({ length: 4 }).map((_, bladeIndex) => (
                    <mesh
                      key={`${wall.id}-fan-${segmentIndex}-${bladeIndex}`}
                      rotation={[0, 0, (Math.PI / 2) * bladeIndex]}
                    >
                      <boxGeometry args={[0.04, 0.24, 0.03]} />
                      <meshBasicMaterial color={palette.screen} transparent opacity={0.62} />
                    </mesh>
                  ))}
                </group>
              )}
            </group>
          ))}

          <Text
            position={[-rackLength / 2 + 0.8, rackHeight / 2 - 0.62, 0.15]}
            fontSize={0.22}
            maxWidth={1.8}
            anchorX="left"
            anchorY="middle"
            color={palette.screen}
          >
            {label}
          </Text>

          <Text
            position={[-rackLength / 2 + 0.8, rackHeight / 2 - 0.92, 0.15]}
            fontSize={0.11}
            maxWidth={2}
            anchorX="left"
            anchorY="middle"
            color={palette.accent}
          >
            SYNAPSE GRID
          </Text>
        </group>
      ))}
    </group>
  )
}
