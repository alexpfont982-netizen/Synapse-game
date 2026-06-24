const fs = require('fs');
const path = 'src/data/supabasePlayerState.ts';

let text = fs.readFileSync(path, 'utf8');
fs.writeFileSync(path + '.bak2', text);

// ── PATCH 1: fetchPlayerState — leer balance de user_wallets ──────
text = text.replace(
  `const { data: economy } = await supabase
      .from('user_economy')
      .select('ncr_balance')
      .eq('id', userId)
      .single()

    const { data: hardware, error: hwError } = await supabase`,
  `const { data: economy } = await supabase
      .from('user_wallets')
      .select('ncr_balance')
      .eq('id', userId)
      .single()

    const { data: hardware, error: hwError } = await supabase`
);

// ── PATCH 2: fetchPlayerState — return balance ────────────────────
text = text.replace(
  `return { balance: Number(economy?.ncr_balance ?? 0), inventory: [] }
    }

    const rows`,
  `return { balance: Number(economy?.ncr_balance ?? 0), inventory: [] }
    }

    const rows`
);

// fix all three occurrences of economy?.ncr_balance in fetchPlayerState
// They already reference the correct data var after patch 1

// ── PATCH 3: purchaseStoreItem — leer y descontar de user_wallets ─
text = text.replace(
  `  const { data: economy } = await supabase
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
    .eq('id', userId)`,
  `  const { data: economy } = await supabase
    .from('user_wallets')
    .select('ncr_balance')
    .eq('id', userId)
    .single()

  if (!economy || Number(economy.ncr_balance) < product.price) {
    return { ok: false, reason: 'insufficient_balance' }
  }

  const { error: balanceError } = await supabase
    .from('user_wallets')
    .update({ ncr_balance: Number(economy.ncr_balance) - product.price })
    .eq('id', userId)`
);

// ── PATCH 4: purchaseBattery — leer y descontar de user_wallets ───
text = text.replace(
  `  const { data: economy } = await supabase
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
    .eq('id', userId)`,
  `  const { data: economy } = await supabase
    .from('user_wallets')
    .select('ncr_balance')
    .eq('id', userId)
    .single()

  if (!economy || Number(economy.ncr_balance) < battery.price) {
    return { ok: false, reason: 'insufficient_balance' }
  }

  const { error: balanceError } = await supabase
    .from('user_wallets')
    .update({ ncr_balance: Number(economy.ncr_balance) - battery.price })
    .eq('id', userId)`
);

fs.writeFileSync(path, text, 'utf8');

// Verify patches applied
const verify = fs.readFileSync(path, 'utf8');
const economyCount = (verify.match(/from\('user_economy'\)/g) || []).length;
const walletsCount = (verify.match(/from\('user_wallets'\)/g) || []).length;
console.log(`user_economy references remaining: ${economyCount}`);
console.log(`user_wallets references: ${walletsCount}`);
console.log('Done!');
