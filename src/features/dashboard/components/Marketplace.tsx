import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';

type ComponentType =
  | 'GPU'
  | 'MEMORY'
  | 'STORAGE'
  | 'POWER_UNIT'
  | 'CABLE_KIT'
  | 'ROOM_FAN'
  | 'ROOM_EXTRACTOR'
  | 'CONSUMABLE';

type ProductCondition = 'USED' | 'REFURBISHED' | 'NEW' | 'CONSUMABLE';
type StoreSection = 'USED_PARTS' | 'REFURBISHED_PARTS' | 'NEW_HARDWARE';
type ProductSubcategory =
  | 'POWER_UNITS'
  | 'CABLE_KITS'
  | 'MEMORY'
  | 'STORAGE'
  | 'GPUS'
  | 'ROOM_FANS'
  | 'EXTRACTORS'
  | 'CONSUMABLES';

type ProductStats = {
  tflops: number;
  power: number;
  heat: number;
};

export type StoreProduct = {
  id: string;
  type: ComponentType;
  name: string;
  brand: string;
  price: number;
  condition: ProductCondition;
  efficiency: number;
  section: StoreSection;
  subcategory: ProductSubcategory;
  hint?: string;
  compatibilityGroup?: string;
  stats: ProductStats;
};

const SECTION_ORDER: StoreSection[] = [
  'USED_PARTS',
  'REFURBISHED_PARTS',
  'NEW_HARDWARE',
];

const SUBCATEGORY_ORDER: ProductSubcategory[] = [
  'POWER_UNITS',
  'CABLE_KITS',
  'MEMORY',
  'STORAGE',
  'GPUS',
  'ROOM_FANS',
  'EXTRACTORS',
  'CONSUMABLES',
];

const SECTION_META: Record<
  StoreSection,
  {
    title: string;
    subtitle: string;
    panelClassName: string;
    accentClassName: string;
  }
> = {
  USED_PARTS: {
    title: 'Used Parts',
    subtitle:
      'Low-cost recovered hardware. Reduced efficiency, but some legacy units respond better to familiar rack setups.',
    panelClassName: 'border-amber-400/20 bg-amber-400/5',
    accentClassName: 'text-amber-300',
  },
  REFURBISHED_PARTS: {
    title: 'Refurbished Parts',
    subtitle:
      'Bench-tested components tuned for reliable mid-tier expansion.',
    panelClassName: 'border-violet-400/20 bg-violet-400/5',
    accentClassName: 'text-violet-300',
  },
  NEW_HARDWARE: {
    title: 'New Hardware',
    subtitle:
      'Factory-grade inventory, premium cooling, and room for future special offers.',
    panelClassName: 'border-cyan-400/20 bg-cyan-400/5',
    accentClassName: 'text-cyan-300',
  },
};

const SUBCATEGORY_LABELS: Record<ProductSubcategory, string> = {
  POWER_UNITS: 'Power Units',
  CABLE_KITS: 'Cable Kits',
  MEMORY: 'Memory',
  STORAGE: 'Storage',
  GPUS: 'GPUs',
  ROOM_FANS: 'Room Fans',
  EXTRACTORS: 'Extractors',
  CONSUMABLES: 'Consumables',
};

const TYPE_LABELS: Record<ComponentType, string> = {
  GPU: 'GPU',
  MEMORY: 'Memory',
  STORAGE: 'Storage',
  POWER_UNIT: 'Power Unit',
  CABLE_KIT: 'Cable Kit',
  ROOM_FAN: 'Room Fan',
  ROOM_EXTRACTOR: 'Extractor',
  CONSUMABLE: 'Consumable',
};

