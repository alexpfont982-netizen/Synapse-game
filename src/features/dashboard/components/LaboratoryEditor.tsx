import { useState, useEffect } from 'react'
import { DndContext, useDroppable, DragOverlay } from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { HardwareSlot } from './HardwareSlot'
import { HardwareItem } from './HardwareItem'
import garageLevelOneHero from '../../../assets/dashboard/garage-level-1.png'
import { supabase } from '../../../supabaseClient'

type ComponentType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
  | 'ROOM_FAN'
  | 'ROOM_EXTRACTOR'

function normalizeHardwareType(type: string): ComponentType {
  if (type === 'FAN') return 'ROOM_FAN'
  if (type === 'EXTRACTOR') return 'ROOM_EXTRACTOR'
  if (type === 'CABLE') return 'CABLE_KIT'
  if (type === 'SSD' || type === 'HDD' || type === 'NVME') return 'STORAGE'
  if (type === 'POWER') return 'POWER_UNIT'

  return type as ComponentType
}

type HardwarePiece = {
  id: string
  type: ComponentType
  label: string
  stats: {
    tflops: number
    power: number
    heat: number
  }
}

type HardwareStats = HardwarePiece['stats']

function generateEmptyRacks() {
  const slots: Record<string, HardwarePiece | null> = {}

  for (let r = 1; r <= 1; r++) {
    slots[`rack${r}-power1`] = null
    slots[`rack${r}-cable-kit1`] = null

    for (let m = 1; m <= 6; m++) {
      slots[`rack${r}-mem${m}`] = null
    }

    for (let s = 1; s <= 2; s++) {
      slots[`rack${r}-storage${s}`] = null
    }

    for (let g = 1; g <= 9; g++) {
      slots[`rack${r}-gpu${g}`] = null
    }
  }

  return slots
}

function InventoryDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'inventory-zone',
    data: { accepts: 'ANY' }
  })

  return (
    <div
      ref={setNodeRef}
      className={`h-full w-80 shrink-0 rounded-2xl border p-5 backdrop-blur-md transition-all overflow-y-auto custom-scrollbar shadow-[0_0_28px_rgba(8,145,178,0.10)] ${isOver
        ? 'bg-slate-800/90 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
        : 'bg-slate-950/80 border-slate-800'
        }`}
    >
      <h2 className="text-white mb-4 font-bold text-xs tracking-[0.2em] text-slate-400">INVENTARIO DISPONIBLE</h2>
      <div className="flex flex-col gap-2.5 min-h-[300px]">
        {children}
      </div>
    </div>
  )
}

