-- Returns waitlist members who completed Standard or Champion
-- but have not yet selected Legend (i.e. the UI hasn't triggered their email).
-- Used by the /api/cron/send-legend-welcome endpoint on June 15.

create or replace function public.get_legend_eligible_unsent()
returns table (email text, referral_code text)
language sql
security definer
set search_path = public
as $$
  select distinct mw.email, mw.referral_code
  from marketing_waitlist mw
  inner join challenge_tier_selections cts
    on cts.referral_code = mw.referral_code
    and cts.tier in ('standard', 'champion')
  where mw.email is not null
    and mw.referral_code is not null
    and not exists (
      select 1
      from challenge_tier_selections legend_row
      where legend_row.referral_code = mw.referral_code
        and legend_row.tier = 'legend'
    );
$$;

revoke all on function public.get_legend_eligible_unsent() from public, anon, authenticated;
grant execute on function public.get_legend_eligible_unsent() to service_role;
