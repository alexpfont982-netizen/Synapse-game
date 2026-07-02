// computeRackStatus.ts
// Calcula el RackStatusStats completo para un rack dado sus piezas instaladas.
//
// SP Base  = GPU×60% + RAM×20% + Storage×10% + PSU bonus + Cooling bonus
// SP Efectivo = SP Base ajustado por buffs/penalties activos (ai_output effects)
//
// El SP Efectivo es el que se usa para las pools de recompensas.

import type { RackStatusStats, SlotFill } from "../components/RackStatusPanel";

interface SlottedPiece {
  slot_id:    string | null;
  type?:      string;
  condition?: string;
  stats?: {
    tflops?:                number;
    power?:                 number;
    heat?:                  number;
    stability?:             number;
    ai_output?:             number;
    temperature_c?:         number;
    temperature_reduction?: string;
    processing_speed?:      number;
    read_speed?:            number;
    performance?:           number;
    power_w?:               number;
  };
}

const SLOT_TOTALS = { PSU: 2, CABLES: 2, COOLING: 2, STORAGE: 2, RAM: 6, GPU: 6 } as const;
const RACK_CAPACITY = Object.values(SLOT_TOTALS).reduce((a, b) => a + b, 0); // 20

const SP_WEIGHTS = { GPU: 0.60, RAM: 0.20, STORAGE: 0.10 }

function categoryFromSlotId(slotId: string): keyof typeof SLOT_TOTALS | null {
  if (slotId.includes("-power"))   return "PSU";
  if (slotId.includes("-cable"))   return "CABLES";
  if (slotId.includes("-cooling")) return "COOLING";
  if (slotId.includes("-storage")) return "STORAGE";
  if (slotId.includes("-mem"))     return "RAM";
  if (slotId.includes("-gpu"))     return "GPU";
  return null;
}

function parseSignedNumber(value: string): number {
  const match = value.match(/-?\d+/);
  return match ? Number(match[0]) : 0;
}

function computeSlotFill(hardware: readonly SlottedPiece[]): SlotFill[] {
  const counts: Record<string, number> = {};
  for (const hw of hardware) {
    const cat = hw.slot_id ? categoryFromSlotId(hw.slot_id) : null;
    if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return (Object.keys(SLOT_TOTALS) as (keyof typeof SLOT_TOTALS)[]).map((category) => ({
    category,
    filled: Math.min(counts[category] ?? 0, SLOT_TOTALS[category]),
    total:  SLOT_TOTALS[category],
  }));
}

export function computeRackStatus(
  hardware: readonly SlottedPiece[],
  // Buffs/penalties activos calculados por useConditionalEffects
  activeBoosts:    { stat_affected: string; numeric_value: number }[] = [],
  activePenalties: { stat_affected: string; numeric_value: number }[] = [],
): RackStatusStats {
  const slotFill       = computeSlotFill(hardware);
  const installedCount = slotFill.reduce((sum, s) => sum + s.filled, 0);

  // ── Power Load ────────────────────────────────────────────────
  let powerLoad = 0;
  for (const piece of hardware) {
    if (piece.stats?.power) powerLoad += piece.stats.power;
  }

  // ── Temperature ───────────────────────────────────────────────
  const AMBIENT_TEMP = 25;
  let maxPieceTemp  = 0;
  let coolingOffset = 0;

  for (const piece of hardware) {
    if (piece.type === 'COOLING') {
      if (piece.stats?.temperature_reduction) {
        coolingOffset += Math.abs(parseSignedNumber(piece.stats.temperature_reduction));
      } else {
        coolingOffset += Math.abs(piece.stats?.heat ?? 0);
      }
    } else {
      const s = piece.stats as Record<string, number> | undefined;
      const temp = s?.['temperature_c'] ?? (piece.stats?.heat ?? 0);
      if (temp > maxPieceTemp) maxPieceTemp = temp;
    }
  }

  const temperature = Math.max(AMBIENT_TEMP, AMBIENT_TEMP + maxPieceTemp - coolingOffset);

  // ── Stability ─────────────────────────────────────────────────
  let stabilitySum   = 0;
  let stabilityCount = 0;

  for (const piece of hardware) {
    const s = piece.stats as Record<string, number> | undefined;
    const stability = s?.['stability'];
    if (stability !== undefined) {
      stabilitySum  += stability;
      stabilityCount += 1;
    } else if (piece.condition) {
      const base = piece.condition === 'New'     ? 100
                 : piece.condition === 'Rebuilt' ? 88
                 : 74;
      stabilitySum  += base;
      stabilityCount += 1;
    }
  }
  const stability = stabilityCount > 0 ? Math.round(stabilitySum / stabilityCount) : 100;

  // ── SP Base ───────────────────────────────────────────────────
  let gpuBase     = 0;
  let ramBase     = 0;
  let storageBase = 0;
  let psuPerfSum  = 0;
  let psuCount    = 0;
  let coolingEff  = 0;

  for (const piece of hardware) {
    const s = piece.stats as Record<string, number> | undefined;
    if (!s) continue;
    const slotCat = piece.slot_id ? categoryFromSlotId(piece.slot_id) : null;

    if (slotCat === 'GPU')     gpuBase     += s['ai_output']         ?? 0;
    if (slotCat === 'RAM')     ramBase     += s['processing_speed']  ?? 0;
    if (slotCat === 'STORAGE') storageBase += s['read_speed']        ?? 0;
    if (slotCat === 'PSU') {
      psuPerfSum += s['performance'] ?? 80;
      psuCount++;
    }
    if (slotCat === 'COOLING') {
      if (piece.stats?.temperature_reduction) {
        coolingEff += Math.abs(parseSignedNumber(piece.stats.temperature_reduction));
      } else {
        coolingEff += Math.abs(s['heat'] ?? 0);
      }
    }
  }

  const psuAvgPerf   = psuCount > 0 ? psuPerfSum / psuCount : 80;
  const psuBonus     = (psuAvgPerf - 80) / 100;
  const coolingBonus = (coolingEff / 10) * 0.02;

  const gpuContrib     = gpuBase * SP_WEIGHTS.GPU;
  const ramContrib     = (ramBase / 4) * SP_WEIGHTS.RAM;
  const storageContrib = storageBase * SP_WEIGHTS.STORAGE;
  const spBase         = gpuContrib + ramContrib + storageContrib;
  const synapsepower   = Math.round((spBase * (1 + psuBonus + coolingBonus)) * 10) / 10;

  // ── SP Efectivo — aplica buffs/penalties de ai_output ────────
  // Suma todos los % de boost y penalty sobre ai_output
  let totalBoostPct   = 0;
  let totalPenaltyPct = 0;

  for (const b of activeBoosts) {
    if (b.stat_affected === 'ai_output' || b.stat_affected === 'efficiency') {
      totalBoostPct += b.numeric_value;
    }
  }
  for (const p of activePenalties) {
    if (p.stat_affected === 'ai_output' || p.stat_affected === 'efficiency') {
      totalPenaltyPct += p.numeric_value;
    }
  }

  const netPct             = (totalBoostPct - totalPenaltyPct) / 100;
  const synapsepowerEffective = Math.round((synapsepower * (1 + netPct)) * 10) / 10;

  // aiOutput se mantiene para compatibilidad interna
  const aiOutput = gpuBase;

  return {
    powerLoad,
    temperature,
    stability,
    aiOutput,
    synapsepower,            // SP Base — lo que el jugador ve en el gauge
    synapsepowerEffective,   // SP Efectivo — el que cuenta para pools
    installedCount,
    capacity: RACK_CAPACITY,
    slotFill,
  };
}