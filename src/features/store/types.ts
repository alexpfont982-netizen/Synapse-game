export type StoreProductCondition =
  | 'New'
  | 'Used'
  | 'Conserved'
  | 'Repowered'
  | 'Reconstructed'
  | 'Rebuilt'

export type StoreProductCategory =
  | 'power_supply'
  | 'power_cable'
  | 'memory'
  | 'storage'

export interface StoreProductStats {
  efficiency: string
  thermalProfile: string
  railStability: string
  protection?: string
}

export interface StoreProduct {
  id: string
  category: StoreProductCategory
  name: string
  brand: string
  condition: StoreProductCondition
  power: number
  price: number
  image: string
  stats: StoreProductStats
}
