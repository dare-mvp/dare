-- ============================================================
-- 0001_extensions.sql
-- Required Postgres extensions and shared helper functions.
-- Must run first — all other migrations depend on these.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists pgcrypto;   -- gen_random_uuid(), crypt()
create extension if not exists citext;     -- case-insensitive username comparisons

-- Optional: enable after MVP if fuzzy username search is needed
-- create extension if not exists pg_trgm;

-- ── updated_at helper ────────────────────────────────────────
-- Single trigger function shared by all mutable tables.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ── Ledger immutability guard ────────────────────────────────
-- Prevents UPDATE or DELETE on ledger_entries for any caller
-- that is not the service role. Corrections use compensating entries.
create or replace function ledger_immutability_guard()
returns trigger
language plpgsql
security definer
as $$
begin
  raise exception
    'ledger_entries rows are immutable. Use a compensating entry instead.'
    using errcode = 'P0001';
end;
$$;

revoke all on function public.ledger_immutability_guard() from public, anon, authenticated;
