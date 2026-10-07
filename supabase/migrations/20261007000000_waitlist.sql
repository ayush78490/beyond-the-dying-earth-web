-- Waitlist: one row per X account, linked to a wallet on Robinhood Chain.
-- Both tables have RLS on and no policies: only the edge functions (service role) touch them.

-- In-flight "Continue with X" sign-ins (OAuth 2.0 PKCE). Short-lived; deleted once claimed.
create table if not exists public.x_auth_requests (
  id            uuid primary key default gen_random_uuid(),
  state         text not null unique,
  code_verifier text,
  -- sha-256 of a secret held only by the browser tab that started the sign-in
  key_hash      text not null unique,
  origin        text not null,
  x_id          text,
  x_username    text,
  x_name        text,
  x_avatar      text,
  completed_at  timestamptz,
  expires_at    timestamptz not null default now() + interval '15 minutes',
  created_at    timestamptz not null default now()
);
alter table public.x_auth_requests enable row level security;

create table if not exists public.waitlist (
  id             uuid primary key default gen_random_uuid(),
  x_id           text not null unique,
  x_username     text not null,
  x_name         text,
  x_avatar       text,
  wallet_address text not null,
  chain_id       integer not null,
  -- the wallet's signature over the link message: proof the pilot owns the address
  signature      text not null,
  source         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- one wallet per X account (case-insensitive: addresses may arrive checksummed or not)
create unique index if not exists waitlist_wallet_chain_key
  on public.waitlist (lower(wallet_address), chain_id);
alter table public.waitlist enable row level security;
