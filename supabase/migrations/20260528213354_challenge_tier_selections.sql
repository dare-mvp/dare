-- Records which tier each challenge participant chose.
-- Linked to marketing_waitlist via referral_code when available.
-- ip_hash aids fraud detection without storing raw IPs.

create table if not exists public.challenge_tier_selections (
  id            uuid        primary key default gen_random_uuid(),
  referral_code text,
  tier          text        not null,
  ip_hash       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint challenge_tier_selections_tier_check
    check (tier in ('standard', 'champion')),
  constraint challenge_tier_selections_referral_code_format
    check (referral_code is null or referral_code ~ '^[A-Z0-9]{8}$'),
  constraint challenge_tier_selections_ip_hash_format
    check (ip_hash is null or ip_hash ~ '^[a-f0-9]{64}$')
);

-- One selection per referral code; upsert updates their tier if they change it.
create unique index if not exists challenge_tier_selections_referral_code_unique_idx
  on public.challenge_tier_selections (referral_code)
  where referral_code is not null;

-- Index for analytics queries.
create index if not exists challenge_tier_selections_tier_idx
  on public.challenge_tier_selections (tier);

-- RLS: fully locked; only service_role via server actions can touch this table.
alter table public.challenge_tier_selections enable row level security;

drop policy if exists "challenge_tier_selections_service_only"
  on public.challenge_tier_selections;

create policy "challenge_tier_selections_service_only"
  on public.challenge_tier_selections
  for all
  using (false)
  with check (false);
