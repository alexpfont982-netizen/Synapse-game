import { useSyncExternalStore } from 'react'
import { garageInventory } from './garageInventory'
import type {
  GarageInventoryItem,
  StoreItemCondition,
  StoreProductCategory,
} from '../types/store'

export type MockHardwareType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
  | 'COOLING'
  | 'ROOM_FAN'
  | 'ROOM_EXTRACTOR'

export type MockHardwareStats = {
  tflops: number
  power: number
  heat: number
}

export type MockPlayerInventoryItem = {
  inventory_id: string
  item_id: string
  brand: string
  model: string
  category: StoreProductCategory
  condition: StoreItemCondition
  price: number
  image_path: string
  image: string
  purchased_at: string
  slot_id: string | null
}

export type MockHardwarePiece = {
  id: string
  type: MockHardwareType
  name: string
  brand: string
  model: string
  category: StoreProductCategory
  condition: StoreItemCondition
  price: number
  inventory_id: string
  slot_id: string | null
  image_path: string
  image: string
  stats: MockHardwareStats
}

type MockPlayerState = {
  balance: number
  inventory: MockPlayerInventoryItem[]
}

type LegacyMockStoreInventoryItem = Omit<
  MockPlayerInventoryItem,
  'inventory_id' | 'image_path' | 'image' | 'slot_id'
> & {
  image_path?: string
  image?: string
}

type PurchaseResult =
  | {
      ok: true
      entry: MockPlayerInventoryItem
      state: MockPlayerState
    }
  | {
      ok: false
      reason: 'insufficient_balance'
      state: MockPlayerState
    }

const MOCK_PLAYER_STATE_KEY = 'synapse-player-mock-state-v1'
const LEGACY_STORE_BALANCE_KEY = 'synapse-store-mock-balance'
const LEGACY_STORE_INVENTORY_KEY = 'synapse-store-mock-inventory'
const DEFAULT_MOCK_BALANCE = 20_000
const DEFAULT_MOCK_PLAYER_STATE: MockPlayerState = {
  balance: DEFAULT_MOCK_BALANCE,
  inventory: [],
}

const inventoryCatalogByItemId = new Map(
  garageInventory.map((product) => [product.item_id, product] as const),
)
const VALID_RACK_SLOT_IDS = new Set<string>(
  [
    'rack1-power1',
    'rack1-power2',
    'rack1-cable-kit1',
    'rack1-cable-kit2',
    'rack1-cooling1',
    'rack1-cooling2',
    'rack1-storage1',
    'rack1-storage2',
    'rack1-mem1',
    'rack1-mem2',
    'rack1-mem3',
    'rack1-mem4',
    'rack1-mem5',
    'rack1-mem6',
    'rack1-gpu1',
    'rack1-gpu2',
    'rack1-gpu3',
    'rack1-gpu4',
    'rack1-gpu5',
    'rack1-gpu6',
  ],
)

const listeners = new Set<() => void>()
let cachedState: MockPlayerState | null = null

function normalizeLegacySlotId(slotId: string) {
  const memorySlotMatch = slotId.match(/^(rack\d+)-(?:memory|mem)-?(\d+)$/)

  if (memorySlotMatch) {
    const [, rackId, slotNumber] = memorySlotMatch

    return `${rackId}-mem${slotNumber}`
  }

  return slotId
}

function normalizeSlotId(slotId: string | null | undefined) {
  if (!slotId) {
    return null
  }

  const normalizedSlotId = normalizeLegacySlotId(slotId)

  return VALID_RACK_SLOT_IDS.has(normalizedSlotId) ? normalizedSlotId : null
}

function normalizeMockPlayerInventoryItem(
  value: unknown,
): MockPlayerInventoryItem | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const item = value as Partial<MockPlayerInventoryItem>
  const product = typeof item.item_id === 'string'
    ? inventoryCatalogByItemId.get(item.item_id)
    : undefined

  if (
    !(
      typeof item.inventory_id === 'string' &&
      typeof item.item_id === 'string' &&
      typeof item.brand === 'string' &&
      typeof item.model === 'string' &&
      typeof item.category === 'string' &&
      typeof item.condition === 'string' &&
      typeof item.price === 'number' &&
      typeof item.purchased_at === 'string' &&
      (typeof item.slot_id === 'string' || item.slot_id === null)
    )
  ) {
    return null
  }

  return {
    inventory_id: item.inventory_id,
    item_id: item.item_id,
    brand: item.brand,
    model: item.model,
    category: item.category as StoreProductCategory,
    condition: item.condition as StoreItemCondition,
    price: item.price,
    image_path:
      typeof item.image_path === 'string'
        ? item.image_path
        : product?.image_path ?? '',
    image:
      typeof item.image === 'string'
        ? item.image
        : product?.image ?? '',
    purchased_at: item.purchased_at,
    slot_id: normalizeSlotId(item.slot_id),
  }
}

