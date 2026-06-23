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
  item_id:      string
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

// PLAYER_ID fijo eliminado — ahora cada función recibe el userId real
// del usuario autenticado (session.id desde App.tsx → DashboardPage → aquí)

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

async function fetchPlayerState(userId: string): Promise<{ balance: number; inventory: MockPlayerInventoryItem[] }> {
  try {
    const { data: economy } = await supabase
      .from('user_economy')
      .select('ncr_balance')
      .eq('id', userId)
      .single()

    const { data: hardware, error: hwError } = await supabase
      .from('user_hardware')
      .select('id, item_id, condition, price, purchased_at, slot_id, name, type')
      .eq('owner_id', userId)

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

export function useMockPlayerState(userId: string | null | undefined) {
  const [balance,   setBalance]   = useState(0)
  const [inventory, setInventory] = useState<MockPlayerInventoryItem[]>([])
  const [loading,   setLoading]   = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setBalance(0)
      setInventory([])
      setLoading(false)
      return
    }
    const state = await fetchPlayerState(userId)
    setBalance(state.balance)
    setInventory(state.inventory)
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  return { balance, inventory, loading, refresh }
}

// ── selectMockHardwarePieces ──────────────────────────────────────

export function selectMockHardwarePieces(
  inventory: MockPlayerInventoryItem[],
): MockHardwarePiece[] {
  return inventory.map(item => ({
    id:           item.inventory_id,
    item_id:      item.item_id, 
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

export async function purchaseStoreItem(
  userId: string,
  product: {
    item_id:    string
    brand:      string
    model:      string
    category:   StoreProductCategory
    condition:  StoreItemCondition
    price:      number
    image_path: string
    image:      string
  },
): Promise<PurchaseResult> {
  const { data: economy } = await supabase
    .from('user_economy')
    .select('ncr_balance')
    .eq('id', userId)
    .single()

  if (!economy || Number(economy.ncr_balance) < product.price) {
    return { ok: false, reason: 'insufficient_balance' }
  }

  const { error: balanceError } = await supabase
    .from('user_economy')
    .update({ ncr_balance: Number(economy.ncr_balance) - product.price })
    .eq('id', userId)

  if (balanceError) return { ok: false, reason: 'error' }

  const { data: newRow, error: insertError } = await supabase
    .from('user_hardware')
    .insert({
      owner_id:     userId,
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
      .then(({ data, error }) => {
        if (error) { console.error('useRackBuffs error:', error); return }
        setBuffs(data ?? [])
      })
  }, [JSON.stringify([...installedItemIds].sort())])

  return {
    buffs,
    activeBoosts:    buffs.filter(b => b.effect_type === 'boost'),
    activePenalties: buffs.filter(b => b.effect_type === 'penalty'),
  }
}

// ── useConditionalEffects ───────────────────────────────────────────

// Tipos exportados para usar en RackStatusPanel
export type ConditionalEffect = {
  id: number
  item_id: string
  effect_type: 'boost' | 'penalty'
  effect_label: string
  stat_affected: 'stability' | 'temperature' | 'ai_output' | 'efficiency'
  numeric_value: number
  condition_stat: 'temperature' | 'power_load' | 'stability' | 'always'
  condition_op: 'lt' | 'lte' | 'gt' | 'gte' | 'always'
  condition_value: number | null
  description: string
  // Runtime: si la condición está activa ahora
  active: boolean
}

// Stats actuales del rack necesarios para evaluar condiciones
export type RackRuntimeStats = {
  temperature: number   // °C neto del rack
  power_load: number    // W totales
  stability: number     // % calculado
}

// Evalúa si una condición se cumple dados los stats actuales
function evaluateCondition(
  effect: Omit<ConditionalEffect, 'active'>,
  stats: RackRuntimeStats,
): boolean {
  if (effect.condition_op === 'always') return true
  if (effect.condition_value === null) return false

  const current = stats[effect.condition_stat as keyof RackRuntimeStats] ?? 0
  const threshold = effect.condition_value

  switch (effect.condition_op) {
    case 'gt':  return current >  threshold
    case 'gte': return current >= threshold
    case 'lt':  return current <  threshold
    case 'lte': return current <= threshold
    default:    return false
  }
}

// Hook: carga efectos condicionales de las piezas instaladas y los evalúa
export function useConditionalEffects(
  installedItemIds: string[],
  rackStats: RackRuntimeStats,
) {
  const [effects, setEffects] = useState<ConditionalEffect[]>([])

  useEffect(() => {
    if (installedItemIds.length === 0) { setEffects([]); return }

    supabase
      .from('component_conditional_effects')
      .select('*')
      .in('item_id', installedItemIds)
      .then(({ data, error }) => {
        if (error) { console.error('useConditionalEffects error:', error); return }

        const evaluated: ConditionalEffect[] = (data ?? []).map(row => ({
          id:              row.id,
          item_id:         row.item_id,
          effect_type:     row.effect_type,
          effect_label:    row.effect_label,
          stat_affected:   row.stat_affected,
          numeric_value:   Number(row.numeric_value),
          condition_stat:  row.condition_stat,
          condition_op:    row.condition_op,
          condition_value: row.condition_value !== null ? Number(row.condition_value) : null,
          description:     row.description,
          active:          evaluateCondition(row, rackStats),
        }))

        setEffects(evaluated)
      })
  }, [
    // Re-evalúa si cambian las piezas O si los stats cruzan un umbral
    JSON.stringify([...installedItemIds].sort()),
    // Discretizamos los stats para no re-renderizar en cada décima de grado
    Math.floor(rackStats.temperature / 5),
    Math.floor(rackStats.power_load / 50),
    Math.floor(rackStats.stability / 5),
  ])

  return {
    allEffects:        effects,
    activeEffects:     effects.filter(e => e.active),
    inactiveEffects:   effects.filter(e => !e.active),
    activeBoosts:      effects.filter(e => e.active && e.effect_type === 'boost'),
    activePenalties:   effects.filter(e => e.active && e.effect_type === 'penalty'),
    // Útil para mostrar "potenciales" en el panel
    potentialPenalties: effects.filter(e => !e.active && e.effect_type === 'penalty'),
    potentialBoosts:    effects.filter(e => !e.active && e.effect_type === 'boost'),
  }
}

// ── useRackTFlops ─────────────────────────────────────────────────
// Hook que calcula los TFLOPS efectivos de UN rack usando el motor
// iterativo (rackComputeEngine). A diferencia de useConditionalEffects
// (que evalúa contra los stats YA calculados externamente), este hook
// resuelve el sistema en cascada completo: parte de los stats base del
// hardware instalado y converge iterando los efectos condicionales.

import {
  computeRackTFlops,
  type RackPieceForCompute,
  type RawConditionalEffect,
  type RackComputeResult,
} from '../features/dashboard/utils/rackComputeEngine'

function pieceToComputeInput(piece: MockHardwarePiece): RackPieceForCompute {
  const s = piece.stats as unknown as Record<string, number> | undefined
  const stabilityFallback =
    piece.condition === 'New' ? 100 : piece.condition === 'Rebuilt' ? 88 : 74

  return {
    item_id: piece.item_id,
    type: piece.type,
    base_ai_output: piece.type === 'GPU' ? (s?.['ai_output'] ?? 0) : 0,
    base_power: s?.power ?? 0,
    base_heat: piece.type === 'COOLING'
      ? -(Math.abs(s?.heat ?? 0))
      : (s?.['temperature_c'] ?? s?.heat ?? 0),
    base_stability: s?.['stability'] ?? stabilityFallback,
  }
}

// Combo entre piezas tal como lo devuelve useRackBuffs (component_interactions)
type RackBuffEntry = {
  item_a: string
  item_b: string
  effect_type: string
  effect_value: string
  description: string
}

export function useRackTFlops(
  installedPieces: MockHardwarePiece[],
  combos: RackBuffEntry[] = [],
) {
  const [result, setResult] = useState<RackComputeResult | null>(null)

  const installedItemIds = installedPieces.map((p) => p.item_id)
  const itemIdsKey = JSON.stringify([...installedItemIds].sort())
  const combosKey = JSON.stringify(
    combos.map((c) => `${c.item_a}-${c.item_b}-${c.effect_value}`).sort(),
  )

  useEffect(() => {
    if (installedPieces.length === 0) {
      setResult(null)
      return
    }

    supabase
      .from('component_conditional_effects')
      .select('*')
      .in('item_id', installedItemIds)
      .then(({ data, error }) => {
        if (error) { console.error('useRackTFlops error:', error); return }

        const effects: RawConditionalEffect[] = (data ?? []).map((row) => ({
          id:              row.id,
          item_id:         row.item_id,
          effect_type:     row.effect_type,
          stat_affected:   row.stat_affected,
          numeric_value:   Number(row.numeric_value),
          condition_stat:  row.condition_stat,
          condition_op:    row.condition_op,
          condition_value: row.condition_value !== null ? Number(row.condition_value) : null,
        }))

        const pieces = installedPieces.map(pieceToComputeInput)
        const comboEffects = combos.map((c) => ({
          item_a: c.item_a,
          item_b: c.item_b,
          effect_type: c.effect_type as 'boost' | 'penalty',
          effect_value: c.effect_value,
        }))
        const computed = computeRackTFlops(pieces, effects, comboEffects)
        setResult(computed)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIdsKey, combosKey])

  return result
}

// ── usePlayerEnergy ───────────────────────────────────────────────
// Lee la energía REAL del jugador desde player_energy (tabla actualizada
// por el cron job process_energy_cycle cada 15 min en el servidor).
// Solo lectura desde el cliente — la escritura es exclusiva del backend.

export interface PlayerEnergy {
  currentWh: number
  maxWh: number
  lastCycleAt: string
}

export function usePlayerEnergy(userId: string | null | undefined) {
  const [energy, setEnergy] = useState<PlayerEnergy | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setEnergy(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('player_energy')
      .select('current_wh, max_wh, last_cycle_at')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('usePlayerEnergy error:', error)
      setLoading(false)
      return
    }

    if (data) {
      setEnergy({
        currentWh:   Number(data.current_wh),
        maxWh:       Number(data.max_wh),
        lastCycleAt: data.last_cycle_at,
      })
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  // Refresco automático cada 15 minutos, sincronizado con el ciclo del
  // cron job (process_energy_cycle) que corre en el servidor. Así el
  // jugador ve su energía actualizada sin necesidad de recargar la página.
  useEffect(() => {
    if (!userId) return
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
    const intervalId = setInterval(() => {
      refresh()
    }, FIFTEEN_MINUTES_MS)
    return () => clearInterval(intervalId)
  }, [userId, refresh])

  return { energy, loading, refresh }
}

// ── Sistema de Baterías ──────────────────────────────────────────
// Catálogo de baterías disponibles en el Store + inventario del
// jugador (compradas pero no usadas) + acción de usar una batería.

export interface BatteryCatalogItem {
  itemId: string
  name: string
  whAmount: number
  price: number
  description: string
}

export interface UserBattery {
  id: string
  itemId: string
  whAmount: number
  source: 'store' | 'minigame'
  acquiredAt: string
  usedAt: string | null
}

// Catálogo: lectura pública, no depende del usuario
export function useBatteryCatalog() {
  const [catalog, setCatalog] = useState<BatteryCatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('battery_catalog')
      .select('item_id, name, wh_amount, price, description')
      .order('wh_amount', { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error('useBatteryCatalog error:', error); setLoading(false); return }
        setCatalog(
          (data ?? []).map((row) => ({
            itemId: row.item_id,
            name: row.name,
            whAmount: Number(row.wh_amount),
            price: row.price,
            description: row.description ?? '',
          })),
        )
        setLoading(false)
      })
  }, [])

  return { catalog, loading }
}

// Inventario de baterías SIN usar del jugador
export function useUserBatteries(userId: string | null | undefined) {
  const [batteries, setBatteries] = useState<UserBattery[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setBatteries([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('user_batteries')
      .select('id, item_id, wh_amount, source, acquired_at, used_at')
      .eq('owner_id', userId)
      .is('used_at', null)
      .order('acquired_at', { ascending: false })

    if (error) { console.error('useUserBatteries error:', error); setLoading(false); return }

    setBatteries(
      (data ?? []).map((row) => ({
        id: row.id,
        itemId: row.item_id,
        whAmount: Number(row.wh_amount),
        source: row.source,
        acquiredAt: row.acquired_at,
        usedAt: row.used_at,
      })),
    )
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  return { batteries, loading, refresh }
}

// Comprar una batería: descuenta NCR del balance, inserta en user_batteries
export async function purchaseBattery(
  userId: string,
  battery: BatteryCatalogItem,
): Promise<{ ok: true } | { ok: false; reason: 'insufficient_balance' | 'error' }> {
  const { data: economy } = await supabase
    .from('user_economy')
    .select('ncr_balance')
    .eq('id', userId)
    .single()

  if (!economy || Number(economy.ncr_balance) < battery.price) {
    return { ok: false, reason: 'insufficient_balance' }
  }

  const { error: balanceError } = await supabase
    .from('user_economy')
    .update({ ncr_balance: Number(economy.ncr_balance) - battery.price })
    .eq('id', userId)

  if (balanceError) return { ok: false, reason: 'error' }

  const { error: insertError } = await supabase
    .from('user_batteries')
    .insert({
      owner_id:  userId,
      item_id:   battery.itemId,
      wh_amount: battery.whAmount,
      source:    'store',
    })

  if (insertError) return { ok: false, reason: 'error' }

  return { ok: true }
}

// Usar una batería: llama a la función segura use_battery() en Supabase,
// que valida propiedad, evita doble uso, y aplica el tope duro de energía.
export interface UseBatteryResult {
  success: boolean
  message: string
  newCurrentWh: number | null
  whAdded: number | null
  whWasted: number | null
}

export async function useBattery(batteryId: string): Promise<UseBatteryResult> {
  const { data, error } = await supabase
    .rpc('use_battery', { p_battery_id: batteryId })
    .single()

  if (error || !data) {
    console.error('useBattery error:', error)
    return { success: false, message: 'Network error', newCurrentWh: null, whAdded: null, whWasted: null }
  }

  const row = data as {
    success: boolean
    message: string
    new_current_wh: number | null
    wh_added: number | null
    wh_wasted: number | null
  }

  return {
    success: row.success,
    message: row.message,
    newCurrentWh: row.new_current_wh !== null ? Number(row.new_current_wh) : null,
    whAdded: row.wh_added !== null ? Number(row.wh_added) : null,
    whWasted: row.wh_wasted !== null ? Number(row.wh_wasted) : null,
  }
}

// ── Sistema de distribución de pools ─────────────────────────────

export interface PoolAllocation {
  pctNcr:  number
  pctBtc:  number
  pctEth:  number
  pctDoge: number
  pctPol:  number
  pctBnb:  number
  lastChangedAt: string
}

export interface ChangeAllocationResult {
  success: boolean
  message: string
  nextChangeAllowedAt: string | null
}

// Lee la distribución actual del jugador desde Supabase
export function usePoolAllocation(userId: string | null | undefined) {
  const [allocation, setAllocation] = useState<PoolAllocation | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) { setAllocation(null); setLoading(false); return }

    const { data, error } = await supabase
      .from('player_pool_allocation')
      .select('pct_ncr, pct_btc, pct_eth, pct_doge, pct_pol, pct_bnb, last_changed_at')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      // Si no existe aún, defaults: 100% NCR
      setAllocation({ pctNcr: 100, pctBtc: 0, pctEth: 0, pctDoge: 0, pctPol: 0, pctBnb: 0, lastChangedAt: new Date().toISOString() })
      setLoading(false)
      return
    }

    setAllocation({
      pctNcr:        Number(data.pct_ncr),
      pctBtc:        Number(data.pct_btc),
      pctEth:        Number(data.pct_eth),
      pctDoge:       Number(data.pct_doge),
      pctPol:        Number(data.pct_pol),
      pctBnb:        Number(data.pct_bnb),
      lastChangedAt: data.last_changed_at,
    })
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  return { allocation, loading, refresh }
}

// Llama a la función segura change_pool_allocation() en Supabase
export async function changePoolAllocation(
  pctNcr: number, pctBtc: number, pctEth: number,
  pctDoge: number, pctPol: number, pctBnb: number,
): Promise<ChangeAllocationResult> {
  const { data, error } = await supabase
    .rpc('change_pool_allocation', {
      p_pct_ncr:  pctNcr,
      p_pct_btc:  pctBtc,
      p_pct_eth:  pctEth,
      p_pct_doge: pctDoge,
      p_pct_pol:  pctPol,
      p_pct_bnb:  pctBnb,
    })
    .single()

  if (error || !data) {
    return { success: false, message: 'Network error', nextChangeAllowedAt: null }
  }

  const row = data as {
    success: boolean
    message: string
    next_change_allowed_at: string | null
  }

  return {
    success:             row.success,
    message:             row.message,
    nextChangeAllowedAt: row.next_change_allowed_at,
  }
}

// ── Precios de cripto desde CoinGecko ──────────────────────────────
// Consulta CoinGecko desde el navegador y actualiza crypto_prices en
// Supabase. Se llama al abrir WalletPage para tener precios frescos.

export interface CryptoPrices {
  BTC:  number
  ETH:  number
  DOGE: number
  POL:  number
  BNB:  number
  NCR:  number
  USDT: number
}

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price' +
  '?ids=bitcoin,ethereum,dogecoin,matic-network,binancecoin' +
  '&vs_currencies=usd'

export async function fetchAndUpdateCryptoPrices(): Promise<CryptoPrices | null> {
  try {
    const res = await fetch(COINGECKO_URL)
    if (!res.ok) return null

    const data = await res.json()

    const prices: CryptoPrices = {
      BTC:  data.bitcoin?.usd          ?? 0,
      ETH:  data.ethereum?.usd         ?? 0,
      DOGE: data.dogecoin?.usd         ?? 0,
      POL:  data['matic-network']?.usd ?? 0,
      BNB:  data.binancecoin?.usd      ?? 0,
      NCR:  1,
      USDT: 1,
    }

    // Actualiza crypto_prices en Supabase para que todos los jugadores
    // vean precios frescos (el que abre primero la wallet actualiza para todos)
    const updates = (
      ['BTC', 'ETH', 'DOGE', 'POL', 'BNB'] as const
    ).map((c) => ({
      crypto:       c,
      usd_price:    prices[c],
      price_source: 'coingecko',
      updated_at:   new Date().toISOString(),
    }))

    await supabase
      .from('crypto_prices')
      .upsert(updates, { onConflict: 'crypto' })

    return prices
  } catch {
    return null
  }
}

// Hook que lee crypto_prices de Supabase y refresca desde CoinGecko
export function useCryptoPrices() {
  const [prices, setPrices] = useState<CryptoPrices | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Primero carga desde Supabase (rápido, precios guardados)
    supabase
      .from('crypto_prices')
      .select('crypto, usd_price')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const p: Partial<CryptoPrices> = {}
          data.forEach((row) => {
            const key = row.crypto as keyof CryptoPrices
            p[key] = Number(row.usd_price)
          })
          setPrices(p as CryptoPrices)
        }
        setLoading(false)
      })

    // Luego refresca desde CoinGecko en background
    fetchAndUpdateCryptoPrices().then((fresh) => {
      if (fresh) setPrices(fresh)
    })
  }, [])

  return { prices, loading }
}