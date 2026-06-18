// computeRackStatus.ts
// Builds the full RackStatusStats object for a rack from its installed pieces.

import type { RackStatusStats, SlotFill } from "../components/RackStatusPanel";

interface SlottedPiece {
  slot_id:    string | null;
  type?:      string;
  condition?: string;
  stats?: {
    tflops?:    number;
    power?:     number;
    heat?:      number;
    stability?: number;
    ai_output?: number;
    temperature_c?: number;
    temperature_reduction?: string;
  };
}

const SLOT_TOTALS = { PSU: 2, CABLES: 2, COOLING: 2, STORAGE: 2, RAM: 6, GPU: 6 } as const;
const RACK_CAPACITY = Object.values(SLOT_TOTALS).reduce((a, b) => a + b, 0); // 20

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

export function computeRackStatus(hardware: readonly SlottedPiece[]): RackStatusStats {
  const slotFill       = computeSlotFill(hardware);
  const installedCount = slotFill.reduce((sum, s) => sum + s.filled, 0);

  // ── Power Load ────────────────────────────────────────────────
  // Suma el consumo real de cada pieza (stats.power)
  let powerLoad = 0;
  for (const piece of hardware) {
    if (piece.stats?.power) {
      powerLoad += piece.stats.power;
    }
  }

  // ── Temperature ───────────────────────────────────────────────
  // Temperatura ambiente base (25°C) + temperatura de la pieza más caliente
  // menos la reducción total del cooling instalado
  const AMBIENT_TEMP = 25;
  let maxPieceTemp  = 0;
  let coolingOffset = 0;

  for (const piece of hardware) {
    if (piece.type === 'COOLING') {
      // Suma la reducción de cada cooler
      if (piece.stats?.temperature_reduction) {
        coolingOffset += Math.abs(parseSignedNumber(piece.stats.temperature_reduction));
      } else {
        coolingOffset += Math.abs(piece.stats?.heat ?? 0);
      }
    } else {
      // Busca la pieza más caliente (usa temperature_c si existe, sino heat)
      const s = piece.stats as Record<string, number> | undefined;
      const temp = s?.['temperature_c'] ?? (piece.stats?.heat ?? 0);
      if (temp > maxPieceTemp) maxPieceTemp = temp;
    }
  }

  const temperature = Math.max(
    AMBIENT_TEMP,
    AMBIENT_TEMP + maxPieceTemp - coolingOffset
  );

  // ── Stability ─────────────────────────────────────────────────
  // Promedio de stability de todas las piezas instaladas
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
  const stability = stabilityCount > 0
    ? Math.round(stabilitySum / stabilityCount)
    : 100;

  // ── AI Output ─────────────────────────────────────────────────
  // Suma el ai_output de todos los GPUs instalados
  let aiOutput = 0;
  for (const piece of hardware) {
    if (piece.type === 'GPU') {
      const s   = piece.stats as Record<string, number> | undefined;
      const ai  = s?.['ai_output'] ?? (piece.stats?.tflops ? piece.stats.tflops * 10 : 0);
      aiOutput += ai;
    }
  }

  return {
    powerLoad,
    temperature,
    stability,
    aiOutput,
    installedCount,
    capacity: RACK_CAPACITY,
    slotFill,
  };
}