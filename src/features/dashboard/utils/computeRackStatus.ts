// computeRackStatus.ts
// Builds the full RackStatusStats object for a rack from its installed pieces.
// Categorizes by slot_id (e.g. "rack1-gpu3"), so it works with BOTH
// MockHardwarePiece (Dashboard) and InstalledHardware (Lab) — both have slot_id.

import type { RackStatusStats, SlotFill } from "../components/RackStatusPanel";

// Minimal shape we depend on. Anything with a slot_id is accepted.
interface SlottedPiece {
  slot_id: string | null;
}

const SLOT_TOTALS = { PSU: 2, CABLES: 2, COOLING: 2, STORAGE: 2, RAM: 6, GPU: 6 } as const;
const RACK_CAPACITY = Object.values(SLOT_TOTALS).reduce((a, b) => a + b, 0); // 20

function categoryFromSlotId(slotId: string): keyof typeof SLOT_TOTALS | null {
  if (slotId.includes("-power")) return "PSU";
  if (slotId.includes("-cable")) return "CABLES";
  if (slotId.includes("-cooling")) return "COOLING";
  if (slotId.includes("-storage")) return "STORAGE";
  if (slotId.includes("-mem")) return "RAM";
  if (slotId.includes("-gpu")) return "GPU";
  return null;
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
    total: SLOT_TOTALS[category],
  }));
}

export function computeRackStatus(hardware: readonly SlottedPiece[]): RackStatusStats {
  const slotFill = computeSlotFill(hardware);
  const installedCount = slotFill.reduce((sum, s) => sum + s.filled, 0);

  // ----------------------------------------------------------------------
  // TODO: reemplaza estas 4 líneas con tu fórmula real del Lab
  // (LaboratoryEditor.tsx -> const rackStatus = useMemo(...)).
  // Por ahora son temporales para que el panel se vea.
  const powerLoad = installedCount * 50;                 // placeholder (W)
  const temperature = 30 + installedCount * 5;           // placeholder (°C)
  const stability = Math.max(0, 100 - installedCount);   // placeholder (%)
  const aiOutput = installedCount * 9;                   // placeholder (TF)
  // ----------------------------------------------------------------------

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