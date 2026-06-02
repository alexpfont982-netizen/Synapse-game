import rack01Empty from '../../../assets/dashboard/rack-front-empty-level1.png';

import powerUnitImg from '../../../assets/dashboard/components/power-unit.png';
import cableKitImg from '../../../assets/dashboard/components/cable-kit.png';
import memoryModuleImg from '../../../assets/dashboard/components/memory-module.png';
import storageUnitImg from '../../../assets/dashboard/components/storage-unit.png';
import gpuModuleImg from '../../../assets/dashboard/components/gpu-module.png';

type RackStatus = 'ACTIVE' | 'LOCKED';

type RackItem = {
  id: number;
  label: string;
  status: RackStatus;
  left: string;
  top: string;
  width: string;
  height: string;
  labelLeft: string;
  labelTop: string;
  opacity?: number;
};

type RackComponentSlot = {
  left: string;
  top: string;
  width: string;
  height: string;
};

const racks: RackItem[] = [
  {
    id: 1,
    label: 'RACK 01',
    status: 'ACTIVE',
    left: '9%',
    top: '28.5%',
    width: '45%',
    height: '45%',
    labelLeft: '29.5%',
    labelTop: '24.5%',
    opacity: 1,
  },
  {
    id: 2,
    label: 'RACK 02',
    status: 'LOCKED',
    left: '18.2%',
    top: '28.5%',
    width: '50%',
    height: '45%',
    labelLeft: '41.1%',
    labelTop: '24.5%',
    opacity: 1,
  },
  {
    id: 3,
    label: 'RACK 03',
    status: 'LOCKED',
    left: '29.8%',
    top: '28.5%',
    width: '50%',
    height: '45%',
    labelLeft: '52.7%',
    labelTop: '24.5%',
    opacity: 1,
  },
  {
    id: 4,
    label: 'RACK 04',
    status: 'LOCKED',
    left: '41.5%',
    top: '28.5%',
    width: '50%',
    height: '45%',
    labelLeft: '63.9%',
    labelTop: '24.5%',
    opacity: 1,
  },
];

/**
 * Área interna del RACK 01.
 * Estos valores son el punto de partida.
 * Si las piezas quedan corridas, ajustamos solo este bloque.
 */
const rack01ComponentArea = {
  left: '32.1%',
  top: '34.6%',
  width: '5.8%',
  height: '30.5%',
};

/**
 * Cantidades temporales de prueba.
 * Luego esto debe venir del inventario real del usuario.
 */
const installedRack01Components = {
  powerUnit: 1,
  cableKit: 1,
  memory: 2,
  storage: 1,
  gpu: 1,
};

const powerUnitSlot: RackComponentSlot = {
  left: '3%',
  top: '-11%',
  width: '150%',
  height: '30%',
};

const cableKitSlot: RackComponentSlot = {
  left: '3%',
  top: '19%',
  width: '94%',
  height: '17%',
};

const memorySlots: RackComponentSlot[] = [
  { left: '12%', top: '34%', width: '22%', height: '10%' },
  { left: '39%', top: '34%', width: '22%', height: '10%' },
  { left: '66%', top: '34%', width: '22%', height: '10%' },
  { left: '12%', top: '47%', width: '22%', height: '10%' },
  { left: '39%', top: '47%', width: '22%', height: '10%' },
  { left: '66%', top: '47%', width: '22%', height: '10%' },
];

const storageSlots: RackComponentSlot[] = [
  { left: '12%', top: '64%', width: '34%', height: '11%' },
  { left: '54%', top: '64%', width: '34%', height: '11%' },
];

const gpuSlots: RackComponentSlot[] = [
  { left: '8%', top: '81%', width: '25%', height: '13%' },
  { left: '37.5%', top: '81%', width: '25%', height: '13%' },
  { left: '67%', top: '81%', width: '25%', height: '13%' },
];

function clampInstalledCount(value: number, max: number) {
  return Math.max(0, Math.min(value, max));
}

