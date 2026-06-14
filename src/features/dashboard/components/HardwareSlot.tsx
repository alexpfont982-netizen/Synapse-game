import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  StoreItemCondition,
  StoreProductCategory,
} from '../../../types/store';

type ComponentType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
  | 'COOLING'
  | 'ROOM_FAN'
  | 'ROOM_EXTRACTOR';

interface HardwareSlotItem {
  id: string;
  type: ComponentType;
  brand?: string;
  model?: string;
  category?: StoreProductCategory;
  condition?: StoreItemCondition;
  image?: string;
  image_path?: string;
}

interface HardwareSlotProps {
  id: string;
  accepts: ComponentType;
  activeDragType: ComponentType | null;
  slotItem?: HardwareSlotItem | null;
  children?: ReactNode;
  className?: string;
}

function getConditionTone(condition?: StoreItemCondition) {
  switch (condition) {
    case 'New':
      return 'border-emerald-400/35 bg-emerald-500/12 text-emerald-200';
    case 'Used':
      return 'border-amber-400/35 bg-amber-500/12 text-amber-200';
    case 'Rebuilt':
      return 'border-violet-400/35 bg-violet-500/12 text-violet-100 shadow-[0_0_10px_rgba(56,189,248,0.08)]';
    default:
      return 'border-slate-600/60 bg-slate-800/80 text-slate-200';
  }
}

function InstalledSlotPreview({ item }: { item: HardwareSlotItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      data: { type: item.type },
    });
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = item.image || item.image_path || '';

  useEffect(() => {
    setImageFailed(false);
  }, [imageSrc]);

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      zIndex: isDragging ? 9999 : undefined,
      position: isDragging ? ('relative' as const) : undefined,
    }
    : undefined;
  const conditionLabel = (item.condition ?? 'Stored').toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex h-full w-full overflow-hidden items-center gap-2 rounded-md border border-white/6 bg-slate-900/80 px-2 py-1 ${
        isDragging ? 'opacity-0' : 'cursor-grab'
      }`}
    >
      <div className="flex h-full aspect-square shrink-0 items-center justify-center rounded-md border border-white/8 bg-slate-900/90 p-1">
        {!imageFailed && imageSrc ? (
          <img
            src={imageSrc}
            alt={`${item.brand ?? 'Installed'} ${item.model ?? item.type}`}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[7px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Unit
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold text-white">
          {item.brand ?? 'Installed Unit'}
        </div>
        <div className="truncate text-[11px] text-slate-300">
          {item.model ?? item.type}
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full border px-1.5 py-[2px] text-[7px] font-bold uppercase tracking-[0.14em] ${getConditionTone(
          item.condition
        )}`}
      >
        {conditionLabel}
      </span>
    </div>
  );
}

export function HardwareSlot({
  id,
  accepts,
  activeDragType,
  slotItem,
  children,
  className = '',
}: HardwareSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { accepts }, // <--- ¡ESTA ES LA LÍNEA QUE FALTABA!
  });


  const isCompatible = activeDragType === accepts;

  let slotClasses = 'border border-slate-600/50 bg-slate-950/70 shadow-inner';

  if (isCompatible) {
    slotClasses = 'border-cyan-500/50 bg-cyan-900/20 animate-pulse';
  }

  if (isCompatible && isOver) {
    slotClasses =
      'z-10 scale-105 border-cyan-400 bg-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.5)]';
  }

  const safeClassName = className || '';
  const hasHeight = safeClassName.includes('h-');
  const hasWidth = safeClassName.includes('w-');

  return (
    <div
      ref={setNodeRef}
      className={`flex rounded-md transition-all ${
        slotItem ? 'items-stretch' : 'items-center justify-center'
      } ${!hasHeight ? 'h-[58px]' : ''} ${
        !hasWidth ? 'w-full' : ''
      } ${slotClasses} ${safeClassName}`}
    >
      {slotItem ? (
        <InstalledSlotPreview item={slotItem} />
      ) : (
        children || (
          <span className="truncate text-center text-[7px] font-bold uppercase tracking-[0.16em] text-slate-600">
            {accepts} SLOT
          </span>
        )
      )}
    </div>
  );
}