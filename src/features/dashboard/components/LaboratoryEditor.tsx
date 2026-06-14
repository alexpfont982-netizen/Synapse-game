import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { HardwareSlot } from './HardwareSlot'
import { HardwareItem } from './HardwareItem'
import garageLevelOneHero from '../../../assets/dashboard/garage-level-1.png'
import {
  selectMockHardwarePieces,
  type MockHardwarePiece,
  updateInventoryItemSlot,
  useMockPlayerState,
} from '../../../data/supabasePlayerState'

type ComponentType = MockHardwarePiece['type']
type HardwarePiece = MockHardwarePiece
type InventoryFilterTab = 'all' | MockHardwarePiece['category']

const inventoryTabs: Array<{
  id: InventoryFilterTab
  label: string
}> = [
    { id: 'all', label: 'All' },
    { id: 'power_supply', label: 'PSU' },
    { id: 'power_cable', label: 'Cables' },
    { id: 'memory', label: 'RAM' },
    { id: 'storage', label: 'Storage' },
    { id: 'gpu', label: 'GPU' },
    { id: 'cooling', label: 'Cooling' },
  ]

function getMemorySlotId(rackId: number, slotNumber: number) {
  return `rack${rackId}-mem${slotNumber}`
}

function generateEmptyRacks() {
  const slots: Record<string, HardwarePiece | null> = {}

  for (let rack = 1; rack <= 1; rack += 1) {
    slots[`rack${rack}-power1`] = null
    slots[`rack${rack}-power2`] = null
    slots[`rack${rack}-cable-kit1`] = null
    slots[`rack${rack}-cable-kit2`] = null
    slots[`rack${rack}-cooling1`] = null
    slots[`rack${rack}-cooling2`] = null

    for (let memorySlot = 1; memorySlot <= 6; memorySlot += 1) {
      slots[getMemorySlotId(rack, memorySlot)] = null
    }

    for (let storageSlot = 1; storageSlot <= 2; storageSlot += 1) {
      slots[`rack${rack}-storage${storageSlot}`] = null
    }

    for (let gpuSlot = 1; gpuSlot <= 6; gpuSlot += 1) {
      slots[`rack${rack}-gpu${gpuSlot}`] = null
    }
  }

  return slots
}

function buildRackSlots(hardware: HardwarePiece[]) {
  const slots = generateEmptyRacks()

  hardware.forEach((item) => {
    if (!item.slot_id) {
      return
    }

    if (Object.prototype.hasOwnProperty.call(slots, item.slot_id)) {
      slots[item.slot_id] = item
    }
  })

  return slots
}

function InventoryDropZone({
  activeFilter,
  onFilterChange,
  visibleCount,
  totalCount,
  children,
  className,
}: {
  activeFilter: InventoryFilterTab
  onFilterChange: (tab: InventoryFilterTab) => void
  visibleCount: number
  totalCount: number
  children: ReactNode
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'inventory-zone',
    data: { accepts: 'ANY' },
  })

  return (
    <div
      ref={setNodeRef}
      className={`custom-scrollbar w-full overflow-y-auto rounded-2xl border p-4 shadow-[0_0_28px_rgba(8,145,178,0.10)] backdrop-blur-md transition-all ${isOver
        ? 'border-cyan-500 bg-slate-800/90 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
        : 'border-slate-800 bg-slate-950/80'
        } ${className ?? 'h-full'}`}
    >
      <div className="sticky top-0 z-10 -mx-2 mb-3 space-y-2 bg-slate-950/95 px-2 pb-2 pt-1 backdrop-blur-md">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold tracking-[0.2em] text-slate-400">
              INVENTARIO DISPONIBLE
            </h2>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {visibleCount} visible / {totalCount} total
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {inventoryTabs.map((tab) => {
            const isActive = tab.id === activeFilter

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange(tab.id)}
                className={`rounded-full border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition ${isActive
                  ? 'border-cyan-300/30 bg-cyan-400/12 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.1)]'
                  : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/18 hover:text-cyan-100'
                  }`}
                aria-pressed={isActive}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex min-h-[300px] flex-col gap-2">{children}</div>
    </div>
  )
}

function LaboratoryPanel({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-[0_0_22px_rgba(34,211,238,0.08)] backdrop-blur-md ${className ?? ''}`}
    >
      <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/75">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  )
}

// ── Stat card reutilizable para Rack Status ──────────────────
function StatCard({
  label,
  value,
  valueColor = 'text-white',
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2">
      <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-[12px] font-bold ${valueColor}`}>{value}</p>
    </div>
  )
}

