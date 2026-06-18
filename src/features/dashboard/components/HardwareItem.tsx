import { useDraggable } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StoreItemCondition, StoreProductCategory } from '../../../types/store';
import type { MockHardwareStats } from '../../../data/supabasePlayerState';

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
  stats?: MockHardwareStats;
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

function getTypeColor(itemType: ComponentType) {
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
}

function getTypeGlow(itemType: ComponentType) {
  switch (itemType) {
    case 'GPU':        return 'shadow-[0_0_12px_rgba(34,211,238,0.35)] border-cyan-400/40';
    case 'MEMORY':     return 'shadow-[0_0_12px_rgba(192,132,252,0.35)] border-purple-400/40';
    case 'STORAGE':    return 'shadow-[0_0_12px_rgba(52,211,153,0.35)] border-emerald-400/40';
    case 'POWER_UNIT': return 'shadow-[0_0_12px_rgba(250,204,21,0.35)] border-yellow-400/40';
    case 'CABLE_KIT':  return 'shadow-[0_0_8px_rgba(148,163,184,0.25)] border-slate-400/30';
    case 'COOLING':    return 'shadow-[0_0_12px_rgba(125,211,252,0.35)] border-sky-300/40';
    default:           return 'shadow-[0_0_8px_rgba(148,163,184,0.2)] border-slate-600/40';
  }
}

function getLedColor(itemType: ComponentType) {
  switch (itemType) {
    case 'GPU':        return 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,1)]';
    case 'MEMORY':     return 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,1)]';
    case 'STORAGE':    return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,1)]';
    case 'POWER_UNIT': return 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,1)]';
    case 'CABLE_KIT':  return 'bg-slate-300 shadow-[0_0_4px_rgba(148,163,184,0.8)]';
    case 'COOLING':    return 'bg-sky-300 shadow-[0_0_6px_rgba(125,211,252,1)]';
    default:           return 'bg-slate-400 shadow-[0_0_4px_rgba(148,163,184,0.6)]';
  }
}

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-slate-700/60">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-[10px] font-bold text-slate-300">{value}</span>
    </div>
  );
}