function sanitizeMockPlayerState(value: unknown): MockPlayerState {
  if (!value || typeof value !== 'object') {
    return DEFAULT_MOCK_PLAYER_STATE
  }

  const candidate = value as Partial<MockPlayerState>
  const parsedBalance =
    typeof candidate.balance === 'number' && Number.isFinite(candidate.balance)
      ? candidate.balance
      : DEFAULT_MOCK_BALANCE

  const parsedInventory = Array.isArray(candidate.inventory)
    ? candidate.inventory.flatMap((item) => {
        const normalizedItem = normalizeMockPlayerInventoryItem(item)

        return normalizedItem ? [normalizedItem] : []
      })
    : []

  return {
    balance: Math.max(0, parsedBalance),
    inventory: parsedInventory,
  }
}

function isLegacyMockStoreInventoryItem(
  value: unknown,
): value is LegacyMockStoreInventoryItem {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Partial<LegacyMockStoreInventoryItem>

  return (
    typeof item.item_id === 'string' &&
    typeof item.brand === 'string' &&
    typeof item.model === 'string' &&
    typeof item.category === 'string' &&
    typeof item.condition === 'string' &&
    typeof item.price === 'number' &&
    typeof item.purchased_at === 'string'
  )
}

function readLegacyMockPlayerState() {
  if (typeof window === 'undefined') {
    return DEFAULT_MOCK_PLAYER_STATE
  }

  try {
    const storedBalance = window.localStorage.getItem(LEGACY_STORE_BALANCE_KEY)
    const storedInventory = window.localStorage.getItem(LEGACY_STORE_INVENTORY_KEY)
    const parsedBalance = storedBalance === null ? Number.NaN : Number(storedBalance)

    if (!storedBalance && !storedInventory) {
      return DEFAULT_MOCK_PLAYER_STATE
    }

    const legacyInventory: unknown = storedInventory
      ? JSON.parse(storedInventory)
      : []

    const inventory = Array.isArray(legacyInventory)
      ? legacyInventory
          .filter(isLegacyMockStoreInventoryItem)
          .map((item) => ({
            inventory_id: createInventoryId(),
            item_id: item.item_id,
            brand: item.brand,
            model: item.model,
            category: item.category,
            condition: item.condition,
            price: item.price,
            image_path:
              item.image_path ??
              inventoryCatalogByItemId.get(item.item_id)?.image_path ??
              '',
            image:
              item.image ??
              inventoryCatalogByItemId.get(item.item_id)?.image ??
              '',
            purchased_at: item.purchased_at,
            slot_id: null,
          }))
      : []

    return {
      balance:
        Number.isFinite(parsedBalance) && parsedBalance >= 0
          ? parsedBalance
          : DEFAULT_MOCK_BALANCE,
      inventory,
    }
  } catch {
    return DEFAULT_MOCK_PLAYER_STATE
  }
}

function readStoredMockPlayerState() {
  if (typeof window === 'undefined') {
    return DEFAULT_MOCK_PLAYER_STATE
  }

  try {
    const storedState = window.localStorage.getItem(MOCK_PLAYER_STATE_KEY)

    if (!storedState) {
      const migratedState = readLegacyMockPlayerState()

      if (
        migratedState.balance !== DEFAULT_MOCK_BALANCE ||
        migratedState.inventory.length > 0
      ) {
        writeStoredMockPlayerState(migratedState)
      }

      return migratedState
    }

    return sanitizeMockPlayerState(JSON.parse(storedState) as unknown)
  } catch {
    return readLegacyMockPlayerState()
  }
}

