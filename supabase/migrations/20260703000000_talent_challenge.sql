-- Show Me Your Talent Dare Challenge
-- Separate from the I Dare You Challenge.
-- Uses marketing_waitlist with source='talent' for participants.
-- talent_claim_reviews stores video proof links and admin review status.

-- ── Claim reviews table ──────────────────────────────────────────────────────
-- Created by admin when they receive a DM claim with proof video links.
-- One row per referral_code (single tier — no per-tier key needed).

create table public.talent_claim_reviews (
  referral_code        text        not null primary key,
  challenger_video_url text        not null,
  response_video_url   text        not null,
  status               text        not null default 'pending',
  submitted_at         timestamptz not null default now(),
  reviewed_at          timestamptz,
  paid_at              timestamptz,
  reviewer_notes       text,
  constraint talent_claim_reviews_status_check
    check (status in ('pending', 'approved', 'paid', 'rejected')),
  constraint talent_claim_reviews_referral_code_format
    check (referral_code ~ '^[A-Z0-9]{8}$')
);

alter table public.talent_claim_reviews enable row level security;

create policy "talent_claim_reviews_service_only"
  on public.talent_claim_reviews
  for all using (false) with check (false);

-- ── Progress view ────────────────────────────────────────────────────────────
-- Joins talent waitlist participants with their referral count and claim status.
-- Used by the admin panel at /admin/talent.

create view public.talent_challenge_progress as
select
  mw.referral_code,
  mw.email,
  mw.created_at                                                     as joined_at,
  (
    select count(*)::int
    from public.marketing_waitlist r
    where r.referred_by = mw.referral_code
  )                                                                 as referred_count,
  (
    select count(*) >= 3
    from public.marketing_waitlist r
    where r.referred_by = mw.referral_code
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

-- ── Index for fast talent participant queries ─────────────────────────────────
create index if not exists marketing_waitlist_source_talent_idx
  on public.marketing_waitlist (source, created_at desc)
  where source = 'talent';
