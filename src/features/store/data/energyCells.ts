import compactCellImage from '../../../assets/dashboard/components/energy-cells/compact-cell.png'
import powerCellImage from '../../../assets/dashboard/components/energy-cells/power-cell.png'
import reactorCoreImage from '../../../assets/dashboard/components/energy-cells/reactor-core.png'
import type { BatteryCatalogItem } from '../../../data/supabasePlayerState'
import type { StoreItemCondition } from '../../../types/store'

export interface EnergyCellMetric {
  label: string
  value: string
}

export interface EnergyCellStoreProduct extends BatteryCatalogItem {
  category: 'energy_cells'
  brand: string
  condition: StoreItemCondition
  image: string
  description: string
  metrics: EnergyCellMetric[]
  supportMessage: string
}

type EnergyCellBlueprint = {
  itemId: string
  name: string
  price: number
  whAmount: number
  image: string
  description: string
  metrics: EnergyCellMetric[]
}

const ENERGY_CELL_BRAND = 'Synapse Grid'
const ENERGY_CELL_CONDITION: StoreItemCondition = 'New'

const energyCellBlueprints: EnergyCellBlueprint[] = [
  {
    itemId: 'battery_small',
    name: 'Compact Cell',
    price: 600,
    whAmount: 6000,
    image: compactCellImage,
    description:
      'Basic rechargeable energy cell for light garage operations.',
    metrics: [
      { label: 'Energy', value: '+6000 WH' },
      { label: 'Recharge', value: 'Basic' },
      { label: 'Stability', value: '82%' },
      { label: 'Use', value: 'Light' },
    ],
  },
  {
    itemId: 'battery_medium',
    name: 'Power Cell',
    price: 2200,
    whAmount: 22500,
    image: powerCellImage,
    description:
      'Industrial energy module for active mining sessions.',
    metrics: [
      { label: 'Energy', value: '+22500 WH' },
      { label: 'Recharge', value: 'Medium' },
      { label: 'Stability', value: '90%' },
      { label: 'Use', value: 'Active' },
    ],
  },
  {
    itemId: 'battery_large',
    name: 'Reactor Core',
    price: 5000,
    whAmount: 52500,
    image: reactorCoreImage,
    description:
      'Heavy-duty energy reserve for fully loaded garage racks.',
    metrics: [
      { label: 'Energy', value: '+52500 WH' },
      { label: 'Recharge', value: 'Heavy' },
      { label: 'Stability', value: '96%' },
      { label: 'Use', value: 'Full Rack' },
    ],
  },
]

const energyCellBlueprintsById = new Map(
  energyCellBlueprints.map((blueprint) => [blueprint.itemId, blueprint] as const),
)

const fallbackBatteryCatalog: BatteryCatalogItem[] = energyCellBlueprints.map(
  (blueprint) => ({
    itemId: blueprint.itemId,
    name: blueprint.name,
    whAmount: blueprint.whAmount,
    price: blueprint.price,
    description: blueprint.description,
  }),
)

export function buildEnergyCellStoreProducts(
  catalog: BatteryCatalogItem[],
): EnergyCellStoreProduct[] {
  const sourceCatalog = catalog.length > 0 ? catalog : fallbackBatteryCatalog

  return sourceCatalog.flatMap((battery) => {
    const blueprint = energyCellBlueprintsById.get(battery.itemId)
    if (!blueprint) return []

    return [
      {
        ...battery,
        name: blueprint.name,
        price: blueprint.price,
        whAmount: blueprint.whAmount,
        description: blueprint.description,
        category: 'energy_cells' as const,
        brand: ENERGY_CELL_BRAND,
        condition: ENERGY_CELL_CONDITION,
        image: blueprint.image,
        metrics: blueprint.metrics,
        supportMessage:
          'Energy cells recharge your room reserve and do not add rack-state conditional effects.',
      },
    ]
  })
}
