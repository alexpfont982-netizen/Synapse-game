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
    case 'New':     return 'border-emerald-400/35 bg-emerald-500/12 text-emerald-200';
    case 'Used':    return 'border-amber-400/35 bg-amber-500/12 text-amber-200';
    case 'Rebuilt': return 'border-violet-400/35 bg-violet-500/12 text-violet-100';
    default:        return 'border-slate-600/60 bg-slate-800/80 text-slate-200';
  }
}

function getTypeGlow(type: ComponentType) {
  switch (type) {
    case 'GPU':        return 'border-cyan-400/50 shadow-[0_0_14px_rgba(34,211,238,0.3)]';
    case 'MEMORY':     return 'border-purple-400/50 shadow-[0_0_14px_rgba(192,132,252,0.3)]';
    case 'STORAGE':    return 'border-emerald-400/50 shadow-[0_0_14px_rgba(52,211,153,0.3)]';
    case 'POWER_UNIT': return 'border-yellow-400/50 shadow-[0_0_14px_rgba(250,204,21,0.3)]';
    case 'CABLE_KIT':  return 'border-slate-400/40 shadow-[0_0_8px_rgba(148,163,184,0.2)]';
    case 'COOLING':    return 'border-sky-300/50 shadow-[0_0_14px_rgba(125,211,252,0.3)]';
    default:           return 'border-slate-600/40 shadow-none';
  }
}

function getLedColor(type: ComponentType) {
  switch (type) {
    case 'GPU':        return 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,1)]';
    case 'MEMORY':     return 'bg-purple-400 shadow-[0_0_5px_rgba(192,132,252,1)]';
    case 'STORAGE':    return 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,1)]';
    case 'POWER_UNIT': return 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,1)]';
    case 'CABLE_KIT':  return 'bg-slate-300 shadow-[0_0_4px_rgba(148,163,184,0.8)]';
    case 'COOLING':    return 'bg-sky-300 shadow-[0_0_5px_rgba(125,211,252,1)]';
    default:           return 'bg-slate-400';
  }
}

function getTypeBg(type: ComponentType) {
  switch (type) {
    case 'GPU':        return 'from-cyan-950/60 to-slate-900/80';
    case 'MEMORY':     return 'from-purple-950/60 to-slate-900/80';
    case 'STORAGE':    return 'from-emerald-950/60 to-slate-900/80';
    case 'POWER_UNIT': return 'from-yellow-950/60 to-slate-900/80';
    case 'CABLE_KIT':  return 'from-slate-800/60 to-slate-900/80';
    case 'COOLING':    return 'from-sky-950/60 to-slate-900/80';
    default:           return 'from-slate-900/60 to-slate-900/80';
  }
}

function getTypeColor(type: ComponentType) {
  switch (type) {
    case 'GPU':        return 'text-cyan-400';
    case 'MEMORY':     return 'text-purple-400';
    case 'STORAGE':    return 'text-emerald-400';
    case 'POWER_UNIT': return 'text-yellow-400';
    case 'CABLE_KIT':  return 'text-slate-300';
    case 'COOLING':    return 'text-sky-300';
    default:           return 'text-slate-300';
  }
}

function InstalledSlotPreview({ item }: { item: HardwareSlotItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id, data: { type: item.type } });

  const [imageFailed, setImageFailed] = useState(false);
  const [ledOn, setLedOn] = useState(true);
  const imageSrc = item.image || item.image_path || '';

  useEffect(() => { setImageFailed(false); }, [imageSrc]);

  // LED parpadeante aleatorio
  useEffect(() => {
    const interval = setInterval(() => {
      setLedOn((prev) => !prev);
    }, 700 + Math.random() * 600);
    return () => clearInterval(interval);
  }, []);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 9999 : undefined,
        position: isDragging ? ('relative' as const) : undefined,
      }
    : undefined;

  const hasImage = !imageFailed && !!imageSrc;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative flex h-full w-full overflow-hidden rounded-md border transition-all ${
        isDragging ? 'opacity-0' : `cursor-grab hover:brightness-110 ${getTypeGlow(item.type)}`
      } bg-gradient-to-b ${getTypeBg(item.type)}`}
    >
      {/* Borde interior sutil */}
      <div className="pointer-events-none absolute inset-0 rounded-md border border-white/[0.04]" />

      {/* Línea superior de acento */}
      <div className={`pointer-events-none absolute left-0 right-0 top-0 h-[2px] rounded-t-md opacity-60 bg-gradient-to-r ${
        item.type === 'GPU' ? 'from-transparent via-cyan-400 to-transparent' :
        item.type === 'MEMORY' ? 'from-transparent via-purple-400 to-transparent' :
        item.type === 'STORAGE' ? 'from-transparent via-emerald-400 to-transparent' :
        item.type === 'POWER_UNIT' ? 'from-transparent via-yellow-400 to-transparent' :
        item.type === 'COOLING' ? 'from-transparent via-sky-300 to-transparent' :
        'from-transparent via-slate-400 to-transparent'
      }`} />

      {/* LED parpadeante */}
      <div className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full transition-opacity duration-500 ${getLedColor(item.type)} ${ledOn ? 'opacity-100' : 'opacity-15'}`} />

      {/* Contenido principal */}
      <div className="flex h-full w-full items-center gap-2 px-2 py-1">

        {/* Imagen */}
        <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded border border-white/6 bg-black/30 p-1">
          {hasImage ? (
            <img
              src={imageSrc}
              alt={`${item.brand ?? ''} ${item.model ?? item.type}`}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-contain drop-shadow-lg"
            />
          ) : (
            <span className={`text-[20px] ${getTypeColor(item.type)} opacity-50`}>
              {item.type === 'GPU' ? '⬛' :
               item.type === 'MEMORY' ? '▬' :
               item.type === 'STORAGE' ? '💾' :
               item.type === 'POWER_UNIT' ? '⚡' :
               item.type === 'CABLE_KIT' ? '〰' :
               item.type === 'COOLING' ? '❄' : '◼'}
            </span>
          )}
        </div>

        {/* Info texto */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className={`text-[7px] font-black uppercase tracking-[0.2em] ${getTypeColor(item.type)}`}>
            {item.type}
          </div>
          <div className="truncate text-[11px] font-bold text-white leading-tight mt-0.5">
            {item.brand ?? 'Unit'}
          </div>
          <div className="truncate text-[9px] text-slate-400 leading-tight">
            {item.model ?? ''}
          </div>
        </div>

        {/* Condition badge */}
        <span className={`shrink-0 rounded-full border px-1.5 py-[2px] text-[7px] font-bold uppercase tracking-[0.12em] ${getConditionTone(item.condition)}`}>
          {(item.condition ?? 'OK').toUpperCase()}
        </span>
      </div>
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
    data: { accepts },
  });

  const isCompatible = activeDragType === accepts;

  let slotClasses = 'border border-slate-700/50 bg-slate-950/60 shadow-inner';

  if (isCompatible) {
    slotClasses = 'border-cyan-500/50 bg-cyan-900/20 animate-pulse';
  }

  if (isCompatible && isOver) {
    slotClasses = 'z-10 scale-105 border-cyan-400 bg-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.5)]';
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
          <div className="flex flex-col items-center gap-1">
            <div className="h-4 w-4 rounded border border-dashed border-slate-700 opacity-40" />
            <span className="truncate text-center text-[7px] font-bold uppercase tracking-[0.16em] text-slate-600">
              {accepts}
            </span>
          </div>
        )
      )}
    </div>
  );
}