function getStatusClasses(status: RackStatus) {
  if (status === 'ACTIVE') {
    return {
      dot: 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]',
      badge: 'border border-emerald-300/40 bg-emerald-400/10 text-emerald-200',
      label: 'text-slate-100',
    };
  }

  return {
    dot: 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.45)]',
    badge: 'border border-amber-300/35 bg-amber-400/10 text-amber-200',
    label: 'text-slate-200',
  };
}

function renderRackComponentImage(
  slot: RackComponentSlot,
  imageSrc: string,
  alt: string,
  key: string,
) {
  return (
    <img
      key={key}
      src={imageSrc}
      alt={alt}
      draggable={false}
      className="absolute select-none object-contain"
      style={{
        left: slot.left,
        top: slot.top,
        width: slot.width,
        height: slot.height,
        filter: 'brightness(0.9) contrast(1.12) saturate(0.95)',
      }}
    />
  );
}

function renderRackComponentSlots(
  slots: RackComponentSlot[],
  installedCount: number,
  imageSrc: string,
  alt: string,
) {
  const visibleCount = clampInstalledCount(installedCount, slots.length);

  return slots
    .slice(0, visibleCount)
    .map((slot, index) =>
      renderRackComponentImage(
        slot,
        imageSrc,
        `${alt} ${index + 1}`,
        `${alt.toLowerCase().replaceAll(' ', '-')}-${index}`,
      ),
    );
}

export function GarageRackOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {racks.map((rack) => {
        const statusClasses = getStatusClasses(rack.status);

        return (
          <div key={rack.id}>
            {/* etiqueta superior */}
            <div
              className="absolute flex flex-col items-start gap-1"
              style={{
                left: rack.labelLeft,
                top: rack.labelTop,
                zIndex: 80,
              }}
            >
              <div
                className={`flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] ${statusClasses.label}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusClasses.dot}`} />
                <span>{rack.label}</span>
              </div>

              <span
                className={`rounded-full px-2 py-[2px] text-[7px] font-black uppercase tracking-[0.16em] ${statusClasses.badge}`}
              >
                {rack.status}
              </span>
            </div>

            {/* rack */}
            <img
              src={rack01Empty}
              alt={rack.label}
              draggable={false}
              className="absolute select-none object-contain"
              style={{
                left: rack.left,
                top: rack.top,
                width: rack.width,
                height: rack.height,
                opacity: rack.opacity ?? 1,
                zIndex: 40,
              }}
            />

            {/* componentes del RACK 01 */}
            {rack.id === 1 && (
              <div
                className="absolute overflow-hidden"
                style={{
                  left: rack01ComponentArea.left,
                  top: rack01ComponentArea.top,
                  width: rack01ComponentArea.width,
                  height: rack01ComponentArea.height,
                  zIndex: 90,
                }}
              >
                {/* Guía interna temporal. Puedes borrarla después */}
                <div className="absolute inset-0 rounded-[4px] border border-cyan-400/10 bg-slate-950/5" />

                {installedRack01Components.powerUnit > 0 &&
                  renderRackComponentImage(
                    powerUnitSlot,
                    powerUnitImg,
                    'Power Unit',
                    'rack01-power-unit',
                  )}

                {installedRack01Components.cableKit > 0 &&
                  renderRackComponentImage(
                    cableKitSlot,
                    cableKitImg,
                    'Cable Kit',
                    'rack01-cable-kit',
                  )}

                {renderRackComponentSlots(
                  memorySlots,
                  installedRack01Components.memory,
                  memoryModuleImg,
                  'Memory Module',
                )}

                {renderRackComponentSlots(
                  storageSlots,
                  installedRack01Components.storage,
                  storageUnitImg,
                  'Storage Unit',
                )}

                {renderRackComponentSlots(
                  gpuSlots,
                  installedRack01Components.gpu,
                  gpuModuleImg,
                  'GPU Module',
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}