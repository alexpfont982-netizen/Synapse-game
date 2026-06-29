/**
 * rackComputeEngine.ts
 * Ubicación: src/features/dashboard/utils/rackComputeEngine.ts
 *
 * Motor de cálculo iterativo de TFLOPS por rack.
 *
 * Modela el rack como un sistema en cascada: los efectos condicionales
 * de cada pieza (boost/penalty) pueden modificar temperature/stability,
 * lo que a su vez puede activar o desactivar OTROS efectos. Se itera
 * hasta que el sistema converge (o se alcanza el límite de seguridad).
 *
 * Los efectos de stat_affected = 'efficiency' no retroalimentan el
 * sistema (no cambian temp/stability/power) — se acumulan aparte y
 * multiplican el ai_output base de las GPUs al final.
 */

// ── Tipos ─────────────────────────────────────────────────────────

export type ConditionStat = 'temperature' | 'power_load' | 'stability' | 'always'
export type ConditionOp = 'lt' | 'lte' | 'gt' | 'gte' | 'always'
export type StatAffected = 'stability' | 'temperature' | 'ai_output' | 'efficiency'

export interface RawConditionalEffect {
  id: number
  item_id: string
  effect_type: 'boost' | 'penalty'
  stat_affected: StatAffected
  numeric_value: number
  condition_stat: ConditionStat
  condition_op: ConditionOp
  condition_value: number | null
}

export interface RackPieceForCompute {
  item_id: string
  type: string             // 'GPU' | 'MEMORY' | 'POWER_UNIT' | ...
  base_ai_output: number   // 0 si no es GPU
  base_power: number       // consumo de la pieza en W
  base_heat: number        // aporte de calor (negativo si es cooling)
  base_stability: number   // stability individual de la pieza
}

// Combo entre dos piezas instaladas (component_interactions).
// A diferencia de RawConditionalEffect, no depende del estado del rack
// (temperatura/estabilidad/power) — se activa simplemente porque ambas
// piezas (item_a e item_b) están instaladas juntas en el mismo rack.
export interface ComboEffect {
  item_a: string
  item_b: string
  effect_type: 'boost' | 'penalty'
  effect_value: string   // ej: "+12% ai_output", se parsea el número
}

export interface RackRuntimeStats {
  temperature: number
  power_load: number
  stability: number
}

export interface RackComputeResult {
  finalStats: RackRuntimeStats
  iterations: number
  converged: boolean
  activeEffects: Array<RawConditionalEffect & { active: true }>
  individualEfficiencyPct: number  // suma de boosts/penalties INDIVIDUALES (por pieza, según estado del rack)
  combosEfficiencyPct: number      // suma de boosts/penalties de COMBOS (entre piezas instaladas juntas)
  totalEfficiencyPct: number       // individualEfficiencyPct + combosEfficiencyPct
  baseAiOutput: number             // suma de ai_output base de las GPUs, sin multiplicador
  effectiveAiOutput: number        // baseAiOutput * (1 + totalEfficiencyPct/100), TFLOPS finales del rack
}

const MAX_ITERATIONS = 10
const AMBIENT_TEMP = 25

// Extrae el número con signo de un string tipo "+12% ai_output" o "-8% stability"
function parseComboPercent(effectValue: string): number {
  const match = effectValue.match(/-?\d+/)
  return match ? Number(match[0]) : 0
}

/**
 * Suma el % neto de todos los combos activos. Los combos no dependen
 * del estado del rack — solo de qué piezas están instaladas juntas,
 * así que se evalúan una sola vez (no entran en el loop de iteración).
 */
function computeCombosEfficiency(combos: ComboEffect[]): number {
  let total = 0
  for (const combo of combos) {
    const pct = parseComboPercent(combo.effect_value)
    total += combo.effect_type === 'boost' ? pct : -Math.abs(pct)
  }
  return total
}

// ── Helpers ───────────────────────────────────────────────────────

function evaluateCondition(
  effect: RawConditionalEffect,
  stats: RackRuntimeStats,
): boolean {
  if (effect.condition_op === 'always') return true
  if (effect.condition_value === null) return false

  const current = stats[effect.condition_stat as keyof RackRuntimeStats] ?? 0
  const threshold = effect.condition_value

  switch (effect.condition_op) {
    case 'gt': return current > threshold
    case 'gte': return current >= threshold
    case 'lt': return current < threshold
    case 'lte': return current <= threshold
    default: return false
  }
}

/**
 * Calcula los stats BASE del rack (sin ningún boost/penalty condicional aplicado),
 * a partir únicamente de las piezas instaladas. Es el punto de partida (iteración 0).
 */
function computeBaseStats(pieces: RackPieceForCompute[]): RackRuntimeStats {
  let powerLoad = 0
  let maxHeat = 0
  let coolingOffset = 0
  let stabilitySum = 0
  let stabilityCount = 0

  for (const piece of pieces) {
    powerLoad += piece.base_power

    if (piece.type === 'COOLING') {
      coolingOffset += Math.abs(piece.base_heat)
    } else {
      if (piece.base_heat > maxHeat) maxHeat = piece.base_heat
    }

    if (piece.base_stability !== undefined) {
      stabilitySum += piece.base_stability
      stabilityCount += 1
    }
  }

  return {
    temperature: Math.max(AMBIENT_TEMP, AMBIENT_TEMP + maxHeat - coolingOffset),
    power_load: powerLoad,
    stability: stabilityCount > 0 ? Math.round(stabilitySum / stabilityCount) : 100,
  }
}

