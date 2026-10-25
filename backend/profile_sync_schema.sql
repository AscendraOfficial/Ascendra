-- Ascendra cross-device profile sync
-- Run this in Supabase SQL Editor before enabling profile sync.
-- The backend should use a Supabase service-role key; never expose it in frontend code.

create table if not exists public.profile_sync_accounts (
    account_id text primary key,
    username text not null,
    username_key text not null unique,
    password_hash text not null,
    profile jsonb not null default '{}'::jsonb,
    profile_version bigint not null default 1 check (profile_version >= 1),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists profile_sync_accounts_username_key_idx
    on public.profile_sync_accounts (username_key);

alter table public.profile_sync_accounts enable row level security;

-- Intentionally no public RLS policies.
-- All account/profile-sync access should go through Ascendra's Flask backend
-- using the server-only Supabase service-role key.