// ── Slot count por categoría ─────────────────────────────────
function SlotCountRow({
  label,
  filled,
  total,
}: {
  label: string
  filled: number
  total: number
}) {
  const full = filled >= total
  return (
    <div className="flex items-center justify-between gap-1">
      <p className="text-[8px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`text-[9px] font-bold ${full ? 'text-cyan-300' : 'text-amber-300/80'}`}>
        {filled}/{total}
      </p>
    </div>
  )
}

export function LaboratoryEditor() {
  const { inventory: inventoryEntries, refresh } = useMockPlayerState()
  const [activeDragType, setActiveDragType] = useState<ComponentType | null>(null)
  const [activeInventoryFilter, setActiveInventoryFilter] = useState<InventoryFilterTab>('all')
  const [activeDraggedItem, setActiveDraggedItem] = useState<HardwarePiece | null>(null)
  const [selectedRackId, setSelectedRackId] = useState(1)

  const hardwarePieces = useMemo(
    () => selectMockHardwarePieces(inventoryEntries),
    [inventoryEntries],
  )
  const inventory = useMemo(
    () => hardwarePieces.filter((item) => item.slot_id === null),
    [hardwarePieces],
  )
  const filteredInventory = useMemo(() => {
    if (activeInventoryFilter === 'all') return inventory
    return inventory.filter((item) => item.category === activeInventoryFilter)
  }, [activeInventoryFilter, inventory])

  const installedHardware = useMemo(
    () => hardwarePieces.filter((item) => item.slot_id !== null),
    [hardwarePieces],
  )
  const rackSlots = useMemo(() => buildRackSlots(hardwarePieces), [hardwarePieces])

  // ── Rack Status dinámico ─────────────────────────────────────
  const rackStatus = useMemo(() => {
    let powerLoad = 0
    let baseTemperature = 22
    let coolingOffset = 0
    let aiOutput = 0
    let stabilityPoints = 0

    installedHardware.forEach((piece) => {
      const stats = piece.stats ?? { tflops: 0, power: 0, heat: 0 }
      powerLoad += Math.max(0, stats.power ?? 0)
      aiOutput += piece.type === 'GPU' ? Math.max(0, stats.tflops ?? 0) : 0
      if (piece.type === 'COOLING') {
        coolingOffset += Math.abs(stats.heat ?? 0)
      } else {
        baseTemperature += Math.max(0, stats.heat ?? 0)
      }
      stabilityPoints +=
        piece.condition === 'New' ? 100 : piece.condition === 'Rebuilt' ? 88 : 74
    })

    return {
      powerLoad,
      temperature: Math.max(20, baseTemperature - coolingOffset),
      stability:
        installedHardware.length > 0
          ? Math.round(stabilityPoints / installedHardware.length)
          : 100,
      aiOutput,
      installedCount: installedHardware.length,
    }
  }, [installedHardware])

  // ── Conteo de slots por categoría ───────────────────────────
  const slotCounts = useMemo(() => {
    const counts = installedHardware.reduce<Record<ComponentType, number>>(
      (acc, piece) => {
        acc[piece.type] += 1
        return acc
      },
      {
        GPU: 0,
        MEMORY: 0,
        STORAGE: 0,
        POWER_UNIT: 0,
        CABLE_KIT: 0,
        COOLING: 0,
        ROOM_FAN: 0,
        ROOM_EXTRACTOR: 0,
      },
    )
    return counts
  }, [installedHardware])

  // ── System Events dinámicos ──────────────────────────────────
  const systemEvents = useMemo(() => {
    return [
      installedHardware.length > 0
        ? { title: 'Component Installed', detail: `${installedHardware.length} modules mounted in the active rack.`, color: 'text-violet-200/85' }
        : { title: 'Rack Awaiting Components', detail: 'Drag hardware from inventory to begin setup.', color: 'text-slate-400' },
      slotCounts.POWER_UNIT > 0
        ? { title: 'Power Supply Connected', detail: `${slotCounts.POWER_UNIT}/2 PSU slots active.`, color: 'text-amber-200/85' }
        : { title: 'Power System Idle', detail: 'Install a PSU to energize the rack.', color: 'text-slate-400' },
      slotCounts.COOLING > 0
        ? { title: 'Cooling Module Ready', detail: `${slotCounts.COOLING}/2 cooling slots active.`, color: 'text-sky-200/85' }
        : { title: 'Cooling Standby', detail: 'No cooling installed.', color: 'text-slate-400' },
      slotCounts.GPU > 0
        ? { title: 'GPU Array Online', detail: `${slotCounts.GPU}/6 GPU slots active.`, color: 'text-cyan-200/85' }
        : { title: 'GPU Array Waiting', detail: 'Install GPUs to unlock compute.', color: 'text-slate-400' },
    ]
  }, [installedHardware, slotCounts])

  const rackAccess = [
    { id: 1, label: 'Rack 01', status: 'EMPTY', unlocked: true, price: 0 },
    { id: 2, label: 'Rack 02', status: 'LOCKED', unlocked: false, price: 2500 },
    { id: 3, label: 'Rack 03', status: 'LOCKED', unlocked: false, price: 7500 },
    { id: 4, label: 'Rack 04', status: 'LOCKED', unlocked: false, price: 18000 },
  ]

  function handleDragStart(event: DragStartEvent) {
    const activeData = event.active.data.current as { type: ComponentType } | undefined
    setActiveDragType(activeData?.type ?? null)
    const activeId = event.active.id as string
    setActiveDraggedItem(hardwarePieces.find((piece) => piece.id === activeId) ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragType(null)
    setActiveDraggedItem(null)

    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const acceptedType = (over.data.current as { accepts?: ComponentType } | undefined)?.accepts
    const draggedItem = hardwarePieces.find((piece) => piece.id === activeId)

    if (!draggedItem) return

    const isRackSlot = Object.prototype.hasOwnProperty.call(rackSlots, overId)

    if (overId === 'inventory-zone') {
      if (draggedItem.slot_id !== null) {
        await updateInventoryItemSlot(activeId, null)
        refresh()
      }
      return
    }

    if (!acceptedType || draggedItem.type !== acceptedType) return
    if (draggedItem.slot_id === overId) return

    if (isRackSlot) {
      if (rackSlots[overId]) return
      await updateInventoryItemSlot(activeId, overId)
      refresh()
    }
  }

  // ── Rack Selector ────────────────────────────────────────────
  const renderRackSelector = () => (
    <div className="relative z-20 flex w-full shrink-0 flex-col gap-2">
      {rackAccess.map((rack) => {
        const isSelected = selectedRackId === rack.id
        return (
          <button
            key={rack.id}
            type="button"
            disabled={!rack.unlocked}
            onClick={() => { if (rack.unlocked) setSelectedRackId(rack.id) }}
            className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${isSelected
              ? 'border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_18px_rgba(34,211,238,0.16)]'
              : rack.unlocked
                ? 'border-slate-700/60 bg-slate-950/70 hover:border-cyan-400/30'
                : 'border-slate-800/70 bg-slate-950/40 opacity-60'
              }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-200">
                {rack.label}
              </span>
              {!rack.unlocked && (
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Locked
                </span>
              )}
            </div>
            <p className={`mt-2 text-[9px] font-bold uppercase tracking-[0.18em] ${rack.unlocked ? 'text-cyan-300/70' : 'text-slate-500'}`}>
              {rack.unlocked ? rack.status : `${rack.price.toLocaleString()} NCR`}
            </p>
          </button>
        )
      })}
    </div>
  )

  // ── Render Rack ──────────────────────────────────────────────
  const renderRack = (rackId: number) => {
    const getSlotItem = (slotId: string) => rackSlots[slotId] ?? null

    const RackSection = ({
      label,
      color,
      children,
    }: {
      label: string
      color: string
      children: React.ReactNode
    }) => (
      <div className="flex flex-col gap-1.5 rounded-xl border border-slate-800/50 bg-black/40 px-3 py-2.5 shadow-inner">
        <p className={`text-[9px] font-black uppercase tracking-[0.24em] ${color}`}>
          {label}
        </p>
        {children}
      </div>
    )

    const SlotRow = ({
      slot1,
      slot2,
      accepts,
      height = '!h-[68px]',
    }: {
      slot1: string
      slot2: string
      accepts: ComponentType
      height?: string
    }) => (
      <div className="grid grid-cols-2 gap-2">
        <HardwareSlot
          key={slot1}
          id={slot1}
          accepts={accepts}
          activeDragType={activeDragType}
          slotItem={getSlotItem(slot1)}
          className={`${height} w-full`}
        />
        <HardwareSlot
          key={slot2}
          id={slot2}
          accepts={accepts}
          activeDragType={activeDragType}
          slotItem={getSlotItem(slot2)}
          className={`${height} w-full`}
        />
      </div>
    )

    return (
      <div
        key={`rack-${rackId}`}
        className="relative flex w-full max-w-[700px] mx-auto shrink-0 flex-col gap-2 overflow-hidden rounded-[26px] border border-cyan-400/20 bg-black/40 p-4 shadow-[0_0_38px_rgba(8,145,178,0.18)] backdrop-blur-xl"
      >
        {/* Decoraciones */}
        <div className="pointer-events-none absolute inset-0 rounded-[26px] border border-white/5" />
        <div className="pointer-events-none absolute left-0 top-0 h-full w-4 bg-gradient-to-b from-slate-700/30 via-slate-900/40 to-slate-700/30" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-4 bg-gradient-to-b from-slate-700/30 via-slate-900/40 to-slate-700/30" />
        <div className="pointer-events-none absolute left-6 right-6 top-3 h-1.5 rounded-full bg-slate-700/40" />
        <div className="pointer-events-none absolute bottom-3 left-6 right-6 h-1.5 rounded-full bg-slate-700/40" />
        <div className="pointer-events-none absolute left-7 top-7 h-1.5 w-1.5 rounded-full bg-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
        <div className="pointer-events-none absolute right-7 top-7 h-1.5 w-1.5 rounded-full bg-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
        <div className="pointer-events-none absolute bottom-7 left-7 h-1.5 w-1.5 rounded-full bg-cyan-400/30" />
        <div className="pointer-events-none absolute bottom-7 right-7 h-1.5 w-1.5 rounded-full bg-cyan-400/30" />

        <h2 className="relative z-10 mb-1 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          Core Node 0{rackId}
        </h2>

        {/* PSU — 2 slots */}
        <RackSection label="Power System" color="text-amber-300/70">
          <SlotRow
            slot1={`rack${rackId}-power1`}
            slot2={`rack${rackId}-power2`}
            accepts="POWER_UNIT"
            height="!h-[72px]"
          />
        </RackSection>

        {/* Cables — 2 slots */}
        <RackSection label="Power Cables" color="text-slate-300/70">
          <SlotRow
            slot1={`rack${rackId}-cable-kit1`}
            slot2={`rack${rackId}-cable-kit2`}
            accepts="CABLE_KIT"
            height="!h-[68px]"
          />
        </RackSection>

        {/* Cooling — 2 slots */}
        <RackSection label="Cooling System" color="text-sky-300/70">
          <SlotRow
            slot1={`rack${rackId}-cooling1`}
            slot2={`rack${rackId}-cooling2`}
            accepts="COOLING"
            height="!h-[68px]"
          />
        </RackSection>

        {/* Storage — 2 slots */}
        <RackSection label="Storage Bay" color="text-emerald-300/70">
          <SlotRow
            slot1={`rack${rackId}-storage1`}
            slot2={`rack${rackId}-storage2`}
            accepts="STORAGE"
            height="!h-[68px]"
          />
        </RackSection>

        {/* RAM — 6 slots en grid 3×2 */}
        <RackSection label="Memory Bank" color="text-purple-300/70">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, index) => {
              const slotId = getMemorySlotId(rackId, index + 1)
              return (
                <HardwareSlot
                  key={slotId}
                  id={slotId}
                  accepts="MEMORY"
                  activeDragType={activeDragType}
                  slotItem={getSlotItem(slotId)}
                  className="!h-[68px] w-full"
                />
              )
            })}
          </div>
        </RackSection>

        {/* GPU — 6 slots en grid 3×2 */}
        <RackSection label="GPU Array" color="text-cyan-300/70">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <HardwareSlot
                key={`rack${rackId}-gpu${index + 1}`}
                id={`rack${rackId}-gpu${index + 1}`}
                accepts="GPU"
                activeDragType={activeDragType}
                slotItem={getSlotItem(`rack${rackId}-gpu${index + 1}`)}
                className="!h-[68px] w-full"
              />
            ))}
          </div>
        </RackSection>
      </div>
    )
  }

  // ── Render principal ─────────────────────────────────────────
  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <section className="relative z-10 flex h-[calc(100vh+50px)] min-h-[900px] w-full max-w-[1700px] min-w-0 items-stretch gap-3 p-3">
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-cyan-400/15 bg-slate-950/40" />
          <div className="relative h-full overflow-hidden rounded-[28px] border border-white/5 bg-slate-950">
            <img
              src={garageLevelOneHero}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-5"
              alt="bg"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/95 to-slate-950/80" />

            <div className="absolute inset-0 z-10 flex items-start gap-3 p-3">

              {/* ── Columna izquierda: Racks + Rack Status ── */}
              <div className="flex h-full w-[116px] shrink-0 flex-col gap-3 pt-1">
                {renderRackSelector()}

                <LaboratoryPanel title="Rack Status" className="shrink-0">
                  <div className="space-y-2">

                    {/* Métricas dinámicas */}
                    <StatCard
                      label="Power Load"
                      value={`${rackStatus.powerLoad} W`}
                      valueColor={rackStatus.powerLoad > 800 ? 'text-red-400' : rackStatus.powerLoad > 500 ? 'text-amber-300' : 'text-white'}
                    />
                    <StatCard
                      label="Temperature"
                      value={`${rackStatus.temperature} °C`}
                      valueColor={rackStatus.temperature > 150 ? 'text-red-400' : rackStatus.temperature > 80 ? 'text-amber-300' : 'text-cyan-300'}
                    />
                    <StatCard
                      label="Stability"
                      value={`${rackStatus.stability}%`}
                      valueColor={rackStatus.stability >= 90 ? 'text-cyan-300' : rackStatus.stability >= 75 ? 'text-amber-300' : 'text-red-400'}
                    />
                    <StatCard
                      label="AI Output"
                      value={`${rackStatus.aiOutput.toFixed(1)} TF`}
                      valueColor="text-cyan-300"
                    />
                    <StatCard
                      label="Components"
                      value={`${rackStatus.installedCount}/24`}
                      valueColor="text-white"
                    />

                    {/* Slot counts por categoría */}
                    <div className="rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2 space-y-1.5">
                      <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
                        Slot Fill
                      </p>
                      <SlotCountRow label="PSU" filled={slotCounts.POWER_UNIT} total={2} />
                      <SlotCountRow label="Cables" filled={slotCounts.CABLE_KIT} total={2} />
                      <SlotCountRow label="Cooling" filled={slotCounts.COOLING} total={2} />
                      <SlotCountRow label="Storage" filled={slotCounts.STORAGE} total={2} />
                      <SlotCountRow label="RAM" filled={slotCounts.MEMORY} total={6} />
                      <SlotCountRow label="GPU" filled={slotCounts.GPU} total={6} />
                    </div>

                    {/* System Events */}
                    <div className="border-t border-white/10 pt-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/85 mb-2">
                        System Events
                      </p>
                      <div className="space-y-2">
                        {systemEvents.map((event) => (
                          <div
                            key={event.title}
                            className="rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2"
                          >
                            <p className={`text-[9px] font-bold uppercase tracking-[0.18em] ${event.color}`}>
                              {event.title}
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                              {event.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </LaboratoryPanel>
              </div>

              {/* ── Columna central: Rack ── */}
              <div className="flex h-full min-w-0 flex-1 items-start justify-center overflow-hidden pt-1">
                <div className="custom-scrollbar flex h-full w-full items-start overflow-x-auto overflow-y-auto pb-1">
                  <div className="origin-top scale-[0.98] w-full px-2">
                    {renderRack(selectedRackId)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Inventario ── */}
        <div className="flex w-[300px] shrink-0 flex-col gap-3">
          <InventoryDropZone
            activeFilter={activeInventoryFilter}
            onFilterChange={setActiveInventoryFilter}
            visibleCount={filteredInventory.length}
            totalCount={inventory.length}
            className="h-full"
          >
            {filteredInventory.length > 0 ? (
              filteredInventory.map((item) => (
                <HardwareItem
                  key={item.id}
                  id={item.id}
                  type={item.type}
                  label={item.name}
                  brand={item.brand}
                  model={item.model}
                  category={item.category}
                  condition={item.condition}
                  price={item.price}
                  inventoryId={item.inventory_id}
                  imageSrc={item.image}
                  stats={item.stats}
                  variant="inventory"
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/55 px-4 py-5 text-center text-xs text-slate-400">
                No components available in this category.
              </div>
            )}
          </InventoryDropZone>
        </div>

        {/* ── Panel de publicidad ── */}
        <LaboratoryPanel
          title="Advertisement"
          className="flex h-full w-[148px] shrink-0 flex-col"
        >
          <div className="flex h-full flex-col gap-10">
            <div className="rounded-2xl border border-cyan-400/15 bg-gradient-to-b from-cyan-500/10 via-slate-900/85 to-violet-500/10 px-3 py-3 shadow-[0_0_18px_rgba(34,211,238,0.08)]">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/85">
                Boost Your Lab
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
                Sponsored modules engineered for faster uptime and cleaner thermals.
              </p>
            </div>

            {['Premium Cooling', 'NCR Deals', 'Marketplace Featured'].map((banner) => (
              <div
                key={banner}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-violet-100/85">
                  {banner}
                </p>
              </div>
            ))}

            <div className="mt-auto rounded-xl border border-dashed border-cyan-400/18 bg-cyan-400/[0.04] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-cyan-100/80">
              Advertisement stream online
            </div>
          </div>
        </LaboratoryPanel>
      </section>

      <DragOverlay dropAnimation={null}>
        {activeDraggedItem && (
          <div className="z-[9999] scale-110 cursor-grabbing opacity-80 shadow-2xl pointer-events-none">
            <HardwareItem
              id="overlay"
              type={activeDraggedItem.type}
              label={activeDraggedItem.name}
              stats={activeDraggedItem.stats}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