export function LaboratoryEditor() {
  const [activeDragType, setActiveDragType] = useState<ComponentType | null>(null)
  const [activeDraggedItem, setActiveDraggedItem] = useState<HardwarePiece | null>(null)
  const [inventory, setInventory] = useState<HardwarePiece[]>([])
  const [rackSlots, setRackSlots] = useState<Record<string, HardwarePiece | null>>(generateEmptyRacks())
  const [selectedRackId, setSelectedRackId] = useState(1)
  const [roomSlots, setRoomSlots] = useState<Record<string, HardwarePiece | null>>({
    'room-top-fan': null,
    'room-bottom-fan': null,
    'room-top-extractor': null,
    'room-bottom-extractor': null,
  })
  const rackAccess = [
    {
      id: 1,
      label: 'Rack 01',
      status: 'EMPTY',
      unlocked: true,
      price: 0,
    },
    {
      id: 2,
      label: 'Rack 02',
      status: 'LOCKED',
      unlocked: false,
      price: 2500,
    },
    {
      id: 3,
      label: 'Rack 03',
      status: 'LOCKED',
      unlocked: false,
      price: 7500,
    },
    {
      id: 4,
      label: 'Rack 04',
      status: 'LOCKED',
      unlocked: false,
      price: 18000,
    },
  ]

  useEffect(() => {
    async function fetchHardware() {
      const { data, error } = await supabase.from('user_hardware').select('*');
      if (error) return;

      if (data) {
        const slots = generateEmptyRacks()

        const roomSlotState: Record<string, HardwarePiece | null> = {
          'room-top-fan': null,
          'room-bottom-fan': null,
          'room-top-extractor': null,
          'room-bottom-extractor': null,
        }

        const inventoryItems: HardwarePiece[] = []

        data.forEach(item => {
          const hardwareItem: HardwarePiece = {
            id: item.id,
            type: normalizeHardwareType(item.type),
            label: item.name,
            stats: (item.stats as HardwareStats | null) ?? {
              tflops: 0,
              power: 0,
              heat: 0,
            },
          }

          if (!item.slot_id) {
            inventoryItems.push(hardwareItem)
            return
          }

          if (Object.prototype.hasOwnProperty.call(roomSlotState, item.slot_id)) {
            roomSlotState[item.slot_id] = hardwareItem
            return
          }

          if (Object.prototype.hasOwnProperty.call(slots, item.slot_id)) {
            slots[item.slot_id] = hardwareItem
          }
        })

        setRackSlots(slots)
        setRoomSlots(roomSlotState)
        setInventory(inventoryItems)
      }
    }
    fetchHardware();
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const activeData = event.active.data.current as { type: ComponentType } | undefined
    setActiveDragType(activeData?.type ?? null)

    const activeId = event.active.id as string

    const item =
      inventory.find(i => i.id === activeId) ||
      Object.values(rackSlots).find(i => i?.id === activeId) ||
      Object.values(roomSlots).find(i => i?.id === activeId)

    if (item) {
      setActiveDraggedItem(item)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragType(null)
    setActiveDraggedItem(null)

    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const acceptedType = (over.data.current as { accepts?: ComponentType } | undefined)?.accepts

    const draggedItem =
      inventory.find(i => i.id === activeId) ||
      Object.values(rackSlots).find(i => i?.id === activeId) ||
      Object.values(roomSlots).find(i => i?.id === activeId)

    if (!draggedItem) return

    const sourceRackSlotId = Object.keys(rackSlots).find(
      slotId => rackSlots[slotId]?.id === activeId
    )

    const sourceRoomSlotId = Object.keys(roomSlots).find(
      slotId => roomSlots[slotId]?.id === activeId
    )

    const isRackSlot = Object.prototype.hasOwnProperty.call(rackSlots, overId)
    const isRoomSlot = Object.prototype.hasOwnProperty.call(roomSlots, overId)

    if (overId === 'inventory-zone') {
      if (sourceRackSlotId) {
        setRackSlots(prev => ({ ...prev, [sourceRackSlotId]: null }))
      }

      if (sourceRoomSlotId) {
        setRoomSlots(prev => ({ ...prev, [sourceRoomSlotId]: null }))
      }

      if (sourceRackSlotId || sourceRoomSlotId) {
        setInventory(prev => {
          const alreadyExists = prev.some(item => item.id === draggedItem.id)
          return alreadyExists ? prev : [...prev, draggedItem]
        })

        await supabase
          .from('user_hardware')
          .update({ slot_id: null })
          .eq('id', activeId)
      }

      return
    }

    if (draggedItem.type !== acceptedType) return

    if (isRoomSlot) {
      if (roomSlots[overId]) return

      if (sourceRackSlotId) {
        setRackSlots(prev => ({ ...prev, [sourceRackSlotId]: null }))
      }

      if (sourceRoomSlotId) {
        setRoomSlots(prev => ({ ...prev, [sourceRoomSlotId]: null }))
      }

      if (!sourceRackSlotId && !sourceRoomSlotId) {
        setInventory(prev => prev.filter(i => i.id !== activeId))
      }

      setRoomSlots(prev => {
        const cleanedSlots = Object.fromEntries(
          Object.entries(prev).map(([slotId, item]) => [
            slotId,
            item?.id === activeId ? null : item,
          ])
        ) as Record<string, HardwarePiece | null>

        return {
          ...cleanedSlots,
          [overId]: draggedItem,
        }
      })

      await supabase
        .from('user_hardware')
        .update({ slot_id: overId })
        .eq('id', activeId)

      return
    }

    if (isRackSlot) {
      if (rackSlots[overId]) return

      if (sourceRackSlotId) {
        setRackSlots(prev => ({ ...prev, [sourceRackSlotId]: null }))
      }

      if (sourceRoomSlotId) {
        setRoomSlots(prev => ({ ...prev, [sourceRoomSlotId]: null }))
      }

      if (!sourceRackSlotId && !sourceRoomSlotId) {
        setInventory(prev => prev.filter(i => i.id !== activeId))
      }

      setRackSlots(prev => {
        const cleanedSlots = Object.fromEntries(
          Object.entries(prev).map(([slotId, item]) => [
            slotId,
            item?.id === activeId ? null : item,
          ])
        ) as Record<string, HardwarePiece | null>

        return {
          ...cleanedSlots,
          [overId]: draggedItem,
        }
      })

      await supabase
        .from('user_hardware')
        .update({ slot_id: overId })
        .eq('id', activeId)
    }
  }
  const renderRackSelector = () => {
    return (
      <div className="relative z-20 mb-4 flex items-center justify-center gap-3">
        {rackAccess.map((rack) => {
          const isSelected = selectedRackId === rack.id

          return (
            <button
              key={rack.id}
              type="button"
              disabled={!rack.unlocked}
              onClick={() => {
                if (rack.unlocked) setSelectedRackId(rack.id)
              }}
              className={`min-w-[120px] rounded-xl border px-4 py-3 text-left transition-all ${isSelected
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

              <p className={`mt-2 text-[9px] font-bold uppercase tracking-[0.18em] ${rack.unlocked ? 'text-cyan-300/70' : 'text-slate-500'
                }`}>
                {rack.unlocked ? rack.status : `${rack.price.toLocaleString()} NCR`}
              </p>
            </button>
          )
        })}
      </div>
    )
  }

  const renderRoomInfrastructure = () => {
    const renderRoomItem = (slotId: string) => {
      const piece = roomSlots[slotId]

      return piece ? (
        <HardwareItem
          id={piece.id}
          type={piece.type}
          label={piece.label}
          stats={piece.stats}
        />
      ) : null
    }

    return (

      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="pointer-events-auto absolute left-10 top-[150px] w-[150px] rounded-xl border border-cyan-400/20 bg-slate-950/70 p-2 shadow-[0_0_18px_rgba(8,145,178,0.10)]">
          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300/70">
            Room Fan — Top
          </div>

          <HardwareSlot
            id="room-top-fan"
            accepts="ROOM_FAN"
            activeDragType={activeDragType}
          >
            {renderRoomItem('room-top-fan')}
          </HardwareSlot>
        </div>

        <div className="pointer-events-auto absolute right-[380px] top-[150px] w-[170px] rounded-xl border border-orange-400/20 bg-slate-950/70 p-2 shadow-[0_0_18px_rgba(251,146,60,0.10)]">
          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-orange-300/70">
            Extractor — Top
          </div>

          <HardwareSlot
            id="room-top-extractor"
            accepts="ROOM_EXTRACTOR"
            activeDragType={activeDragType}
          >
            {renderRoomItem('room-top-extractor')}
          </HardwareSlot>
        </div>

        <div className="pointer-events-auto absolute left-10 bottom-10 w-[150px] rounded-xl border border-cyan-400/20 bg-slate-950/70 p-2 shadow-[0_0_18px_rgba(8,145,178,0.10)]">
          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300/70">
            Room Fan — Bottom
          </div>

          <HardwareSlot
            id="room-bottom-fan"
            accepts="ROOM_FAN"
            activeDragType={activeDragType}
          >
            {renderRoomItem('room-bottom-fan')}
          </HardwareSlot>
        </div>

        <div className="pointer-events-auto absolute right-[380px] bottom-10 w-[170px] rounded-xl border border-orange-400/20 bg-slate-950/70 p-2 shadow-[0_0_18px_rgba(251,146,60,0.10)]">
          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-orange-300/70">
            Extractor — Bottom
          </div>

          <HardwareSlot
            id="room-bottom-extractor"
            accepts="ROOM_EXTRACTOR"
            activeDragType={activeDragType}
          >
            {renderRoomItem('room-bottom-extractor')}
          </HardwareSlot>
        </div>
      </div>
    )
  }
  const renderRack = (rackId: number) => {
    const renderItem = (slotId: string) => {
      const piece = rackSlots[slotId]

      return piece ? (
        <HardwareItem
          id={piece.id}
          type={piece.type}
          label={piece.label}
          stats={piece.stats}
        />
      ) : null
    }

    return (
      <div
        key={`rack-${rackId}`}
        className="relative flex min-h-[600px] w-[540px] max-w-[540px] shrink-0 flex-col gap-5 overflow-hidden rounded-[26px] border border-cyan-400/20 bg-black/40 p-6 shadow-[0_0_38px_rgba(8,145,178,0.18)] backdrop-blur-xl"
      >
        {/* PHYSICAL RACK FRAME */}
        <div className="pointer-events-none absolute inset-0 rounded-[26px] border border-white/5" />

        <div className="pointer-events-none absolute left-0 top-0 h-full w-5 bg-gradient-to-b from-slate-700/30 via-slate-900/40 to-slate-700/30" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-5 bg-gradient-to-b from-slate-700/30 via-slate-900/40 to-slate-700/30" />

        <div className="pointer-events-none absolute left-6 right-6 top-4 h-2 rounded-full bg-slate-700/40 shadow-[0_0_18px_rgba(8,145,178,0.18)]" />
        <div className="pointer-events-none absolute bottom-4 left-6 right-6 h-2 rounded-full bg-slate-700/40 shadow-[0_0_18px_rgba(8,145,178,0.18)]" />

        <div className="pointer-events-none absolute left-8 top-8 h-1.5 w-1.5 rounded-full bg-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
        <div className="pointer-events-none absolute right-8 top-8 h-1.5 w-1.5 rounded-full bg-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
        <div className="pointer-events-none absolute left-8 bottom-8 h-1.5 w-1.5 rounded-full bg-cyan-400/30" />
        <div className="pointer-events-none absolute right-8 bottom-8 h-1.5 w-1.5 rounded-full bg-cyan-400/30" />

        <div className="absolute left-1/2 top-14 bottom-8 w-[2px] bg-gradient-to-b from-cyan-500/20 via-cyan-500/40 to-cyan-500/20 -translate-x-1/2 pointer-events-none z-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]" />

        <h2 className="relative z-10 text-white text-center font-black text-[10px] tracking-[0.3em] text-slate-500 mb-2 uppercase">
          Core Node 0{rackId}
        </h2>

        {/* CORE INFRASTRUCTURE */}
        <div className="grid grid-cols-2 gap-3 z-10">
          <HardwareSlot
            id={`rack${rackId}-power1`}
            accepts="POWER_UNIT"
            activeDragType={activeDragType}
          >
            {renderItem(`rack${rackId}-power1`)}
          </HardwareSlot>

          <HardwareSlot
            id={`rack${rackId}-cable-kit1`}
            accepts="CABLE_KIT"
            activeDragType={activeDragType}
          >
            {renderItem(`rack${rackId}-cable-kit1`)}
          </HardwareSlot>
        </div>

        {/* MEMORY BANK */}
        <div className="flex flex-col gap-2 bg-black/40 p-3 rounded-xl border border-slate-800/50 z-10 shadow-inner">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-purple-300/70">
            Memory Bank
          </p>

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <HardwareSlot
                key={`rack${rackId}-mem${i + 1}`}
                id={`rack${rackId}-mem${i + 1}`}
                accepts="MEMORY"
                activeDragType={activeDragType}
              >
                {renderItem(`rack${rackId}-mem${i + 1}`)}
              </HardwareSlot>
            ))}
          </div>
        </div>

        {/* STORAGE BAY */}
        <div className="flex flex-col gap-2 bg-black/40 p-3 rounded-xl border border-slate-800/50 z-10 shadow-inner">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-emerald-300/70">
            Storage Bay
          </p>

          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <HardwareSlot
                key={`rack${rackId}-storage${i + 1}`}
                id={`rack${rackId}-storage${i + 1}`}
                accepts="STORAGE"
                activeDragType={activeDragType}
              >
                {renderItem(`rack${rackId}-storage${i + 1}`)}
              </HardwareSlot>
            ))}
          </div>
        </div>

        {/* GPU ARRAY */}
        <div className="flex flex-col gap-2 bg-black/40 p-3 rounded-xl border border-slate-800/50 z-10 shadow-inner">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300/70">
            GPU Array
          </p>

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <HardwareSlot
                key={`rack${rackId}-gpu${i + 1}`}
                id={`rack${rackId}-gpu${i + 1}`}
                accepts="GPU"
                activeDragType={activeDragType}
              >
                {renderItem(`rack${rackId}-gpu${i + 1}`)}
              </HardwareSlot>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

      <section className="relative z-10 w-full min-w-0 rounded-[32px] border border-cyan-400/20 bg-slate-950/80 p-3 h-[calc(100vh-120px)] min-h-[600px] shadow-[0_0_40px_rgba(8,145,178,0.12)] backdrop-blur-xl">
        <div className="relative h-full overflow-hidden rounded-[28px] border border-white/5 bg-slate-950">
          <img src={garageLevelOneHero} className="absolute inset-0 h-full w-full object-cover opacity-5 pointer-events-none" alt="bg" />
          {renderRoomInfrastructure()}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/95 to-slate-950/80 pointer-events-none"></div>

          <div className="absolute inset-0 z-10 flex items-start gap-6 p-6">
            <div className="flex flex-1 flex-col overflow-hidden">
              {renderRackSelector()}

              <div className="flex flex-1 items-start justify-center overflow-x-auto overflow-y-auto custom-scrollbar px-2 pb-6 pt-6">
                {renderRack(selectedRackId)}
              </div>
            </div>

            <InventoryDropZone>
              {inventory.map(item => (
                <HardwareItem key={item.id} id={item.id} type={item.type} label={item.label} stats={item.stats} />
              ))}
            </InventoryDropZone>
          </div>
        </div>
      </section>

      {/* DRAG OVERLAY COMPLETAMENTE CORREGIDO AQUÍ */}
      <DragOverlay dropAnimation={null}>
        {activeDraggedItem && (
          <div className="z-[9999] opacity-80 scale-110 shadow-2xl cursor-grabbing pointer-events-none">
            <HardwareItem
              id="overlay"
              type={activeDraggedItem.type}
              label={activeDraggedItem.label}
              stats={activeDraggedItem.stats}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
