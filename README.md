# 🧙‍♂️ Magic Internet Moneymaker (MIM)

**Every degen's a wizard.** A fair token launch platform built on [Meteora's Dynamic Bonding Curve](https://docs.meteora.ag/docs/dynamic-bonding-curve) on Solana.

## The Problem

Current launchpads are broken:

| Problem | How it hurts traders |
|---------|---------------------|
| Bundled launches | Devs secretly buy 40-60% supply via Jito bundles |
| Rug pulls | Devs pull liquidity or dump, holders left with nothing |
| Bot sniping | Bots front-run in milliseconds, retail gets worse entries |
| Platform extraction | Platform profits regardless of trader outcomes |
| Cabals | Private groups coordinate to pump and dump |
| Retail bag-holding | Curve design ensures late buyers always lose |

## The Arcana Standard

Every token launched through MIM gets the same protection — no tiers, no compromises:

- **100% LP permanently locked** — nobody can pull liquidity, ever
- **1.5% flat trading fee** — simple, transparent
- **7-day creator token vesting** — creators can't dump on launch
- **Immutable token** — no mint/freeze authority
- **50/25/25 fee split** — stakers, platform, creator

### The Alchemy Split

| Recipient | Share | When |
|-----------|-------|------|
| Enchanters (stakers) | 50% | Always |
| The Tower (platform) | 25% | Always |
| Summoner (creator) | 25% | After bonding completes |

## Features

- **Cast a Spell** — Launch a token in minutes with the 3-step wizard
- **Potions Directory** — Browse all tokens launched through MIM
- **Arcane Enchanting** — Stake $MIM to earn 50% of all trading fees
- **Archmage Dashboard** — Admin panel for fee management and pool oversight

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion
- **Blockchain**: Solana, Meteora Dynamic Bonding Curve SDK, SPL Token / Token-2022
- **Wallet**: Solana Wallet Adapter
- **Backend**: Supabase, Cloudflare R2
- **Fonts**: Space Grotesk (display), Inter (body)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_RPC_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
ADMIN_WALLET=
STAKING_VAULT_PRIVATE_KEY=
```

## Scripts

```bash
npm run dev            # Start dev server
npm run build          # Production build
npm run create-config  # Create Meteora DBC config
npm run create-pool    # Create a new pool
npm run check-pool     # Check pool status
```

## License

MIT
