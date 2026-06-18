/**
 * supabasePlayerState.ts — versión simplificada sin real-time
 * Drop-in replacement para mockPlayerState.ts
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { garageInventory } from './garageInventory'

const _imageMap = new Map(
  garageInventory.map(item => [item.item_id, item.image] as const)
)
import type { StoreItemCondition, StoreProductCategory } from '../types/store'

// ── Tipos ─────────────────────────────────────────────────────────

export type MockHardwareType =
  | 'GPU' | 'MEMORY' | 'STORAGE' | 'POWER_UNIT'
  | 'CABLE_KIT' | 'COOLING' | 'ROOM_FAN' | 'ROOM_EXTRACTOR'

export type MockHardwareStats = {
  // Legacy (rack status engine)
  tflops: number
  power:  number
  heat:   number
  // Compartidas
  stability?:     number
  temperature_c?: number
  failure_risk?:  number
  boost?:         string
  penalty?:       string
  // PSU
  power_w?:           number
  avg_consumption_w?: number
  performance?:       number
  // GPU
  ai_output?:           number
  vram_gb?:             number
  power_consumption_w?: number
  // Memory
  processing_speed?: number
  capacity_gb?:      number
  memory_type?:      string
  // Storage
  read_speed?:   number
  storage_type?: string
 capacity?:     number
  // Cable
  stability_bonus?:   number
  power_support?:     string
  cable_type?:        string
  temperature_bonus?: string
  // Cooling
  cooling_power?:         number
  temperature_reduction?: string
  cooling_type?:          string
  noise_level?:           string
}

export type MockPlayerInventoryItem = {
  inventory_id: string
  item_id:      string
  brand:        string
  model:        string
  category:     StoreProductCategory
  condition:    StoreItemCondition
  price:        number
  image_path:   string
  image:        string
  purchased_at: string
  slot_id:      string | null
  _catalogStats?: Record<string, unknown>
}

export type MockHardwarePiece = {
  id:           string
  type:         MockHardwareType
  name:         string
  brand:        string
  model:        string
  category:     StoreProductCategory
  condition:    StoreItemCondition
  price:        number
  inventory_id: string
  slot_id:      string | null
  image_path:   string
  image:        string
  stats:        MockHardwareStats
}

type PurchaseResult =
  | { ok: true;  entry: MockPlayerInventoryItem }
  | { ok: false; reason: 'insufficient_balance' | 'error' }

const PLAYER_ID = 'player-1'

// ── Helpers ───────────────────────────────────────────────────────

function parseSignedNumber(value: string): number {
  const match = value.match(/-?\d+/)
  return match ? Number(match[0]) : 0
}

function getHardwareType(category: StoreProductCategory): MockHardwareType {
  switch (category) {
    case 'power_supply': return 'POWER_UNIT'
    case 'power_cable':  return 'CABLE_KIT'
    case 'cooling':      return 'COOLING'
    case 'memory':       return 'MEMORY'
    case 'storage':      return 'STORAGE'
    case 'gpu':          return 'GPU'
  }
}

// Lee los stats directamente del campo stats (JSONB) de Supabase
// junto con boost y penalty que son columnas separadas
function getStatsFromCatalog(
  catalogStats: Record<string, unknown>,
  category: StoreProductCategory,
): MockHardwareStats {
  const s = catalogStats

  const n = (key: string) => s[key] !== undefined ? Number(s[key]) : undefined
  const str = (key: string) => s[key] !== undefined ? String(s[key]) : undefined

  switch (category) {
    case 'power_supply':
      return {
        tflops: 0,
        power:  n('avg_consumption_w') ?? 0,
        heat:   Math.max(0, (n('temperature_c') ?? 20) - 20),
        stability:         n('stability'),
        temperature_c:     n('temperature_c'),
        failure_risk:      n('failure_risk'),
        boost:             str('boost'),
        penalty:           str('penalty'),
        power_w:           n('power_w'),
        avg_consumption_w: n('avg_consumption_w'),
        performance:       n('performance'),
      }
    case 'gpu':
      return {
        tflops: Math.max(0.1, (n('ai_output') ?? 0) / 10),
        power:  n('power_consumption_w') ?? 0,
        heat:   Math.max(0, (n('temperature_c') ?? 18) - 18),
        stability:           n('stability'),
        temperature_c:       n('temperature_c'),
        failure_risk:        n('failure_risk'),
        boost:               str('boost'),
        penalty:             str('penalty'),
        ai_output:           n('ai_output'),
        vram_gb:             n('vram_gb'),
        power_consumption_w: n('power_consumption_w'),
      }
    case 'memory':
      return {
        tflops: 0,
        power:  0,
        heat:   Math.max(0, (n('temperature_c') ?? 18) - 18),
        stability:        n('stability'),
        temperature_c:    n('temperature_c'),
        failure_risk:     n('failure_risk'),
        boost:            str('boost'),
        penalty:          str('penalty'),
        processing_speed: n('processing_speed'),
        capacity_gb:      n('capacity_gb'),
        memory_type:      str('memory_type'),
      }
    case 'storage':
      return {
        tflops: 0,
        power:  0,
        heat:   Math.max(0, (n('temperature_c') ?? 18) - 18),
        stability:     n('stability'),
        temperature_c: n('temperature_c'),
        failure_risk:  n('failure_risk'),
        boost:         str('boost'),
        penalty:       str('penalty'),
        read_speed:    n('read_speed'),
        storage_type:  str('storage_type'),
        capacity:      s['capacity'] !== undefined ? parseSignedNumber(String(s['capacity'])) : undefined,
      }
    case 'power_cable':
      return {
        tflops: 0,
        power:  0,
        heat:   0,
        boost:            str('boost'),
        penalty:          str('penalty'),
        stability_bonus:  n('stability_bonus'),
        power_support:    str('power_support'),
        cable_type:       str('cable_type'),
        temperature_bonus: str('temperature_bonus'),
      }
    case 'cooling':
      return {
        tflops: 0,
        power:  0,
        heat:   -Math.abs(parseSignedNumber(str('temperature_reduction') ?? '-0')),
        boost:                str('boost'),
        penalty:              str('penalty'),
        cooling_power:        n('cooling_power'),
        temperature_reduction: str('temperature_reduction'),
        cooling_type:         str('cooling_type'),
        noise_level:          str('noise_level'),
        stability_bonus:      n('stability_bonus'),
      }
    default:
      return { tflops: 0, power: 0, heat: 0 }
  }
}

// ── Carga el estado desde Supabase ────────────────────────────────

async function fetchPlayerState(): Promise<{ balance: number; inventory: MockPlayerInventoryItem[] }> {
  try {
    const { data: economy } = await supabase
      .from('user_economy')
      .select('ncr_balance')
      .eq('id', PLAYER_ID)
      .single()

    const { data: hardware, error: hwError } = await supabase
      .from('user_hardware')
      .select('id, item_id, condition, price, purchased_at, slot_id, name, type')
      .eq('owner_id', PLAYER_ID)

    if (hwError) {
      console.error('Error cargando user_hardware:', hwError)
      return { balance: Number(economy?.ncr_balance ?? 0), inventory: [] }
    }

    const rows = (hardware ?? []) as Record<string, unknown>[]
    const itemIds = rows.map(r => r.item_id).filter(Boolean) as string[]

    if (itemIds.length === 0) {
      return { balance: Number(economy?.ncr_balance ?? 0), inventory: [] }
    }

    // Solo pedimos las columnas que realmente existen en la tabla
    const { data: catalog } = await supabase
      .from('components_catalog')
      .select('item_id, brand, model, category, condition, price, image_path, stats, boost, penalty')
      .in('item_id', itemIds)

    const catalogMap = new Map(
      ((catalog ?? []) as Record<string, unknown>[]).map(c => [c.item_id as string, c])
    )

    const inventory: MockPlayerInventoryItem[] = rows
      .map(row => {
        const cat = catalogMap.get(row.item_id as string)
        if (!cat) return null

        // Las stats vienen del campo JSONB 'stats' + boost y penalty como columnas separadas
        const catalogStats: Record<string, unknown> = {
          ...((cat.stats as Record<string, unknown>) ?? {}),
          boost:   cat.boost,
          penalty: cat.penalty,
        }

        return {
          inventory_id:  String(row.id),
          item_id:       String(row.item_id),
          brand:         String(cat.brand ?? ''),
          model:         String(cat.model ?? ''),
          category:      cat.category as StoreProductCategory,
          condition:     (row.condition ?? cat.condition ?? 'Used') as StoreItemCondition,
          price:         Number(row.price ?? cat.price ?? 0),
          image_path:    String(cat.image_path ?? ''),
          image:         _imageMap.get(String(row.item_id)) ?? String(cat.image_path ?? ''),
          purchased_at:  String(row.purchased_at ?? new Date().toISOString()),
          slot_id:       typeof row.slot_id === 'string' ? row.slot_id : null,
          _catalogStats: catalogStats,
        } satisfies MockPlayerInventoryItem
      })
      .filter(Boolean) as MockPlayerInventoryItem[]

    return { balance: Number(economy?.ncr_balance ?? 0), inventory }
  } catch (err) {
    console.error('Error en fetchPlayerState:', err)
    return { balance: 0, inventory: [] }
  }
}

// ── useMockPlayerState ────────────────────────────────────────────

export function useMockPlayerState() {
  const [balance,   setBalance]   = useState(0)
  const [inventory, setInventory] = useState<MockPlayerInventoryItem[]>([])
  const [loading,   setLoading]   = useState(true)

  const refresh = useCallback(async () => {
    const state = await fetchPlayerState()
    setBalance(state.balance)
    setInventory(state.inventory)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { balance, inventory, loading, refresh }
}

// ── selectMockHardwarePieces ──────────────────────────────────────

export function selectMockHardwarePieces(
  inventory: MockPlayerInventoryItem[],
): MockHardwarePiece[] {
  return inventory.map(item => ({
    id:           item.inventory_id,
    type:         getHardwareType(item.category),
    name:         `${item.brand} ${item.model}`.trim(),
    brand:        item.brand,
    model:        item.model,
    category:     item.category,
    condition:    item.condition,
    price:        item.price,
    inventory_id: item.inventory_id,
    slot_id:      item.slot_id,
    image_path:   item.image_path,
    image:        item.image,
    stats:        getStatsFromCatalog(item._catalogStats ?? {}, item.category),
  }))
}

// ── purchaseStoreItem ─────────────────────────────────────────────

export async function purchaseStoreItem(product: {
  item_id:    string
  brand:      string
  model:      string
  category:   StoreProductCategory
  condition:  StoreItemCondition
  price:      number
  image_path: string
  image:      string
}): Promise<PurchaseResult> {
  const { data: economy } = await supabase
    .from('user_economy')
    .select('ncr_balance')
    .eq('id', PLAYER_ID)
    .single()

  if (!economy || Number(economy.ncr_balance) < product.price) {
    return { ok: false, reason: 'insufficient_balance' }
  }

  const { error: balanceError } = await supabase
    .from('user_economy')
    .update({ ncr_balance: Number(economy.ncr_balance) - product.price })
    .eq('id', PLAYER_ID)

  if (balanceError) return { ok: false, reason: 'error' }

  const { data: newRow, error: insertError } = await supabase
    .from('user_hardware')
    .insert({
      owner_id:     PLAYER_ID,
      item_id:      product.item_id,
      name:         `${product.brand} ${product.model}`,
      type:         getHardwareType(product.category),
      condition:    product.condition,
      price:        product.price,
      purchased_at: new Date().toISOString(),
      slot_id:      null,
    })
    .select('id, item_id, condition, price, purchased_at, slot_id')
    .single()

  if (insertError || !newRow) return { ok: false, reason: 'error' }

  const row = newRow as Record<string, unknown>

  const entry: MockPlayerInventoryItem = {
    inventory_id:  String(row.id),
    item_id:       product.item_id,
    brand:         product.brand,
    model:         product.model,
    category:      product.category,
    condition:      product.condition,
    price:         product.price,
    image_path:    product.image_path,
    image:         product.image,
    purchased_at:  String(row.purchased_at),
    slot_id:       null,
    _catalogStats: {},
  }

  return { ok: true, entry }
}

// ── updateInventoryItemSlot ───────────────────────────────────────

export async function updateInventoryItemSlot(
  inventoryId: string,
  slotId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('user_hardware')
    .update({ slot_id: slotId })
    .eq('id', inventoryId)

  if (error) console.error('Error actualizando slot:', error)
}

// ── useRackBuffs ──────────────────────────────────────────────────

export function useRackBuffs(installedItemIds: string[]) {
  const [buffs, setBuffs] = useState<Array<{
    item_a: string; item_b: string
    effect_type: string; effect_value: string; description: string
  }>>([])

  useEffect(() => {
    if (installedItemIds.length < 2) { setBuffs([]); return }

    supabase
      .from('component_interactions')
      .select('item_a, item_b, effect_type, effect_value, description')
      .in('item_a', installedItemIds)
      .in('item_b', installedItemIds)
      .then(({ data }) => setBuffs(data ?? []))
  }, [JSON.stringify([...installedItemIds].sort())])

  return {
    buffs,
    activeBoosts:    buffs.filter(b => b.effect_type === 'boost'),
    activePenalties: buffs.filter(b => b.effect_type === 'penalty'),
  }
}