function DetailsModal({
  brand,
  model,
  category,
  condition,
  imageSrc,
  stats,
  onClose,
}: {
  brand?: string;
  model?: string;
  category?: StoreProductCategory;
  condition?: StoreItemCondition;
  imageSrc?: string;
  stats?: MockHardwareStats;
  onClose: () => void;
}) {
  const conditionColor =
    condition === 'New'     ? 'text-emerald-300 border-emerald-400/25 bg-emerald-500/10' :
    condition === 'Used'    ? 'text-amber-300 border-amber-400/25 bg-amber-500/10'       :
    condition === 'Rebuilt' ? 'text-violet-300 border-violet-400/25 bg-violet-500/10'   :
    'text-slate-300 border-slate-700 bg-slate-800/60';

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[320px] max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-600/60 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex gap-3">
          {imageSrc && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-slate-950/90 p-1">
              <img src={imageSrc} alt={brand} className="max-h-[52px] max-w-[52px] object-contain" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-white">{brand}</p>
            <p className="truncate text-[11px] text-slate-400">{model}</p>
            <div className="mt-1 flex gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {formatCategoryLabel(category)}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${conditionColor}`}>
                {condition}
              </span>
            </div>
          </div>
        </div>

        {stats && (
          <div className="mt-4 space-y-3">
            <div className="border-t border-slate-700/60" />

            {stats.stability !== undefined && (
              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Stability</p>
                <StatBar value={stats.stability} max={100} color="bg-emerald-400" />
              </div>
            )}
            {stats.temperature_c !== undefined && (
              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Temperature</p>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-700/60">
                    <div className="h-1.5 rounded-full bg-orange-400"
                      style={{ width: `${Math.min(100, Math.round((stats.temperature_c / 100) * 100))}%` }} />
                  </div>
                  <span className="w-10 text-right text-[10px] font-bold text-slate-300">{stats.temperature_c}°C</span>
                </div>
              </div>
            )}
            {stats.failure_risk !== undefined && (
              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Failure Risk</p>
                <StatBar value={stats.failure_risk} max={100} color="bg-red-400" />
              </div>
            )}

            {category === 'power_supply' && (
              <>
                {stats.power_w !== undefined && (
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Power Output</p>
                    <StatBar value={stats.power_w} max={700} color="bg-yellow-400" />
                  </div>
                )}
                {stats.avg_consumption_w !== undefined && (
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Avg Consumption</p>
                    <StatBar value={stats.avg_consumption_w} max={400} color="bg-yellow-300" />
                  </div>
                )}
              </>
            )}

            {category === 'gpu' && (
              <>
                {stats.ai_output !== undefined && (
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">AI Output</p>
                    <StatBar value={stats.ai_output} max={750} color="bg-cyan-400" />
                  </div>
                )}
                {stats.vram_gb !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">VRAM</span>
                    <span className="text-[11px] font-bold text-cyan-300">{stats.vram_gb} GB</span>
                  </div>
                )}
                {stats.power_consumption_w !== undefined && (
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Power Draw</p>
                    <StatBar value={stats.power_consumption_w} max={200} color="bg-yellow-400" />
                  </div>
                )}
              </>
            )}

            {category === 'memory' && (
              <>
                {stats.processing_speed !== undefined && (
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Processing Speed</p>
                    <StatBar value={stats.processing_speed} max={420} color="bg-purple-400" />
                  </div>
                )}
                {stats.capacity_gb !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Capacity</span>
                    <span className="text-[11px] font-bold text-purple-300">{stats.capacity_gb} GB</span>
                  </div>
                )}
              </>
            )}

            {category === 'storage' && (
              <>
                {stats.read_speed !== undefined && (
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Read Speed</p>
                    <StatBar value={stats.read_speed} max={400} color="bg-emerald-400" />
                  </div>
                )}
                {stats.storage_type && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Type</span>
                    <span className="text-[11px] font-bold text-emerald-300">{stats.storage_type}</span>
                  </div>
                )}
                {stats.capacity && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Capacity</span>
                    <span className="text-[11px] font-bold text-emerald-300">{stats.capacity}</span>
                  </div>
                )}
              </>
            )}

            {category === 'power_cable' && (
              <>
                {stats.stability_bonus !== undefined && (
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Stability Bonus</p>
                    <StatBar value={stats.stability_bonus} max={20} color="bg-slate-300" />
                  </div>
                )}
                {stats.power_support && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Power Support</span>
                    <span className="text-[11px] font-bold text-slate-300">{stats.power_support}</span>
                  </div>
                )}
              </>
            )}

            {category === 'cooling' && (
              <>
                {stats.cooling_power !== undefined && (
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Cooling Power</p>
                    <StatBar value={stats.cooling_power} max={100} color="bg-sky-400" />
                  </div>
                )}
                {stats.temperature_reduction && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Temp Reduction</span>
                    <span className="text-[11px] font-bold text-sky-300">{stats.temperature_reduction}</span>
                  </div>
                )}
              </>
            )}

            {stats.boost && (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2">
                <p className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">Boost</p>
                <p className="text-[10px] text-emerald-300">{stats.boost}</p>
              </div>
            )}
            {stats.penalty && (
              <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2">
                <p className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-red-400">Penalty</p>
                <p className="text-[10px] text-red-300">{stats.penalty}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
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
  stats,
  variant = 'compact',
}: HardwareItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { type },
  });
  const [imageFailed, setImageFailed] = useState(false);
  const [ledOn,       setLedOn]       = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => { setImageFailed(false); }, [imageSrc]);

  useEffect(() => {
    if (variant !== 'compact') return;
    const interval = setInterval(() => {
      setLedOn((prev) => !prev);
    }, 800 + Math.random() * 400);
    return () => clearInterval(interval);
  }, [variant]);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex:    isDragging ? 9999 : undefined,
        position:  isDragging ? ('relative' as const) : undefined,
      }
    : undefined;

  // ── Variante inventario ──────────────────────────────────────
  if (variant === 'inventory') {
    return (
      <>
        {showDetails && (
          <DetailsModal
            brand={brand}
            model={model}
            category={category}
            condition={condition}
            imageSrc={imageSrc}
            stats={stats}
            onClose={() => setShowDetails(false)}
          />
        )}

        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={`relative flex w-full gap-2 rounded-xl border p-2 transition-colors ${
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
            <div className="flex items-center justify-between gap-1">
              <span className={`text-[7px] font-bold uppercase tracking-[0.2em] ${getTypeColor(type)}`}>
                {type}
              </span>
              <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] ${getConditionTone(condition)}`}>
                {condition ?? 'Stored'}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[11px] font-semibold text-white">
              {brand ?? label}
            </div>
            <div className="truncate text-[10px] text-slate-400">
              {model ?? label}
            </div>
            <div className="mt-1 flex items-center gap-1 min-w-0">
              <span className="min-w-0 truncate rounded-full border border-cyan-400/15 bg-cyan-500/8 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-cyan-100">
                {formatCategoryLabel(category)}
              </span>
              <div className="ml-auto shrink-0 flex gap-1">
                <button
                  type="button"
                  disabled
                  title="Sell coming soon"
                  className="rounded border border-white/10 bg-white/[0.03] px-1 py-0 text-[7px] font-semibold uppercase tracking-[0.08em] text-slate-400"
                >
                  Sell
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowDetails(true);
                  }}
                  className="rounded border border-cyan-400/20 bg-cyan-500/10 px-1 py-0 text-[7px] font-semibold uppercase tracking-[0.08em] text-cyan-300 hover:border-cyan-400/40 hover:bg-cyan-500/20 transition-colors"
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Variante compact (dentro del slot del rack) ──────────────
  const hasImage = !imageFailed && !!imageSrc;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative flex w-full h-full flex-col items-center justify-center rounded-lg border p-1.5 transition-all overflow-hidden ${
        isDragging
          ? 'opacity-0'
          : `cursor-grab bg-slate-900/90 hover:bg-slate-800/90 ${getTypeGlow(type)}`
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
      <div className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full transition-opacity duration-300 ${getLedColor(type)} ${ledOn ? 'opacity-100' : 'opacity-20'}`} />

      {hasImage ? (
        <img
          src={imageSrc}
          alt={label}
          onError={() => setImageFailed(true)}
          className="mb-1 max-h-[36px] max-w-full object-contain drop-shadow-lg"
        />
      ) : (
        <div className={`mb-1 text-[18px] font-black ${getTypeColor(type)} opacity-60`}>
          {type === 'GPU'        ? '⬛' :
           type === 'MEMORY'     ? '▬'  :
           type === 'STORAGE'    ? '▪'  :
           type === 'POWER_UNIT' ? '⚡' :
           type === 'CABLE_KIT'  ? '〰' :
           type === 'COOLING'    ? '❄'  : '◼'}
        </div>
      )}

      <span className="text-center text-[8px] font-bold leading-tight text-white/90 line-clamp-1 px-0.5">
        {brand ?? label}
      </span>
      <span className={`text-[7px] font-black uppercase tracking-wider ${getTypeColor(type)} opacity-80`}>
        {type}
      </span>
    </div>
  );
}