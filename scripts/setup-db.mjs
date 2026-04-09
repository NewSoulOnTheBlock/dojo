import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yibbarvuvvoygozkldlu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpYmJhcnZ1dnZveWdvemtsZGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY0NjM1NCwiZXhwIjoyMDkxMjIyMzU0fQ.PfaBWqrPmGfC7xwPUJyXEa4roZrXZDXH2hDuVAV7Vhk'
)

const sql = `
-- Pools registry
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

-- Stake events log
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

-- Materialized stake balances (computed view)
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

-- Fee distributions
CREATE TABLE IF NOT EXISTS fee_distributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_address TEXT NOT NULL,
  total_sol_lamports TEXT NOT NULL,
  claim_tx_signature TEXT DEFAULT '',
  staker_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stakes_wallet ON stakes(wallet);
CREATE INDEX IF NOT EXISTS idx_stakes_pool ON stakes(pool_address);
CREATE INDEX IF NOT EXISTS idx_rewards_wallet ON rewards(wallet);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);
CREATE INDEX IF NOT EXISTS idx_pools_creator ON pools(creator);
`

// Execute via Supabase's rpc — we need to create a function first, or use the SQL API
// Let's try inserting via the postgres connection
const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql })

if (error) {
  console.log('RPC not available, trying direct approach...')

  // Split and run each statement
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)

  for (const stmt of statements) {
    const { error: stmtError } = await supabase.from('_exec').select().limit(0)
    // This won't work via REST — need psql or dashboard
  }

  console.log('\n=== COPY THE SQL BELOW INTO YOUR SUPABASE DASHBOARD ===')
  console.log('Go to: https://supabase.com/dashboard/project/yibbarvuvvoygozkldlu/sql/new')
  console.log('Paste and run:\n')
  console.log(sql)
} else {
  console.log('Tables created successfully!')
}
