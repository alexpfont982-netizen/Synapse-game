export type StoreItemCondition = 'New' | 'Used' | 'Rebuilt'

export type StoreProductCategory =
  | 'power_supply'
  | 'power_cable'
  | 'memory'
  | 'storage'
  | 'gpu'
  | 'cooling'

export type StoreTabCategory = 'all_items' | StoreProductCategory

export interface StoreInventoryBase {
  item_id: string
  brand: string
  model: string
  category: StoreProductCategory
  condition: StoreItemCondition
  price: number
  image_path: string
  image: string
  description: string
  boost: string
  penalty: string
}

export interface PowerSupplyProduct extends StoreInventoryBase {
  category: 'power_supply'
  power_w: number
  avg_consumption_w: number
  temperature_c: number
  performance: number
  stability: number
  failure_risk: number
}

export interface PowerCableProduct extends StoreInventoryBase {
  category: 'power_cable'
  cable_type: string
  power_support: string
  stability_bonus: number
  temperature_bonus: string
}

export interface MemoryProduct extends StoreInventoryBase {
  category: 'memory'
  capacity_gb: number
  memory_type: string
  temperature_c: number
  processing_speed: number
  stability: number
  failure_risk: number
}

export interface StorageProduct extends StoreInventoryBase {
  category: 'storage'
  capacity: string
  storage_type: string
  read_speed: number
  temperature_c: number
  stability: number
  failure_risk: number
}

export interface GpuProduct extends StoreInventoryBase {
  category: 'gpu'
  vram_gb: number
  power_consumption_w: number
  temperature_c: number
  ai_output: number
  stability: number
  failure_risk: number
}

export interface CoolingProduct extends StoreInventoryBase {
  category: 'cooling'
  cooling_power: number
  temperature_reduction: string
  stability_bonus: number
  noise_level: string
}

export type GarageInventoryItem =
  | PowerSupplyProduct
  | PowerCableProduct
  | MemoryProduct
  | StorageProduct
  | GpuProduct
  | CoolingProduct

export interface MarketplaceRule {
  rule_id: string
  rule_type: string
  target: string
  value: string | number | boolean
  description: string
}
