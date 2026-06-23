`update-crypto-prices` refreshes `crypto_prices` from CoinGecko on the backend.

Required Supabase secrets:

```bash
supabase secrets set COINGECKO_API_KEY=your_key_here
```

Deploy and invoke:

```bash
supabase functions deploy update-crypto-prices
supabase functions invoke update-crypto-prices
```

Notes:

- Keep `COINGECKO_API_KEY` in Supabase secrets only. Do not expose it through `VITE_` frontend env vars.
- If the key is missing, the function falls back to CoinGecko public mode as a best-effort path, but a key is the recommended setup.
- The function adapts to the current table schema found in this project: `crypto`, `usd_price`, `price_source`, `updated_at`.
- The current mapping is: `BTC -> bitcoin`, `ETH -> ethereum`, `DOGE -> dogecoin`, `POL -> polygon-ecosystem-token`, `BNB -> binancecoin`, `USDT -> tether`.
- `NCR` is treated as an internal token and is written as `usd_price = 1` with `price_source = internal_fixed` until a separate pricing rule replaces it.
