-- ============================================================
-- RONIN LAUNCHPAD — Staking Schema
-- ============================================================

-- Stakes: every stake/unstake event
create table stakes (
  id uuid default gen_random_uuid() primary key,
  wallet text not null,
  pool_address text not null,
  base_mint text not null,
  amount bigint not null,          -- token lamports (6 decimals)
  action text not null check (action in ('stake', 'unstake')),
  tx_signature text not null unique,
  created_at timestamptz default now()
);

create index idx_stakes_wallet on stakes(wallet);
create index idx_stakes_pool on stakes(pool_address);
create index idx_stakes_wallet_pool on stakes(wallet, pool_address);

-- Computed view: net staked balance per user per pool
create or replace view stake_balances as
select
  wallet,
  pool_address,
  base_mint,
  sum(case when action = 'stake' then amount else -amount end) as staked_amount
from stakes
group by wallet, pool_address, base_mint
having sum(case when action = 'stake' then amount else -amount end) > 0;

-- Fee distributions: log of each admin distribution event
create table fee_distributions (
  id uuid default gen_random_uuid() primary key,
  pool_address text not null,
  total_sol_lamports bigint not null,
  claim_tx_signature text,
  staker_count integer not null default 0,
  created_at timestamptz default now()
);

create index idx_fee_dist_pool on fee_distributions(pool_address);

-- Rewards: per-user reward entries from fee distributions
create table rewards (
  id uuid default gen_random_uuid() primary key,
  wallet text not null,
  pool_address text not null,
  amount_lamports bigint not null,   -- SOL lamports
  status text not null default 'pending' check (status in ('pending', 'claimed')),
  distribution_id uuid references fee_distributions(id),
  claim_tx_signature text,
  created_at timestamptz default now(),
  claimed_at timestamptz
);

create index idx_rewards_wallet on rewards(wallet);
create index idx_rewards_wallet_status on rewards(wallet, status);
create index idx_rewards_pool on rewards(pool_address);

-- Enable RLS
alter table stakes enable row level security;
alter table fee_distributions enable row level security;
alter table rewards enable row level security;

-- Service role bypasses RLS, so API routes using service key have full access.
-- No public anon policies — all access goes through our Next.js API routes.