const STORE_PRODUCTS: StoreProduct[] = [
  {
    id: 'used-voltrat-power',
    type: 'POWER_UNIT',
    name: 'VoltRat Power Unit Used',
    brand: 'VoltRat',
    price: 120,
    condition: 'USED',
    efficiency: 0.55,
    section: 'USED_PARTS',
    subcategory: 'POWER_UNITS',
    compatibilityGroup: 'legacy-power-beta',
    hint: 'Used power module. Output stability may vary.',
    stats: { tflops: 0, power: 350, heat: 6 },
  },
  {
    id: 'used-ironcell-power',
    type: 'POWER_UNIT',
    name: 'IronCell Power Unit Used',
    brand: 'IronCell',
    price: 95,
    condition: 'USED',
    efficiency: 0.48,
    section: 'USED_PARTS',
    subcategory: 'POWER_UNITS',
    compatibilityGroup: 'legacy-power-delta',
    hint: 'Recovered power unit from old compute racks.',
    stats: { tflops: 0, power: 300, heat: 7 },
  },
  {
    id: 'used-oldgrid-power',
    type: 'POWER_UNIT',
    name: 'OldGrid Power Unit Used',
    brand: 'OldGrid',
    price: 140,
    condition: 'USED',
    efficiency: 0.6,
    section: 'USED_PARTS',
    subcategory: 'POWER_UNITS',
    compatibilityGroup: 'legacy-power-alpha',
    hint: 'Legacy power unit with uneven but usable output.',
    stats: { tflops: 0, power: 380, heat: 5 },
  },
  {
    id: 'used-connect-tiger-cable',
    type: 'CABLE_KIT',
    name: 'Connect Tiger Cable Used',
    brand: 'Connect Tiger',
    price: 60,
    condition: 'USED',
    efficiency: 0.5,
    section: 'USED_PARTS',
    subcategory: 'CABLE_KITS',
    compatibilityGroup: 'legacy-storage-alpha',
    hint: 'Old bus connector recovered from legacy racks.',
    stats: { tflops: 0, power: 2, heat: 0 },
  },
  {
    id: 'used-copper-link-cable',
    type: 'CABLE_KIT',
    name: 'Copper Link Cable Used',
    brand: 'Copper Link',
    price: 70,
    condition: 'USED',
    efficiency: 0.52,
    section: 'USED_PARTS',
    subcategory: 'CABLE_KITS',
    compatibilityGroup: 'legacy-power-alpha',
    hint: 'Recovered copper bus with inconsistent signal flow.',
    stats: { tflops: 0, power: 3, heat: 0 },
  },
  {
    id: 'used-rustline-bus',
    type: 'CABLE_KIT',
    name: 'RustLine Bus Used',
    brand: 'RustLine',
    price: 45,
    condition: 'USED',
    efficiency: 0.45,
    section: 'USED_PARTS',
    subcategory: 'CABLE_KITS',
    compatibilityGroup: 'legacy-compute-gamma',
    hint: 'Old data bus. Performance may vary under load.',
    stats: { tflops: 0, power: 2, heat: 1 },
  },
  {
    id: 'used-oldbus-16',
    type: 'MEMORY',
    name: 'OldBus 16GB Used',
    brand: 'OldBus',
    price: 55,
    condition: 'USED',
    efficiency: 0.48,
    section: 'USED_PARTS',
    subcategory: 'MEMORY',
    compatibilityGroup: 'legacy-memory-alpha',
    hint: 'Used memory module from retired nodes.',
    stats: { tflops: 0, power: 10, heat: 1 },
  },
  {
    id: 'used-dustram-32',
    type: 'MEMORY',
    name: 'DustRAM 32GB Used',
    brand: 'DustRAM',
    price: 85,
    condition: 'USED',
    efficiency: 0.55,
    section: 'USED_PARTS',
    subcategory: 'MEMORY',
    compatibilityGroup: 'legacy-compute-gamma',
    hint: 'Recovered memory with limited but stable throughput.',
    stats: { tflops: 0, power: 13, heat: 2 },
  },
  {
    id: 'used-legacy-bus-64',
    type: 'MEMORY',
    name: 'Legacy Bus 64GB Used',
    brand: 'Legacy Bus',
    price: 110,
    condition: 'USED',
    efficiency: 0.58,
    section: 'USED_PARTS',
    subcategory: 'MEMORY',
    compatibilityGroup: 'legacy-memory-beta',
    hint: 'Legacy memory bank. Works best in familiar architectures.',
    stats: { tflops: 0, power: 18, heat: 2 },
  },
  {
    id: 'used-data-wolf-ssd',
    type: 'STORAGE',
    name: 'Data Wolf SSD Used',
    brand: 'Data Wolf',
    price: 75,
    condition: 'USED',
    efficiency: 0.5,
    section: 'USED_PARTS',
    subcategory: 'STORAGE',
    compatibilityGroup: 'legacy-storage-alpha',
    hint: 'Legacy storage unit. Performance may vary.',
    stats: { tflops: 0, power: 12, heat: 2 },
  },
  {
    id: 'used-rustdisk-hdd',
    type: 'STORAGE',
    name: 'RustDisk HDD Used',
    brand: 'RustDisk',
    price: 40,
    condition: 'USED',
    efficiency: 0.45,
    section: 'USED_PARTS',
    subcategory: 'STORAGE',
    compatibilityGroup: 'legacy-storage-beta',
    hint: 'Old magnetic drive recovered from abandoned rigs.',
    stats: { tflops: 0, power: 18, heat: 3 },
  },
  {
    id: 'used-oldvault-nvme',
    type: 'STORAGE',
    name: 'OldVault NVMe Used',
    brand: 'OldVault',
    price: 95,
    condition: 'USED',
    efficiency: 0.58,
    section: 'USED_PARTS',
    subcategory: 'STORAGE',
    compatibilityGroup: 'legacy-storage-delta',
    hint: 'Aged NVMe module with unpredictable throughput.',
    stats: { tflops: 0, power: 14, heat: 2 },
  },
  {
    id: 'used-neodust-gpu',
    type: 'GPU',
    name: 'NeoDust GPU Used',
    brand: 'DustCore',
    price: 210,
    condition: 'USED',
    efficiency: 0.5,
    section: 'USED_PARTS',
    subcategory: 'GPUS',
    compatibilityGroup: 'legacy-compute-gamma',
    hint: 'Recovered GPU with limited but usable compute output.',
    stats: { tflops: 5, power: 180, heat: 28 },
  },
  {
    id: 'used-minercore-gpu',
    type: 'GPU',
    name: 'MinerCore GPU Used',
    brand: 'MinerCore',
    price: 260,
    condition: 'USED',
    efficiency: 0.55,
    section: 'USED_PARTS',
    subcategory: 'GPUS',
    compatibilityGroup: 'legacy-compute-beta',
    hint: 'Former mining GPU. Stable enough for basic workloads.',
    stats: { tflops: 6.5, power: 210, heat: 32 },
  },
  {
    id: 'used-rustvector-gpu',
    type: 'GPU',
    name: 'RustVector GPU Used',
    brand: 'RustVector',
    price: 180,
    condition: 'USED',
    efficiency: 0.45,
    section: 'USED_PARTS',
    subcategory: 'GPUS',
    compatibilityGroup: 'legacy-compute-alpha',
    hint: 'Old graphics unit with rough but functional compute output.',
    stats: { tflops: 4, power: 160, heat: 30 },
  },
  {
    id: 'used-silentflow-fan',
    type: 'ROOM_FAN',
    name: 'SilentFlow Fan Used',
    brand: 'Aisicorp',
    price: 70,
    condition: 'USED',
    efficiency: 0.55,
    section: 'USED_PARTS',
    subcategory: 'ROOM_FANS',
    compatibilityGroup: 'legacy-cooling-alpha',
    hint: 'Used fan with reduced airflow.',
    stats: { tflops: 0, power: 10, heat: -6 },
  },
  {
    id: 'used-dustfan-90',
    type: 'ROOM_FAN',
    name: 'DustFan 90mm Used',
    brand: 'DustFan',
    price: 50,
    condition: 'USED',
    efficiency: 0.48,
    section: 'USED_PARTS',
    subcategory: 'ROOM_FANS',
    compatibilityGroup: 'legacy-cooling-beta',
    hint: 'Recovered cooling fan with uneven airflow.',
    stats: { tflops: 0, power: 9, heat: -5 },
  },
  {
    id: 'used-airspin-fan',
    type: 'ROOM_FAN',
    name: 'AirSpin Fan Used',
    brand: 'AirSpin',
    price: 85,
    condition: 'USED',
    efficiency: 0.6,
    section: 'USED_PARTS',
    subcategory: 'ROOM_FANS',
    compatibilityGroup: 'legacy-cooling-delta',
    hint: 'Legacy fan with usable airflow under light load.',
    stats: { tflops: 0, power: 11, heat: -7 },
  },
  {
    id: 'used-oldvent-extractor',
    type: 'ROOM_EXTRACTOR',
    name: 'OldVent Extractor Used',
    brand: 'OldVent',
    price: 90,
    condition: 'USED',
    efficiency: 0.5,
    section: 'USED_PARTS',
    subcategory: 'EXTRACTORS',
    compatibilityGroup: 'legacy-cooling-alpha',
    hint: 'Recovered extractor with modest thermal pull.',
    stats: { tflops: 0, power: 25, heat: -12 },
  },
  {
    id: 'used-rustvortex-extractor',
    type: 'ROOM_EXTRACTOR',
    name: 'RustVortex Extractor Used',
    brand: 'RustVortex',
    price: 110,
    condition: 'USED',
    efficiency: 0.55,
    section: 'USED_PARTS',
    subcategory: 'EXTRACTORS',
    compatibilityGroup: 'legacy-cooling-beta',
    hint: 'Old extractor. Works best in low-density setups.',
    stats: { tflops: 0, power: 30, heat: -14 },
  },
  {
    id: 'used-airpuller-extractor',
    type: 'ROOM_EXTRACTOR',
    name: 'AirPuller Extractor Used',
    brand: 'AirPuller',
    price: 125,
    condition: 'USED',
    efficiency: 0.6,
    section: 'USED_PARTS',
    subcategory: 'EXTRACTORS',
    compatibilityGroup: 'legacy-cooling-delta',
    hint: 'Used extractor with decent airflow recovery.',
    stats: { tflops: 0, power: 32, heat: -15 },
  },
  {
    id: 'refurb-power-grid-unit',
    type: 'POWER_UNIT',
    name: 'Refurbished Power Grid Unit',
    brand: 'VoltGrid',
    price: 220,
    condition: 'REFURBISHED',
    efficiency: 0.75,
    section: 'REFURBISHED_PARTS',
    subcategory: 'POWER_UNITS',
    hint: 'Stable refurbished module.',
    stats: { tflops: 0, power: 430, heat: 4 },
  },
  {
    id: 'refurb-corewatt-unit',
    type: 'POWER_UNIT',
    name: 'Refurbished CoreWatt Unit',
    brand: 'CoreWatt',
    price: 260,
    condition: 'REFURBISHED',
    efficiency: 0.8,
    section: 'REFURBISHED_PARTS',
    subcategory: 'POWER_UNITS',
    hint: 'Bench-tested refurbished component.',
    stats: { tflops: 0, power: 470, heat: 4 },
  },
  {
    id: 'refurb-ampline-unit',
    type: 'POWER_UNIT',
    name: 'Refurbished AmpLine Unit',
    brand: 'AmpLine',
    price: 310,
    condition: 'REFURBISHED',
    efficiency: 0.84,
    section: 'REFURBISHED_PARTS',
    subcategory: 'POWER_UNITS',
    hint: 'Tuned for consistent output.',
    stats: { tflops: 0, power: 520, heat: 3 },
  },
  {
    id: 'refurb-optic-bus',
    type: 'CABLE_KIT',
    name: 'Refurbished Optic Bus',
    brand: 'Optic Works',
    price: 150,
    condition: 'REFURBISHED',
    efficiency: 0.76,
    section: 'REFURBISHED_PARTS',
    subcategory: 'CABLE_KITS',
    hint: 'Bench-tested refurbished component.',
    stats: { tflops: 0, power: 2, heat: 0 },
  },
  {
    id: 'refurb-signalbridge-kit',
    type: 'CABLE_KIT',
    name: 'Refurbished SignalBridge',
    brand: 'SignalBridge',
    price: 175,
    condition: 'REFURBISHED',
    efficiency: 0.8,
    section: 'REFURBISHED_PARTS',
    subcategory: 'CABLE_KITS',
    hint: 'Reliable mid-tier expansion part.',
    stats: { tflops: 0, power: 2, heat: 0 },
  },
  {
    id: 'refurb-dataloop-kit',
    type: 'CABLE_KIT',
    name: 'Refurbished DataLoop Bus',
    brand: 'DataLoop',
    price: 205,
    condition: 'REFURBISHED',
    efficiency: 0.84,
    section: 'REFURBISHED_PARTS',
    subcategory: 'CABLE_KITS',
    hint: 'Tuned for consistent output.',
    stats: { tflops: 0, power: 1, heat: 0 },
  },
  {
    id: 'refurb-memory-bus-32',
    type: 'MEMORY',
    name: 'Refurbished Memory Bus 32GB',
    brand: 'Aisicorp',
    price: 160,
    condition: 'REFURBISHED',
    efficiency: 0.8,
    section: 'REFURBISHED_PARTS',
    subcategory: 'MEMORY',
    hint: 'Stable refurbished module.',
    stats: { tflops: 0, power: 14, heat: 1 },
  },
  {
    id: 'refurb-vector-ram-64',
    type: 'MEMORY',
    name: 'Refurbished VectorRAM 64GB',
    brand: 'VectorRAM',
    price: 260,
    condition: 'REFURBISHED',
    efficiency: 0.82,
    section: 'REFURBISHED_PARTS',
    subcategory: 'MEMORY',
    hint: 'Bench-tested refurbished component.',
    stats: { tflops: 0, power: 18, heat: 1 },
  },
  {
    id: 'refurb-neurocache-96',
    type: 'MEMORY',
    name: 'Refurbished NeuroCache 96GB',
    brand: 'NeuroCache',
    price: 340,
    condition: 'REFURBISHED',
    efficiency: 0.85,
    section: 'REFURBISHED_PARTS',
    subcategory: 'MEMORY',
    hint: 'Reliable mid-tier expansion part.',
    stats: { tflops: 0, power: 20, heat: 2 },
  },
  {
    id: 'refurb-datacore-ssd',
    type: 'STORAGE',
    name: 'Refurbished DataCore SSD',
    brand: 'DataCore',
    price: 140,
    condition: 'REFURBISHED',
    efficiency: 0.8,
    section: 'REFURBISHED_PARTS',
    subcategory: 'STORAGE',
    hint: 'Bench-tested refurbished component.',
    stats: { tflops: 0, power: 14, heat: 1 },
  },
  {
    id: 'refurb-archive-ssd',
    type: 'STORAGE',
    name: 'Refurbished Archive SSD',
    brand: 'ArchiveOne',
    price: 210,
    condition: 'REFURBISHED',
    efficiency: 0.82,
    section: 'REFURBISHED_PARTS',
    subcategory: 'STORAGE',
    hint: 'Stable refurbished module.',
    stats: { tflops: 0, power: 15, heat: 1 },
  },
  {
    id: 'refurb-synvault-nvme',
    type: 'STORAGE',
    name: 'Refurbished SynVault NVMe',
    brand: 'SynVault',
    price: 290,
    condition: 'REFURBISHED',
    efficiency: 0.85,
    section: 'REFURBISHED_PARTS',
    subcategory: 'STORAGE',
    hint: 'Tuned for consistent output.',
    stats: { tflops: 0, power: 16, heat: 1 },
  },
  {
    id: 'refurb-neo-gen-gpu',
    type: 'GPU',
    name: 'Refurbished GTX Neo-Gen',
    brand: 'AsicCorp',
    price: 380,
    condition: 'REFURBISHED',
    efficiency: 0.74,
    section: 'REFURBISHED_PARTS',
    subcategory: 'GPUS',
    hint: 'Bench-tested refurbished component.',
    stats: { tflops: 7.5, power: 190, heat: 18 },
  },
  {
    id: 'refurb-core-v2-gpu',
    type: 'GPU',
    name: 'Refurbished Synapse Core V2',
    brand: 'NeuralDynamics',
    price: 980,
    condition: 'REFURBISHED',
    efficiency: 0.8,
    section: 'REFURBISHED_PARTS',
    subcategory: 'GPUS',
    hint: 'Reliable mid-tier expansion part.',
    stats: { tflops: 10.5, power: 230, heat: 14 },
  },
  {
    id: 'refurb-vector-h1-gpu',
    type: 'GPU',
    name: 'Refurbished Quantum Vector H1',
    brand: 'AetherLabs',
    price: 2400,
    condition: 'REFURBISHED',
    efficiency: 0.85,
    section: 'REFURBISHED_PARTS',
    subcategory: 'GPUS',
    hint: 'Tuned for consistent output.',
    stats: { tflops: 22, power: 360, heat: 17 },
  },
  {
    id: 'refurb-silentflow-fan',
    type: 'ROOM_FAN',
    name: 'Refurbished SilentFlow',
    brand: 'AsicCorp',
    price: 120,
    condition: 'REFURBISHED',
    efficiency: 0.75,
    section: 'REFURBISHED_PARTS',
    subcategory: 'ROOM_FANS',
    hint: 'Bench-tested refurbished component.',
    stats: { tflops: 0, power: 11, heat: -8 },
  },
  {
    id: 'refurb-coolstream-fan',
    type: 'ROOM_FAN',
    name: 'Refurbished CoolStream Fan',
    brand: 'CoolStream',
    price: 145,
    condition: 'REFURBISHED',
    efficiency: 0.8,
    section: 'REFURBISHED_PARTS',
    subcategory: 'ROOM_FANS',
    hint: 'Stable refurbished module.',
    stats: { tflops: 0, power: 12, heat: -9 },
  },
  {
    id: 'refurb-velocity-fan',
    type: 'ROOM_FAN',
    name: 'Refurbished Velocity Fan',
    brand: 'Velocity Air',
    price: 180,
    condition: 'REFURBISHED',
    efficiency: 0.84,
    section: 'REFURBISHED_PARTS',
    subcategory: 'ROOM_FANS',
    hint: 'Reliable mid-tier expansion part.',
    stats: { tflops: 0, power: 13, heat: -11 },
  },
  {
    id: 'refurb-cryovortex-extractor',
    type: 'ROOM_EXTRACTOR',
    name: 'Refurbished CryoVortex',
    brand: 'AetherLabs',
    price: 420,
    condition: 'REFURBISHED',
    efficiency: 0.78,
    section: 'REFURBISHED_PARTS',
    subcategory: 'EXTRACTORS',
    hint: 'Bench-tested refurbished component.',
    stats: { tflops: 0, power: 36, heat: -20 },
  },
  {
    id: 'refurb-thermashift-extractor',
    type: 'ROOM_EXTRACTOR',
    name: 'Refurbished ThermaShift Extractor',
    brand: 'ThermaShift',
    price: 470,
    condition: 'REFURBISHED',
    efficiency: 0.82,
    section: 'REFURBISHED_PARTS',
    subcategory: 'EXTRACTORS',
    hint: 'Stable refurbished module.',
    stats: { tflops: 0, power: 40, heat: -22 },
  },
  {
    id: 'refurb-aerogrid-extractor',
    type: 'ROOM_EXTRACTOR',
    name: 'Refurbished AeroGrid Extractor',
    brand: 'AeroGrid',
    price: 540,
    condition: 'REFURBISHED',
    efficiency: 0.85,
    section: 'REFURBISHED_PARTS',
    subcategory: 'EXTRACTORS',
    hint: 'Tuned for consistent output.',
    stats: { tflops: 0, power: 42, heat: -24 },
  },
  {
    id: 'basic-power-unit',
    type: 'POWER_UNIT',
    name: 'Basic Power Unit',
    brand: 'VoltGrid',
    price: 300,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'POWER_UNITS',
    hint: 'Certified new hardware.',
    stats: { tflops: 0, power: 500, heat: 4 },
  },
  {
    id: 'gridforge-power-stack',
    type: 'POWER_UNIT',
    name: 'GridForge Power Stack',
    brand: 'GridForge',
    price: 520,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'POWER_UNITS',
    hint: 'Reliable full-capacity component.',
    stats: { tflops: 0, power: 650, heat: 4 },
  },
  {
    id: 'hypercell-power-core',
    type: 'POWER_UNIT',
    name: 'HyperCell Power Core',
    brand: 'HyperCell',
    price: 820,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'POWER_UNITS',
    hint: 'Premium component for stable expansion.',
    stats: { tflops: 0, power: 900, heat: 5 },
  },
  {
    id: 'copper-link-v1',
    type: 'CABLE_KIT',
    name: 'Copper Link V1',
    brand: 'Copper Link',
    price: 100,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'CABLE_KITS',
    hint: 'Certified new hardware.',
    stats: { tflops: 0, power: 8, heat: 0 },
  },
  {
    id: 'optic-data-bus',
    type: 'CABLE_KIT',
    name: 'Optic Data Bus',
    brand: 'AetherLabs',
    price: 350,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'CABLE_KITS',
    hint: 'Factory-grade component.',
    stats: { tflops: 0, power: 2, heat: 0 },
  },
  {
    id: 'synapse-relay-mesh',
    type: 'CABLE_KIT',
    name: 'Synapse Relay Mesh',
    brand: 'Synapse Relay',
    price: 480,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'CABLE_KITS',
    hint: 'Premium component for stable expansion.',
    stats: { tflops: 0, power: 1, heat: 0 },
  },
  {
    id: 'standard-bus-32gb',
    type: 'MEMORY',
    name: 'Standard Bus 32GB',
    brand: 'AsicCorp',
    price: 200,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'MEMORY',
    hint: 'Certified new hardware.',
    stats: { tflops: 0, power: 15, heat: 1 },
  },
  {
    id: 'ddr6-128gb',
    type: 'MEMORY',
    name: 'DDR6 128GB',
    brand: 'NeuralDynamics',
    price: 750,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'MEMORY',
    hint: 'Factory-grade component.',
    stats: { tflops: 0, power: 25, heat: 2 },
  },
  {
    id: 'neurostack-256gb',
    type: 'MEMORY',
    name: 'NeuroStack 256GB',
    brand: 'NeuroStack',
    price: 1350,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'MEMORY',
    hint: 'Reliable full-capacity component.',
    stats: { tflops: 0, power: 34, heat: 3 },
  },
  {
    id: 'basic-ssd-256',
    type: 'STORAGE',
    name: 'Basic SSD 256GB',
    brand: 'DataVault',
    price: 180,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'STORAGE',
    hint: 'Certified new hardware.',
    stats: { tflops: 0, power: 15, heat: 1 },
  },
  {
    id: 'datavault-ssd-1tb',
    type: 'STORAGE',
    name: 'DataVault SSD 1TB',
    brand: 'DataVault',
    price: 360,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'STORAGE',
    hint: 'Reliable full-capacity component.',
    stats: { tflops: 0, power: 18, heat: 1 },
  },
  {
    id: 'quantum-archive-nvme',
    type: 'STORAGE',
    name: 'Quantum Archive NVMe',
    brand: 'Quantum Archive',
    price: 760,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'STORAGE',
    hint: 'Premium component for stable expansion.',
    stats: { tflops: 0, power: 20, heat: 2 },
  },
  {
    id: 'gtx-neo-gen',
    type: 'GPU',
    name: 'GTX Neo-Gen',
    brand: 'AsicCorp',
    price: 450,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'GPUS',
    hint: 'Certified new hardware.',
    stats: { tflops: 4.5, power: 180, heat: 14 },
  },
  {
    id: 'synapse-core-v2',
    type: 'GPU',
    name: 'Synapse Core V2',
    brand: 'NeuralDynamics',
    price: 1500,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'GPUS',
    hint: 'Factory-grade component.',
    stats: { tflops: 12, power: 250, heat: 10 },
  },
  {
    id: 'quantum-vector-h1',
    type: 'GPU',
    name: 'Quantum Vector H1',
    brand: 'AetherLabs',
    price: 4800,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'GPUS',
    hint: 'Premium component for stable expansion.',
    stats: { tflops: 35, power: 450, heat: 16 },
  },
  {
    id: 'silentflow-90mm',
    type: 'ROOM_FAN',
    name: 'SilentFlow 90mm',
    brand: 'AsicCorp',
    price: 150,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'ROOM_FANS',
    hint: 'Factory-grade component.',
    stats: { tflops: 0, power: 12, heat: -8 },
  },
  {
    id: 'aeropulse-120mm',
    type: 'ROOM_FAN',
    name: 'AeroPulse 120mm',
    brand: 'AeroPulse',
    price: 220,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'ROOM_FANS',
    hint: 'Certified new hardware.',
    stats: { tflops: 0, power: 13, heat: -10 },
  },
  {
    id: 'vector-breeze-array',
    type: 'ROOM_FAN',
    name: 'Vector Breeze Array',
    brand: 'Vector Breeze',
    price: 340,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'ROOM_FANS',
    hint: 'Reliable full-capacity component.',
    stats: { tflops: 0, power: 15, heat: -13 },
  },
  {
    id: 'cryovortex-industrial',
    type: 'ROOM_EXTRACTOR',
    name: 'CryoVortex Industrial',
    brand: 'AetherLabs',
    price: 650,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'EXTRACTORS',
    hint: 'Factory-grade component.',
    stats: { tflops: 0, power: 45, heat: -28 },
  },
  {
    id: 'thermalsink-cyclone',
    type: 'ROOM_EXTRACTOR',
    name: 'ThermalSink Cyclone',
    brand: 'ThermalSink',
    price: 880,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'EXTRACTORS',
    hint: 'Reliable full-capacity component.',
    stats: { tflops: 0, power: 50, heat: -32 },
  },
  {
    id: 'fluxvent-array',
    type: 'ROOM_EXTRACTOR',
    name: 'FluxVent Array',
    brand: 'FluxVent',
    price: 1150,
    condition: 'NEW',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'EXTRACTORS',
    hint: 'Premium component for stable expansion.',
    stats: { tflops: 0, power: 56, heat: -36 },
  },
  {
    id: 'consumable-energy',
    type: 'CONSUMABLE',
    name: 'C\u00E1psula de Energ\u00EDa',
    brand: 'VoltGrid',
    price: 120,
    condition: 'CONSUMABLE',
    efficiency: 1,
    section: 'NEW_HARDWARE',
    subcategory: 'CONSUMABLES',
    hint: 'Single-use energy reserve for emergency recovery.',
    stats: { tflops: 0, power: 0, heat: 0 },
  },
];

