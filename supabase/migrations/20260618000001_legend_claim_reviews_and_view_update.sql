-- 1. Claim review tracking table
create table public.legend_claim_reviews (
  referral_code text primary key,
  status        text        not null default 'pending',
  reviewed_at   timestamptz,
  paid_at       timestamptz,
  constraint legend_claim_reviews_status_check
    check (status in ('pending', 'approved', 'paid', 'rejected')),
  constraint legend_claim_reviews_referral_code_format
    check (referral_code ~ '^[A-Z0-9]{8}$')
);

alter table public.legend_claim_reviews enable row level security;

create policy "legend_claim_reviews_service_only"
  on public.legend_claim_reviews
  for all using (false) with check (false);

-- 2. Drop and rebuild the view with new columns
drop view if exists public.legend_referral_progress;

create view public.legend_referral_progress as
select
  cts.referral_code,
  mw.email,
  cts.created_at                                                as legend_selected_at,
  -- referrals made AFTER legend selection (Task A)
  (
    select count(*)::int
    from public.marketing_waitlist r
    where r.referred_by = cts.referral_code
      and r.created_at >= cts.created_at
  )                                                             as legend_referred_count,
  -- all-time referrals
  (
    select count(*)::int
    from public.marketing_waitlist r
    where r.referred_by = cts.referral_code
  )                                                             as total_referred_count,
  -- Task A gate
  (
    select count(*) >= 5
    from public.marketing_waitlist r
    where r.referred_by = cts.referral_code
      and r.created_at >= cts.created_at
  )                                                             as task_a_complete,
  -- prior tiers (standard, champion, or standard + champion)
  (
    select array_to_string(
      array_agg(prior.tier order by prior.tier desc),
      ' + '
    )
    from public.challenge_tier_selections prior
    where prior.referral_code = cts.referral_code
      and prior.tier in ('standard', 'champion')
  )                                                             as prior_tiers,
  -- claim status
  coalesce(lcr.status, 'pending')                              as claim_status
from public.challenge_tier_selections cts
inner join public.marketing_waitlist mw
  on mw.referral_code = cts.referral_code
left join public.legend_claim_reviews lcr
  on lcr.referral_code = cts.referral_code
where cts.tier = 'legend';

revoke all on public.legend_referral_progress from public, anon, authenticated;
grant select on public.legend_referral_progress to service_role;
