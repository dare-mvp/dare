-- Replace legend_claim_reviews with a unified table: challenge_claim_reviews
-- PK is (referral_code, tier) so standard, champion, and legend claims are separate rows.

drop view if exists public.legend_referral_progress;

create table public.challenge_claim_reviews (
  referral_code text not null,
  tier          text not null,
  status        text not null default 'pending',
  reviewed_at   timestamptz,
  paid_at       timestamptz,
  primary key (referral_code, tier),
  constraint challenge_claim_reviews_status_check
    check (status in ('pending', 'approved', 'paid', 'rejected')),
  constraint challenge_claim_reviews_tier_check
    check (tier in ('standard', 'champion', 'legend')),
  constraint challenge_claim_reviews_referral_code_format
    check (referral_code ~ '^[A-Z0-9]{8}$')
);

alter table public.challenge_claim_reviews enable row level security;

create policy "challenge_claim_reviews_service_only"
  on public.challenge_claim_reviews
  for all using (false) with check (false);

insert into public.challenge_claim_reviews (referral_code, tier, status, reviewed_at, paid_at)
select referral_code, 'legend', status, reviewed_at, paid_at
from public.legend_claim_reviews
on conflict do nothing;

drop table public.legend_claim_reviews;

-- Standard player progress view
create view public.standard_referral_progress as
select
  cts.referral_code,
  mw.email,
  cts.created_at as tier_selected_at,
  (
    select count(*)::int
    from public.marketing_waitlist r
    where r.referred_by = cts.referral_code
  ) as referred_count,
  (
    select count(*) >= 2
    from public.marketing_waitlist r
    where r.referred_by = cts.referral_code
  ) as task_ref_complete,
  coalesce(ccr.status, 'pending') as claim_status
from public.challenge_tier_selections cts
inner join public.marketing_waitlist mw on mw.referral_code = cts.referral_code
left join public.challenge_claim_reviews ccr
  on ccr.referral_code = cts.referral_code and ccr.tier = 'standard'
where cts.tier = 'standard';

revoke all on public.standard_referral_progress from public, anon, authenticated;
grant select on public.standard_referral_progress to service_role;

-- Champion player progress view
create view public.champion_referral_progress as
select
  cts.referral_code,
  mw.email,
  cts.created_at as tier_selected_at,
  (
    select count(*)::int
    from public.marketing_waitlist r
    where r.referred_by = cts.referral_code
  ) as referred_count,
  (
    select count(*) >= 3
    from public.marketing_waitlist r
    where r.referred_by = cts.referral_code
  ) as task_ref_complete,
  coalesce(ccr.status, 'pending') as claim_status
from public.challenge_tier_selections cts
inner join public.marketing_waitlist mw on mw.referral_code = cts.referral_code
left join public.challenge_claim_reviews ccr
  on ccr.referral_code = cts.referral_code and ccr.tier = 'champion'
where cts.tier = 'champion';

revoke all on public.champion_referral_progress from public, anon, authenticated;
grant select on public.champion_referral_progress to service_role;

-- Rebuild legend view using challenge_claim_reviews
create view public.legend_referral_progress as
select
  cts.referral_code,
  mw.email,
  cts.created_at as legend_selected_at,
  (
    select count(*)::int
    from public.marketing_waitlist r
    where r.referred_by = cts.referral_code
      and r.created_at >= cts.created_at
  ) as legend_referred_count,
  (
    select count(*)::int
    from public.marketing_waitlist r
    where r.referred_by = cts.referral_code
  ) as total_referred_count,
  (
    select count(*) >= 5
    from public.marketing_waitlist r
    where r.referred_by = cts.referral_code
      and r.created_at >= cts.created_at
  ) as task_a_complete,
  (
    select array_to_string(array_agg(prior.tier order by prior.tier desc), ' + ')
    from public.challenge_tier_selections prior
    where prior.referral_code = cts.referral_code
      and prior.tier in ('standard', 'champion')
  ) as prior_tiers,
  coalesce(ccr.status, 'pending') as claim_status
from public.challenge_tier_selections cts
inner join public.marketing_waitlist mw on mw.referral_code = cts.referral_code
left join public.challenge_claim_reviews ccr
  on ccr.referral_code = cts.referral_code and ccr.tier = 'legend'
where cts.tier = 'legend';

revoke all on public.legend_referral_progress from public, anon, authenticated;
grant select on public.legend_referral_progress to service_role;
