-- For each legend-tier player, counts only the referrals they made AFTER
-- selecting Legend — those are the only ones that count for Task A (refer 5 friends).

create or replace view public.legend_referral_progress as
select
  cts.referral_code,
  mw.email,
  cts.created_at                  as legend_selected_at,
  count(ref.id)::int              as legend_referred_count,
  (count(ref.id) >= 5)            as task_a_complete
from public.challenge_tier_selections cts
inner join public.marketing_waitlist mw
  on mw.referral_code = cts.referral_code
left join public.marketing_waitlist ref
  on ref.referred_by  = cts.referral_code
 and ref.created_at  >= cts.created_at
where cts.tier = 'legend'
group by cts.referral_code, mw.email, cts.created_at;

-- Only service_role (admin server actions) may read this view.
revoke all on public.legend_referral_progress from public, anon, authenticated;
grant select on public.legend_referral_progress to service_role;
