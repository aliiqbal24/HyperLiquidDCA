create table if not exists accounts (
  id text primary key,
  email text,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text not null default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists account_tokens (
  account_id text not null references accounts(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  primary key (account_id, token_hash)
);

create table if not exists credentials (
  account_id text primary key references accounts(id) on delete cascade,
  secret jsonb not null,
  environment text not null,
  updated_at timestamptz not null default now()
);

create table if not exists schedules (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  status text not null,
  executor_mode text not null,
  next_run_at timestamptz not null,
  schedule jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedules_due_idx on schedules (executor_mode, status, next_run_at);
create index if not exists schedules_account_idx on schedules (account_id);

create table if not exists execution_locks (
  occurrence_id text primary key,
  schedule_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists execution_logs (
  id text primary key,
  account_id text not null,
  schedule_id text not null,
  status text not null,
  log jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists execution_logs_account_idx on execution_logs (account_id);
create index if not exists execution_logs_schedule_idx on execution_logs (schedule_id);
create index if not exists execution_logs_account_status_created_idx on execution_logs (account_id, status, created_at);

create table if not exists stripe_events (
  id text primary key,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists market_cache (
  environment text primary key,
  catalog jsonb not null,
  fetched_at timestamptz not null
);
