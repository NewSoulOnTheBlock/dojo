CREATE TABLE IF NOT EXISTS pools (
  address TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  config TEXT DEFAULT '',
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  creator TEXT DEFAULT '',
  signature TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  launched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet TEXT NOT NULL,
  pool_address TEXT NOT NULL,
  base_mint TEXT NOT NULL,
  amount TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('stake', 'unstake')),
  tx_signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_distributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_address TEXT NOT NULL,
  total_sol_lamports TEXT NOT NULL,
  claim_tx_signature TEXT DEFAULT '',
  staker_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet TEXT NOT NULL,
  pool_address TEXT NOT NULL,
  amount_lamports TEXT NOT NULL,
  distribution_id UUID REFERENCES fee_distributions(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed')),
  claim_tx_signature TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW stake_balances AS
SELECT
  wallet,
  pool_address,
  base_mint,
  SUM(
    CASE WHEN action = 'stake' THEN CAST(amount AS NUMERIC)
         WHEN action = 'unstake' THEN -CAST(amount AS NUMERIC)
         ELSE 0 END
  )::TEXT AS staked_amount
FROM stakes
GROUP BY wallet, pool_address, base_mint
HAVING SUM(
  CASE WHEN action = 'stake' THEN CAST(amount AS NUMERIC)
       WHEN action = 'unstake' THEN -CAST(amount AS NUMERIC)
       ELSE 0 END
) > 0;

CREATE INDEX IF NOT EXISTS idx_stakes_wallet ON stakes(wallet);
CREATE INDEX IF NOT EXISTS idx_stakes_pool ON stakes(pool_address);
CREATE INDEX IF NOT EXISTS idx_rewards_wallet ON rewards(wallet);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);
CREATE INDEX IF NOT EXISTS idx_pools_creator ON pools(creator);