/**
 * Aplica los efectos activos de stat_affected = 'temperature' | 'stability'
 * sobre los stats base, devolviendo los stats ajustados para la siguiente
 * iteración. power_load no se modifica por efectos (solo por hardware instalado).
 */
function applyFeedbackEffects(
  baseStats: RackRuntimeStats,
  activeEffects: RawConditionalEffect[],
): RackRuntimeStats {
  let tempDelta = 0
  let stabilityDelta = 0

  for (const effect of activeEffects) {
    const sign = effect.effect_type === 'boost' ? 1 : -1

    if (effect.stat_affected === 'temperature') {
      // Un boost de temperatura normalmente reduce temperatura (mejor cooling);
      // un penalty la sube. numeric_value siempre es positivo en la tabla.
      tempDelta += effect.effect_type === 'boost' ? -effect.numeric_value : effect.numeric_value
    }
    if (effect.stat_affected === 'stability') {
      stabilityDelta += sign * effect.numeric_value
    }
  }

  return {
    temperature: Math.max(AMBIENT_TEMP, baseStats.temperature + tempDelta),
    power_load: baseStats.power_load,
    stability: Math.min(100, Math.max(0, baseStats.stability + stabilityDelta)),
  }
}

function statsEqual(a: RackRuntimeStats, b: RackRuntimeStats): boolean {
  return (
    Math.round(a.temperature) === Math.round(b.temperature) &&
    Math.round(a.stability) === Math.round(b.stability) &&
    Math.round(a.power_load) === Math.round(b.power_load)
  )
}

// ── Motor principal ────────────────────────────────────────────────

/**
 * Calcula los TFLOPS efectivos de un rack, resolviendo el sistema en
 * cascada de efectos condicionales hasta que converge, y sumando además
 * los combos activos entre piezas instaladas juntas.
 *
 * @param pieces Piezas instaladas en el rack (ya resueltas desde Supabase)
 * @param allEffects Efectos condicionales individuales de esas piezas (component_conditional_effects)
 * @param combos Combos activos entre piezas instaladas juntas (component_interactions)
 */
export function computeRackTFlops(
  pieces: RackPieceForCompute[],
  allEffects: RawConditionalEffect[],
  combos: ComboEffect[] = [],
): RackComputeResult {
  const baseStats = computeBaseStats(pieces)

  let currentStats = baseStats
  let activeEffects: RawConditionalEffect[] = []
  let iterations = 0
  let converged = false

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations = i + 1

    // Evalúa qué efectos están activos con los stats actuales
    const newActiveEffects = allEffects.filter((e) => evaluateCondition(e, currentStats))

    // Aplica feedback de temperature/stability sobre los stats BASE
    // (siempre partiendo de base, no acumulando sobre el ajuste anterior,
    // para evitar que penalties/boosts se acumulen indefinidamente)
    const adjustedStats = applyFeedbackEffects(baseStats, newActiveEffects)

    const isSameEffectSet =
      newActiveEffects.length === activeEffects.length &&
      newActiveEffects.every((e) => activeEffects.some((prev) => prev.id === e.id))

    activeEffects = newActiveEffects

    if (isSameEffectSet && statsEqual(adjustedStats, currentStats)) {
      currentStats = adjustedStats
      converged = true
      break
    }

    currentStats = adjustedStats
  }

  // Suma neta de efficiency individual (no retroalimenta, solo multiplica TFLOPS al final)
  let individualEfficiencyPct = 0
  for (const effect of activeEffects) {
    if (effect.stat_affected === 'efficiency' || effect.stat_affected === 'ai_output') {
      individualEfficiencyPct += effect.effect_type === 'boost' ? effect.numeric_value : -effect.numeric_value
    }
  }

  // Suma neta de combos (independiente del estado del rack)
  const combosEfficiencyPct = computeCombosEfficiency(combos)

  // El pozo total que afecta a TODAS las GPUs del rack por igual:
  // boosts/penalties individuales + combos, todos juntos.
  const totalEfficiencyPct = individualEfficiencyPct + combosEfficiencyPct

  const baseAiOutput = pieces
    .filter((p) => p.type === 'GPU')
    .reduce((sum, p) => sum + p.base_ai_output, 0)

  const effectiveAiOutput = baseAiOutput * (1 + totalEfficiencyPct / 100)

  return {
    finalStats: currentStats,
    iterations,
    converged,
    activeEffects: activeEffects as Array<RawConditionalEffect & { active: true }>,
    individualEfficiencyPct,
    combosEfficiencyPct,
    totalEfficiencyPct,
    baseAiOutput,
    effectiveAiOutput: Math.max(0, effectiveAiOutput),
  }
}

// ── Cálculo del pool total (los 4 racks juntos) ─────────────────────

export interface PoolComputeResult {
  totalTFlops: number          // suma de TFLOPS efectivos de los 4 racks
  avgStability: number         // estabilidad promedio entre racks (solo racks con piezas)
  poolTFlops: number           // totalTFlops * (avgStability / 100)
  perRack: RackComputeResult[]
}

export function computePoolTFlops(rackResults: RackComputeResult[]): PoolComputeResult {
  const activeRacks = rackResults.filter((r) => r.baseAiOutput > 0)

  const totalTFlops = rackResults.reduce((sum, r) => sum + r.effectiveAiOutput, 0)

  const avgStability =
    activeRacks.length > 0
      ? activeRacks.reduce((sum, r) => sum + r.finalStats.stability, 0) / activeRacks.length
      : 100

  const poolTFlops = totalTFlops * (avgStability / 100)

  return {
    totalTFlops,
    avgStability,
    poolTFlops,
    perRack: rackResults,
  }
}