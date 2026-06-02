import type { MarketplaceRule, StoreProductCategory } from '../types/store'

export const marketplaceRules: MarketplaceRule[] = [
  {
    rule_id: 'market_rule_001',
    rule_type: 'daily_operation_limit',
    target: 'user',
    value: 30,
    description:
      'Each user can perform up to 30 marketplace or component operations per day.',
  },
  {
    rule_id: 'market_rule_002',
    rule_type: 'operation_counted',
    target: 'store_purchase',
    value: true,
    description:
      'Buying any component from the Store counts as one daily operation.',
  },
  {
    rule_id: 'market_rule_003',
    rule_type: 'operation_counted',
    target: 'marketplace_purchase',
    value: true,
    description:
      'Buying any component from the player marketplace counts as one daily operation.',
  },
  {
    rule_id: 'market_rule_004',
    rule_type: 'operation_counted',
    target: 'marketplace_listing',
    value: true,
    description: 'Listing a component for sale counts as one daily operation.',
  },
  {
    rule_id: 'market_rule_005',
    rule_type: 'operation_counted',
    target: 'component_install',
    value: true,
    description:
      'Installing a component into a rack counts as one daily operation.',
  },
  {
    rule_id: 'market_rule_006',
    rule_type: 'operation_counted',
    target: 'component_remove',
    value: true,
    description:
      'Removing a component from a rack counts as one daily operation.',
  },
  {
    rule_id: 'market_rule_007',
    rule_type: 'operation_counted',
    target: 'component_repair',
    value: true,
    description:
      'Repairing or rebuilding a component counts as one daily operation.',
  },
  {
    rule_id: 'market_rule_008',
    rule_type: 'inventory_purchase_limit',
    target: 'gpu',
    value: 'unlimited',
    description:
      'Users can buy unlimited GPUs for inventory storage, but installed rack limits still apply.',
  },
  {
    rule_id: 'market_rule_009',
    rule_type: 'inventory_purchase_limit',
    target: 'memory',
    value: 'unlimited',
    description:
      'Users can buy unlimited memory modules for inventory storage, but installed rack limits still apply.',
  },
  {
    rule_id: 'market_rule_010',
    rule_type: 'inventory_purchase_limit',
    target: 'storage',
    value: 'unlimited',
    description:
      'Users can buy unlimited storage units for inventory storage, but installed rack limits still apply.',
  },
  {
    rule_id: 'market_rule_011',
    rule_type: 'inventory_purchase_limit',
    target: 'power_supply',
    value: 'unlimited',
    description:
      'Users can buy unlimited power supplies for inventory storage, but installed rack limits still apply.',
  },
  {
    rule_id: 'market_rule_012',
    rule_type: 'inventory_purchase_limit',
    target: 'power_cable',
    value: 'unlimited',
    description:
      'Users can buy unlimited power cables for inventory storage, but installed rack limits still apply.',
  },
  {
    rule_id: 'market_rule_013',
    rule_type: 'inventory_purchase_limit',
    target: 'cooling',
    value: 'unlimited',
    description:
      'Users can buy unlimited cooling components for inventory storage, but installed rack limits still apply.',
  },
  {
    rule_id: 'market_rule_014',
    rule_type: 'install_limit',
    target: 'gpu_per_rack',
    value: 9,
    description: 'Each Garage rack can install up to 9 GPUs.',
  },
  {
    rule_id: 'market_rule_015',
    rule_type: 'install_limit',
    target: 'memory_per_rack',
    value: 6,
    description: 'Each Garage rack can install up to 6 memory modules.',
  },
  {
    rule_id: 'market_rule_016',
    rule_type: 'install_limit',
    target: 'storage_per_rack',
    value: 2,
    description: 'Each Garage rack can install up to 2 storage units.',
  },
  {
    rule_id: 'market_rule_017',
    rule_type: 'install_limit',
    target: 'power_supply_per_rack',
    value: 2,
    description: 'Each Garage rack can install up to 2 power supplies.',
  },
  {
    rule_id: 'market_rule_018',
    rule_type: 'install_limit',
    target: 'power_cable_per_rack',
    value: 2,
    description: 'Each Garage rack can install up to 2 power cables.',
  },
  {
    rule_id: 'market_rule_019',
    rule_type: 'install_limit',
    target: 'cooling_per_rack',
    value: 2,
    description: 'Each Garage rack can install up to 2 cooling components.',
  },
  {
    rule_id: 'market_rule_020',
    rule_type: 'marketplace_access_requirement',
    target: 'completed_games',
    value: 10000,
    description:
      'User unlocks marketplace access after completing 10,000 games.',
  },
  {
    rule_id: 'market_rule_021',
    rule_type: 'marketplace_access_requirement',
    target: 'bridge_amount',
    value: '100_USDT',
    description:
      'User unlocks marketplace access after bridging 100 USDT into the game currency.',
  },
  {
    rule_id: 'market_rule_022',
    rule_type: 'bridge_limit_override',
    target: 'user',
    value: false,
    description:
      'Bridging funds does not bypass daily operation limits or rack installation limits.',
  },
  {
    rule_id: 'market_rule_023',
    rule_type: 'player_sales_allowed',
    target: 'new_items',
    value: false,
    description: 'Players cannot list items as New in the marketplace.',
  },
  {
    rule_id: 'market_rule_024',
    rule_type: 'resale_condition_downgrade',
    target: 'new',
    value: 'rebuilt',
    description: 'New items sold by players are listed as Rebuilt.',
  },
  {
    rule_id: 'market_rule_025',
    rule_type: 'resale_condition_downgrade',
    target: 'rebuilt',
    value: 'used',
    description: 'Rebuilt items sold by players are listed as Used.',
  },
  {
    rule_id: 'market_rule_026',
    rule_type: 'resale_condition_downgrade',
    target: 'used',
    value: 'used',
    description: 'Used items remain Used when sold by players.',
  },
  {
    rule_id: 'market_rule_027',
    rule_type: 'max_seller_revenue',
    target: 'marketplace_sale',
    value: '50%_of_store_used_price',
    description:
      'Seller cannot receive more than 50% of the Store Used price for the item.',
  },
  {
    rule_id: 'market_rule_028',
    rule_type: 'seller_fee',
    target: 'marketplace_sale',
    value: '5%',
    description:
      'Seller pays a 5% marketplace fee deducted from the payout.',
  },
  {
    rule_id: 'market_rule_029',
    rule_type: 'buyer_fee',
    target: 'marketplace_purchase',
    value: '3%',
    description: 'Buyer pays a 3% marketplace fee added to the purchase price.',
  },
  {
    rule_id: 'market_rule_030',
    rule_type: 'marketplace_fee_destination',
    target: 'system',
    value: 'burn_or_treasury',
    description:
      'Marketplace fees can be burned or routed to the game treasury depending on economy settings.',
  },
  {
    rule_id: 'market_rule_031',
    rule_type: 'transfer_wear',
    target: 'rebuilt_item_transfer',
    value: '-3% stability',
    description:
      'Rebuilt items receive additional stability wear when transferred between users.',
  },
  {
    rule_id: 'market_rule_032',
    rule_type: 'transfer_wear',
    target: 'used_item_transfer',
    value: '-5% stability',
    description:
      'Used items receive additional stability wear when transferred between users.',
  },
  {
    rule_id: 'market_rule_033',
    rule_type: 'transfer_heat_penalty',
    target: 'rebuilt_item_transfer',
    value: '+1C',
    description:
      'Rebuilt items gain a small heat penalty after each owner transfer.',
  },
  {
    rule_id: 'market_rule_034',
    rule_type: 'transfer_heat_penalty',
    target: 'used_item_transfer',
    value: '+2C',
    description:
      'Used items gain an extra heat penalty after each owner transfer.',
  },
  {
    rule_id: 'market_rule_035',
    rule_type: 'transfer_count_tracking',
    target: 'hardware_components',
    value: 'enabled',
    description:
      'Every ownership transfer must be recorded in the component history.',
  },
  {
    rule_id: 'market_rule_036',
    rule_type: 'max_transfer_count_warning',
    target: 'hardware_components',
    value: 3,
    description:
      'After 3 ownership transfers, the item should show a high-wear warning.',
  },
  {
    rule_id: 'market_rule_037',
    rule_type: 'high_wear_penalty',
    target: 'transfer_count_3_plus',
    value: '-10% stability',
    description:
      'Items transferred 3 or more times receive a stronger stability penalty.',
  },
  {
    rule_id: 'market_rule_038',
    rule_type: 'marketplace_supply_type',
    target: 'listings',
    value: 'player_generated',
    description:
      'Marketplace listings depend on items listed by players, not infinite Store stock.',
  },
  {
    rule_id: 'market_rule_039',
    rule_type: 'warranty_allowed',
    target: 'new_store_items',
    value: true,
    description:
      'Only New items purchased directly from the Store can display a gold Warranty label.',
  },
  {
    rule_id: 'market_rule_040',
    rule_type: 'warranty_allowed',
    target: 'marketplace_items',
    value: false,
    description:
      'Marketplace items must not display a Warranty label.',
  },
  {
    rule_id: 'market_rule_041',
    rule_type: 'rarity_enabled',
    target: 'garage_level_1',
    value: false,
    description: 'Garage Level 1 does not use rarity labels.',
  },
  {
    rule_id: 'market_rule_042',
    rule_type: 'component_install_required',
    target: 'all_components',
    value: true,
    description:
      'Purchased components must be installed in the rack to affect performance.',
  },
  {
    rule_id: 'market_rule_043',
    rule_type: 'negative_price_allowed',
    target: 'marketplace_listing',
    value: false,
    description: 'Marketplace listings cannot have negative prices.',
  },
  {
    rule_id: 'market_rule_044',
    rule_type: 'free_listing_allowed',
    target: 'marketplace_listing',
    value: false,
    description: 'Marketplace listings cannot be posted for free.',
  },
  {
    rule_id: 'market_rule_045',
    rule_type: 'boost_requires_installation',
    target: 'component_interactions',
    value: true,
    description:
      'Component boosts apply only when both components are installed in the same active rack.',
  },
]

export const dailyOperationLimit = 30

export const rackInstallLimits: Record<StoreProductCategory, number> = {
  power_supply: 2,
  power_cable: 2,
  memory: 6,
  storage: 2,
  gpu: 9,
  cooling: 2,
}
