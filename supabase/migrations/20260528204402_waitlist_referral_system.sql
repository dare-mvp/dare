-- Referral system for the I Dare You challenge campaign.
-- Adds referral_code (unique per participant) and referred_by (code of the referrer).
-- source tracks where the signup came from (homepage vs challenge page).

alter table public.marketing_waitlist
  add column if not exists referral_code text,
  add column if not exists referred_by   text,
  add column if not exists source        text not null default 'homepage';

-- Partial unique index: allows multiple NULLs, enforces uniqueness on non-null codes.
create unique index if not exists marketing_waitlist_referral_code_unique_idx
  on public.marketing_waitlist (referral_code)
  where referral_code is not null;

-- Index for counting referrals by referrer.
create index if not exists marketing_waitlist_referred_by_idx
  on public.marketing_waitlist (referred_by)
  where referred_by is not null;