const PRODUCTS_BY_SECTION_AND_SUBCATEGORY = SECTION_ORDER.reduce(
  (sections, section) => {
    sections[section] = SUBCATEGORY_ORDER.reduce((subcategories, subcategory) => {
      subcategories[subcategory] = STORE_PRODUCTS.filter(
        (product) =>
          product.section === section && product.subcategory === subcategory,
      );
      return subcategories;
    }, {} as Record<ProductSubcategory, StoreProduct[]>);

    return sections;
  },
  {} as Record<StoreSection, Record<ProductSubcategory, StoreProduct[]>>,
);

function isCoolingType(type: ComponentType) {
  return type === 'ROOM_FAN' || type === 'ROOM_EXTRACTOR';
}

function formatEfficiency(efficiency: number) {
  return `${Math.round(efficiency * 100)}%`;
}

function formatThermalValue(heat: number) {
  return `${Math.abs(heat)} C`;
}

function getTypeColor(type: ComponentType) {
  switch (type) {
    case 'GPU':
      return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
    case 'MEMORY':
      return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    case 'STORAGE':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'POWER_UNIT':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'CABLE_KIT':
      return 'text-sky-300 bg-sky-400/10 border-sky-400/20';
    case 'ROOM_FAN':
      return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
    case 'ROOM_EXTRACTOR':
      return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    case 'CONSUMABLE':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    default:
      return 'text-white bg-white/10 border-white/20';
  }
}

