-- Fixes for the Show Me Your Talent challenge migration:
-- 1. Add 'talent' to the allowed source values
-- 2. Relax the global email unique constraint to per-(email, source) — allows the same
--    email to participate in multiple concurrent campaigns independently
-- 3. Scope referral counts in talent_challenge_progress to source='talent' only

-- ── 1. Source constraint ──────────────────────────────────────────────────────

alter table public.marketing_waitlist
  drop constraint if exists marketing_waitlist_source_allowed;

alter table public.marketing_waitlist
  add constraint marketing_waitlist_source_allowed
  check (source in ('homepage', 'challenge', 'talent'))
  not valid;

-- ── 2. Email unique: global → per-source ─────────────────────────────────────
-- Drop the original global unique constraint and its supporting index.
-- Replace with a composite (email, source) unique index so the same email address
-- can join both the I Dare You challenge and the talent challenge separately.

alter table public.marketing_waitlist
  drop constraint if exists marketing_waitlist_email_key;

drop index if exists public.marketing_waitlist_email_unique_idx;

create unique index if not exists marketing_waitlist_email_source_unique_idx
  on public.marketing_waitlist (email, source);

-- ── 3. Referral count scoping in talent_challenge_progress ───────────────────
-- The original view counted all rows where referred_by matches, regardless of source.
-- This could let a challenge referral code count toward the talent reward.
-- Fix: add r.source = 'talent' to both referral subqueries.

drop view if exists public.talent_challenge_progress;

create view public.talent_challenge_progress as
select
  mw.referral_code,
  mw.email,
  mw.created_at                                                     as joined_at,
  (
    select count(*)::int
    from public.marketing_waitlist r
    where r.referred_by = mw.referral_code
      and r.source = 'talent'
  )                                                                 as referred_count,
  (
    select count(*) >= 3
    from public.marketing_waitlist r
    where r.referred_by = mw.referral_code
      and r.source = 'talent'
  )                                                                 as ref_task_complete,
  coalesce(tcr.status, 'pending')                                   as claim_status,
  tcr.challenger_video_url,
  tcr.response_video_url,
  tcr.submitted_at                                                  as claim_submitted_at,
  tcr.reviewed_at,
  tcr.paid_at,
  tcr.reviewer_notes
from public.marketing_waitlist mw
left join public.talent_claim_reviews tcr
  on tcr.referral_code = mw.referral_code
where mw.source = 'talent'
order by mw.created_at desc;

revoke all on public.talent_challenge_progress from public, anon, authenticated;
grant select on public.talent_challenge_progress to service_role;