function writeStoredMockPlayerState(state: MockPlayerState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(MOCK_PLAYER_STATE_KEY, JSON.stringify(state))
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

function getSnapshot() {
  if (!cachedState) {
    cachedState = readStoredMockPlayerState()
  }

  return cachedState
}

function getServerSnapshot() {
  return DEFAULT_MOCK_PLAYER_STATE
}

function setState(
  updater: (currentState: MockPlayerState) => MockPlayerState,
): MockPlayerState {
  const currentState = getSnapshot()
  const nextState = updater(currentState)

  if (nextState === currentState) {
    return currentState
  }

  cachedState = nextState
  writeStoredMockPlayerState(nextState)
  emitChange()

  return nextState
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  if (typeof window === 'undefined') {
    return () => {
      listeners.delete(listener)
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== MOCK_PLAYER_STATE_KEY) {
      return
    }

    cachedState = readStoredMockPlayerState()
    listener()
  }

  window.addEventListener('storage', handleStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}

function createInventoryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `inventory_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function parseSignedNumber(value: string) {
  const match = value.match(/-?\d+/)

  return match ? Number(match[0]) : 0
}

function getStoreDisplayName(product: GarageInventoryItem) {
  if (product.category === 'power_supply') {
    return `${product.brand} ${product.power_w}`
  }

  return `${product.brand} ${product.model}`
}

function getHardwareType(
  category: StoreProductCategory,
): MockHardwareType {
  switch (category) {
    case 'power_supply':
      return 'POWER_UNIT'
    case 'power_cable':
      return 'CABLE_KIT'
    case 'cooling':
      return 'COOLING'
    case 'memory':
      return 'MEMORY'
    case 'storage':
      return 'STORAGE'
    case 'gpu':
      return 'GPU'
  }
}

function getHardwareStats(product: GarageInventoryItem): MockHardwareStats {
  switch (product.category) {
    case 'power_supply':
      return {
        tflops: 0,
        power: product.avg_consumption_w,
        heat: Math.max(0, product.temperature_c - 20),
      }
    case 'power_cable':
      return {
        tflops: 0,
        power: 0,
        heat: 0,
      }
    case 'memory':
      return {
        tflops: 0,
        power: 0,
        heat: Math.max(0, product.temperature_c - 18),
      }
    case 'storage':
      return {
        tflops: 0,
        power: 0,
        heat: Math.max(0, product.temperature_c - 18),
      }
    case 'gpu':
      return {
        tflops: Math.max(0.1, product.ai_output / 10),
        power: product.power_consumption_w,
        heat: Math.max(0, product.temperature_c - 18),
      }
    case 'cooling':
      return {
        tflops: 0,
        power: 0,
        heat: -Math.abs(parseSignedNumber(product.temperature_reduction)),
      }
  }
}

export function useMockPlayerState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function purchaseStoreItem(
  product: GarageInventoryItem,
): PurchaseResult {
  let createdEntry: MockPlayerInventoryItem | null = null

  const nextState = setState((currentState) => {
    if (currentState.balance < product.price) {
      return currentState
    }

    createdEntry = {
      inventory_id: createInventoryId(),
      item_id: product.item_id,
      brand: product.brand,
      model: product.model,
      category: product.category,
      condition: product.condition,
      price: product.price,
      image_path: product.image_path,
      image: product.image,
      purchased_at: new Date().toISOString(),
      slot_id: null,
    }

    return {
      balance: currentState.balance - product.price,
      inventory: [...currentState.inventory, createdEntry],
    }
  })

  if (!createdEntry) {
    return {
      ok: false,
      reason: 'insufficient_balance',
      state: nextState,
    }
  }

  return {
    ok: true,
    entry: createdEntry,
    state: nextState,
  }
}

export function updateInventoryItemSlot(
  inventoryId: string,
  slotId: string | null,
) {
  return setState((currentState) => ({
    ...currentState,
    inventory: currentState.inventory.map((item) =>
      item.inventory_id === inventoryId
        ? { ...item, slot_id: normalizeSlotId(slotId) }
        : item,
    ),
  }))
}

export function selectMockHardwarePieces(
  inventory: MockPlayerInventoryItem[],
) {
  return inventory.flatMap((item) => {
    const product = inventoryCatalogByItemId.get(item.item_id)

    if (!product) {
      return []
    }

    return [
      {
        id: item.inventory_id,
        type: getHardwareType(item.category),
        name: getStoreDisplayName(product),
        brand: item.brand,
        model: item.model,
        category: item.category,
        condition: item.condition,
        price: item.price,
        inventory_id: item.inventory_id,
        slot_id: item.slot_id,
        image_path: item.image_path || product.image_path,
        image: item.image || product.image,
        stats: getHardwareStats(product),
      },
    ] satisfies MockHardwarePiece[]
  })
}