function getConditionColor(condition: ProductCondition) {
  switch (condition) {
    case 'USED':
      return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
    case 'REFURBISHED':
      return 'text-violet-300 bg-violet-400/10 border-violet-400/20';
    case 'NEW':
      return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20';
    case 'CONSUMABLE':
      return 'text-yellow-300 bg-yellow-400/10 border-yellow-400/20';
    default:
      return 'text-white bg-white/10 border-white/20';
  }
}

export function Marketplace() {
  const [balance, setBalance] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadBalance() {
      const { data, error } = await supabase
        .from('user_economy')
        .select('ncr_balance')
        .limit(1)
        .single();

      if (data && !error) {
        setBalance(data.ncr_balance);
      }
    }

    loadBalance();
  }, []);

  const handleBuy = async (item: StoreProduct) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const { data: economy, error: fetchError } = await supabase
        .from('user_economy')
        .select('id, ncr_balance')
        .limit(1)
        .single();

      if (fetchError || !economy) {
        console.error('Error al leer saldo:', fetchError);
        alert('Error: Could not find user balance.');
        setIsProcessing(false);
        return;
      }

      if (economy.ncr_balance < item.price) {
        alert('Insufficient NCR funds.');
        setIsProcessing(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('user_economy')
        .update({ ncr_balance: economy.ncr_balance - item.price })
        .eq('id', economy.id);

      if (updateError) {
        console.error('DETALLE DEL ERROR:', updateError);
        alert(`Error: ${updateError.message}`);
        setIsProcessing(false);
        return;
      }

      // TODO: persist condition, efficiency, brand, compatibilityGroup, section and subcategory after database migration.
      const { error: insertError } = await supabase.from('user_hardware').insert({
        owner_id: 'player-1',
        type: item.type,
        name: item.name,
        stats: item.stats,
        slot_id: null,
      });

      if (insertError) {
        throw insertError;
      }

      setBalance((prev) => prev - item.price);
      alert(`Transaction successful! Acquired: ${item.name}`);
    } catch (err) {
      console.error('Purchase failed:', err);
      alert('Error during transaction.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full animate-in fade-in duration-300 p-8">
      <div className="mb-8 flex items-end justify-between border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-white">
            OFFICIAL STORE
          </h1>
          <p className="mt-2 text-slate-400">
            Acquire certified hardware to expand your cluster&apos;s capacity.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Available Funds
          </span>
          <div className="text-2xl font-bold text-green-400">{balance} NCR</div>
        </div>
      </div>

      <div className="space-y-10">
        {SECTION_ORDER.map((section) => {
          const sectionMeta = SECTION_META[section];
          const sectionProducts = PRODUCTS_BY_SECTION_AND_SUBCATEGORY[section];
          const sectionCount = Object.values(sectionProducts).reduce(
            (total, products) => total + products.length,
            0,
          );

          return (
            <section key={section} className="space-y-6">
              <div
                className={`rounded-2xl border px-5 py-4 shadow-lg backdrop-blur-sm ${sectionMeta.panelClassName}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p
                      className={`text-[10px] font-black uppercase tracking-[0.28em] ${sectionMeta.accentClassName}`}
                    >
                      Store Section
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-white">
                      {sectionMeta.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm text-slate-300">
                      {sectionMeta.subtitle}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                      {sectionCount} items available
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {SUBCATEGORY_ORDER.map((subcategory) => {
                  const products = sectionProducts[subcategory];

                  if (products.length === 0) {
                    return null;
                  }

                  return (
                    <div key={`${section}-${subcategory}`} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-300">
                          {SUBCATEGORY_LABELS[subcategory]}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          {products.length} items
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {products.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-800/90 p-6 shadow-lg transition-colors hover:border-cyan-500/50"
                          >
                            <div>
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="flex flex-wrap gap-2">
                                  <span
                                    className={`rounded border px-2 py-1 text-[10px] font-bold tracking-widest ${getTypeColor(item.type)}`}
                                  >
                                    {TYPE_LABELS[item.type]}
                                  </span>
                                  <span
                                    className={`rounded border px-2 py-1 text-[10px] font-bold tracking-widest ${getConditionColor(item.condition)}`}
                                  >
                                    {item.condition}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-green-400">
                                  {item.price.toLocaleString()} NCR
                                </span>
                              </div>

                              <div className="mb-4">
                                <h4 className="text-lg font-bold leading-tight text-white">
                                  {item.name}
                                </h4>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  {item.brand}
                                </span>
                              </div>

                              <div className="mb-4 space-y-2 rounded-lg border border-slate-700/50 bg-slate-900/50 p-4">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">
                                    Base efficiency:
                                  </span>
                                  <span className="font-mono font-bold text-emerald-300">
                                    {formatEfficiency(item.efficiency)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Compute:</span>
                                  <span className="font-mono font-bold text-cyan-400">
                                    {item.stats.tflops} TFLOPS
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">
                                    Consumption:
                                  </span>
                                  <span className="font-mono font-bold text-amber-400">
                                    {item.stats.power} W
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">
                                    {isCoolingType(item.type) ? 'Cooling:' : 'Heat:'}
                                  </span>
                                  <span
                                    className={`font-mono font-bold ${
                                      isCoolingType(item.type)
                                        ? item.type === 'ROOM_EXTRACTOR'
                                          ? 'text-orange-300'
                                          : 'text-cyan-400'
                                        : 'text-orange-400'
                                    }`}
                                  >
                                    {formatThermalValue(item.stats.heat)}
                                  </span>
                                </div>
                              </div>

                              <div className="mb-6 rounded-lg border border-slate-700/50 bg-slate-900/60 p-4">
                                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                                  Hint
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                                  {item.hint ?? 'Factory-grade component.'}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleBuy(item)}
                              disabled={isProcessing || balance < item.price}
                              className={`w-full rounded-lg py-3 text-[11px] font-bold uppercase tracking-widest transition-all ${
                                balance >= item.price
                                  ? 'cursor-pointer bg-slate-700 text-white hover:bg-cyan-600 hover:shadow-[0_0_15px_rgba(8,145,178,0.5)]'
                                  : 'cursor-not-allowed border border-slate-700/50 bg-slate-900/50 text-slate-600'
                              }`}
                            >
                              {isProcessing ? 'Processing...' : 'Purchase Component'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
