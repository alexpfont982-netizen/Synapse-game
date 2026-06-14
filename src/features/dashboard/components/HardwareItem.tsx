import { useDraggable } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import type { StoreItemCondition, StoreProductCategory } from '../../../types/store';

type ComponentType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
  | 'COOLING'
  | 'ROOM_FAN'
  | 'ROOM_EXTRACTOR';

interface HardwareItemProps {
  id: string;
  type: ComponentType;
  label: string;
  brand?: string;
  model?: string;
  category?: StoreProductCategory;
  condition?: StoreItemCondition;
  price?: number;
  inventoryId?: string;
  quantity?: number;
  imageSrc?: string;
  stats?: { tflops: number; power: number; heat: number };
  variant?: 'compact' | 'inventory';
}

function formatCategoryLabel(category?: StoreProductCategory) {
  switch (category) {
    case 'power_supply': return 'PSU';
    case 'power_cable':  return 'Cable';
    case 'memory':       return 'Memory';
    case 'storage':      return 'Storage';
    case 'gpu':          return 'GPU';
    case 'cooling':      return 'Cooling';
    default:             return 'Hardware';
  }
}

function getConditionTone(condition?: StoreItemCondition) {
  switch (condition) {
    case 'New':     return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
    case 'Used':    return 'border-amber-400/25 bg-amber-500/10 text-amber-200';
    case 'Rebuilt': return 'border-violet-400/25 bg-violet-500/10 text-violet-200';
    default:        return 'border-slate-700 bg-slate-800/60 text-slate-200';
  }
}

export function HardwareItem({
  id,
  type,
  label,
  brand,
  model,
  category,
  condition,
  price: _price,
  inventoryId: _inventoryId,
  quantity: _quantity,
  imageSrc,
  variant = 'compact',
}: HardwareItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { type },
  });
  const [imageFailed, setImageFailed] = useState(false);

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

  const getTypeColor = (itemType: ComponentType) => {
    switch (itemType) {
      case 'GPU':            return 'text-cyan-400';
      case 'MEMORY':         return 'text-purple-400';
      case 'STORAGE':        return 'text-emerald-400';
      case 'POWER_UNIT':     return 'text-yellow-400';
      case 'CABLE_KIT':      return 'text-slate-300';
      case 'COOLING':        return 'text-sky-300';
      case 'ROOM_FAN':       return 'text-sky-400';
      case 'ROOM_EXTRACTOR': return 'text-orange-400';
      default:               return 'text-slate-300';
    }
  };

  // ── Variante inventario ──────────────────────────────────────
  if (variant === 'inventory') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`flex w-full gap-2 rounded-xl border p-2 transition-colors ${
          isDragging
            ? 'opacity-0'
            : 'cursor-grab border-slate-700 bg-slate-900/80 hover:border-cyan-400/30 hover:bg-slate-900'
        }`}
      >
        {/* Imagen */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-slate-950/90 p-1">
          {!imageFailed && imageSrc ? (
            <img
              src={imageSrc}
              alt={label}
              onError={() => setImageFailed(true)}
              className="max-h-[44px] max-w-[44px] object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-slate-700 text-[8px] font-bold text-slate-500">
              ?
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {/* Fila 1: tipo + condition */}
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[7px] font-bold uppercase tracking-[0.2em] ${getTypeColor(type)}`}>
              {type}
            </span>
            <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] ${getConditionTone(condition)}`}>
              {condition ?? 'Stored'}
            </span>
          </div>

          {/* Fila 2: nombre */}
          <div className="mt-0.5 truncate text-[11px] font-semibold text-white">
            {brand ?? label}
          </div>

          {/* Fila 3: modelo */}
          <div className="truncate text-[10px] text-slate-400">
            {model ?? label}
          </div>

          {/* Fila 4: categoría + botones */}
          <div className="mt-1 flex items-center gap-1 min-w-0">
            <span className="min-w-0 truncate rounded-full border border-cyan-400/15 bg-cyan-500/8 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-cyan-100">
              {formatCategoryLabel(category)}
            </span>
            <div className="ml-auto shrink-0 flex gap-1">
              {['Sell', 'Details'].map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled
                  title={`${action} coming soon`}
                 className="rounded border border-white/10 bg-white/[0.03] px-1 py-0 text-[7px] font-semibold uppercase tracking-[0.08em] text-slate-400"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Variante compact (dentro del slot del rack) ──────────────
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex w-full h-full flex-col items-center justify-center rounded border p-1 transition-colors ${
        isDragging
          ? 'opacity-0'
          : 'cursor-grab border-slate-600 bg-slate-800 hover:border-slate-400 hover:bg-slate-700'
      }`}
    >
      <span className={`mb-0.5 text-[8px] font-bold uppercase tracking-wider ${getTypeColor(type)}`}>
        {type}
      </span>
      <span className="text-center text-[9px] font-semibold leading-tight text-white line-clamp-2">
        {label}
      </span>
    </div>
  );
}