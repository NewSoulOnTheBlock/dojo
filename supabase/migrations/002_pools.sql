-- Pool registry — every token launched through The Dojo
create table if not exists pools (
  id uuid default gen_random_uuid() primary key,
  address text not null unique,
  mint text not null,
  config text default '',
  name text not null,
  symbol text not null,
  creator text default '',
  signature text default '',
  launched_at timestamptz default now()
);

-- Enable RLS (service role bypasses)
alter table pools enable row level security;

-- Index for fast lookups
create index if not exists idx_pools_launched_at on pools (launched_at desc);
create index if not exists idx_pools_creator on pools (creator);
