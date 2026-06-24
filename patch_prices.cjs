const fs = require('fs');
const path = require('path');

const FILE = 'src/data/garageInventory.ts';

const prices = {
  psu_rustcore_350_used: 3,
  psu_rustcore_350_rebuilt: 5,
  psu_rustcore_350_new: 8,
  psu_voltforge_450_used: 7,
  psu_voltforge_450_rebuilt: 10,
  psu_voltforge_450_new: 15,
  psu_titangrid_600_used: 14,
  psu_titangrid_600_rebuilt: 20,
  psu_titangrid_600_new: 28,
  cable_copperlink_basic_used: 1,
  cable_copperlink_basic_rebuilt: 2,
  cable_copperlink_basic_new: 2,
  cable_voltline_reinforced_used: 3,
  cable_voltline_reinforced_rebuilt: 4,
  cable_voltline_reinforced_new: 5,
  cable_fluxcord_highcap_used: 5,
  cable_fluxcord_highcap_rebuilt: 7,
  cable_fluxcord_highcap_new: 9,
  mem_corecell_4gb_used: 2,
  mem_corecell_4gb_rebuilt: 3,
  mem_corecell_4gb_new: 4,
  mem_deepcore_8gb_used: 5,
  mem_deepcore_8gb_rebuilt: 7,
  mem_deepcore_8gb_new: 9,
  mem_synapticboard_16gb_used: 9,
  mem_synapticboard_16gb_rebuilt: 14,
  mem_synapticboard_16gb_new: 20,
  storage_databrick_500gb_used: 4,
  storage_databrick_500gb_rebuilt: 6,
  storage_databrick_500gb_new: 8,
  storage_coldvault_1tb_used: 7,
  storage_coldvault_1tb_rebuilt: 10,
  storage_coldvault_1tb_new: 15,
  storage_rapidcell_256gb_used: 10,
  storage_rapidcell_256gb_rebuilt: 14,
  storage_rapidcell_256gb_new: 20,
  gpu_ironpixel_2gb_used: 6,
  gpu_ironpixel_2gb_rebuilt: 10,
  gpu_ironpixel_2gb_new: 15,
  gpu_corerender_4gb_used: 16,
  gpu_corerender_4gb_rebuilt: 25,
  gpu_corerender_4gb_new: 35,
  gpu_neurovolt_6gb_used: 38,
  gpu_neurovolt_6gb_rebuilt: 55,
  gpu_neurovolt_6gb_new: 75,
  gpu_aetherframe_8gb_used: 75,
  gpu_aetherframe_8gb_rebuilt: 110,
  gpu_aetherframe_8gb_new: 150,
  cooling_dustfan_80mm_used: 3,
  cooling_dustfan_80mm_rebuilt: 4,
  cooling_dustfan_80mm_new: 6,
  cooling_coolgrid_120mm_used: 6,
  cooling_coolgrid_120mm_rebuilt: 9,
  cooling_coolgrid_120mm_new: 12,
  cooling_frostcore_dual_used: 13,
  cooling_frostcore_dual_rebuilt: 20,
  cooling_frostcore_dual_new: 28,
};

// Read file
let text = fs.readFileSync(FILE, 'utf8');

// Backup
fs.writeFileSync(FILE + '.bak', text);
console.log('Backup saved: ' + FILE + '.bak');

let updated = 0;
const notFound = [];

for (const [itemId, price] of Object.entries(prices)) {
  // Find the block starting with item_id: 'X' and replace the next price field
  const escaped = itemId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    "(item_id:\\s*'" + escaped + "'[\\s\\S]*?price:\\s*)(\\d+)",
  );
  const newText = text.replace(regex, (_, prefix) => prefix + price);
  if (newText !== text) {
    text = newText;
    updated++;
  } else {
    notFound.push(itemId);
  }
}

// Write patched file
fs.writeFileSync(FILE, text, 'utf8');

console.log('\nUpdated: ' + updated + '/57');
if (notFound.length > 0) {
  console.log('NOT FOUND:');
  notFound.forEach((id) => console.log('  - ' + id));
} else {
  console.log('All 57 prices updated successfully!');
}
