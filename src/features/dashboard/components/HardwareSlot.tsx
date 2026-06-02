import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

type ComponentType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
  | 'ROOM_FAN'
  | 'ROOM_EXTRACTOR';

interface HardwareSlotProps {
  id: string;
  accepts: ComponentType;
  activeDragType: ComponentType | null;
  children?: ReactNode;
}

export function HardwareSlot({ id, accepts, activeDragType, children }: HardwareSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { accepts }
  });

  const isCompatible = activeDragType === accepts;
  
  // Estilos base de Tailwind (acordes a tu diseño en slate y cyan)
  let slotClasses = "border border-slate-600/50 bg-slate-950/70 shadow-inner";

  // Efecto de iluminación si la pieza "en el aire" es compatible
  if (isCompatible) {
    slotClasses = "border-cyan-500/50 bg-cyan-900/20 animate-pulse";
  }

  // Efecto de aterrizaje si estás exactamente encima de esta ranura
  if (isCompatible && isOver) {
    slotClasses = "border-cyan-400 bg-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.5)] scale-105 z-10";
  }

  return (
    <div
      ref={setNodeRef}
      // Combinamos las clases de medida exacta con las de color que calculaste arriba
      className={`w-full min-h-[38px] rounded-md flex items-center justify-center transition-all overflow-hidden ${slotClasses}`}
    >
      {/* Texto de fondo mucho más discreto */}
      {children || <span className="text-[8px] font-bold text-slate-600 tracking-widest">{accepts} SLOT</span>}
    </div>
  );
}