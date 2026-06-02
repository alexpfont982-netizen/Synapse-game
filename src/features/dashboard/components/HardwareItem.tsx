import { useDraggable } from '@dnd-kit/core';

type ComponentType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
  | 'ROOM_FAN'
  | 'ROOM_EXTRACTOR';

interface HardwareItemProps {
  id: string;
  type: ComponentType;
  label: string;
  stats?: { tflops: number; power: number; heat: number };
}

export function HardwareItem({ id, type, label }: HardwareItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { type }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 9999 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  } : undefined;

  const getTypeColor = (itemType: ComponentType) => {
    switch (itemType) {
      case 'GPU':
        return 'text-cyan-400';
      case 'MEMORY':
        return 'text-purple-400';
      case 'STORAGE':
        return 'text-emerald-400';
      case 'POWER_UNIT':
        return 'text-yellow-400';
      case 'CABLE_KIT':
        return 'text-slate-300';
      case 'ROOM_FAN':
        return 'text-sky-400';
      case 'ROOM_EXTRACTOR':
        return 'text-orange-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex flex-col items-center justify-center w-full h-full p-1 rounded border transition-colors ${
        isDragging
          ? 'opacity-0'
          : 'border-slate-600 bg-slate-800 cursor-grab hover:border-slate-400 hover:bg-slate-700'
        }`}
    >
      {/* Aquí aplicamos el color dinámico */}
      <span className={`text-[8px] mb-0.5 uppercase tracking-wider font-bold ${getTypeColor(type)}`}>
        {type}
      </span>
      <span className="text-[9px] font-semibold text-white text-center leading-tight line-clamp-2">
        {label}
      </span>
    </div>
  );
}