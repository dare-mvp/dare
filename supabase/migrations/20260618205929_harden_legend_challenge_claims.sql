-- Harden Legend email idempotency and reminder eligibility.

alter table public.marketing_waitlist
  add column if not exists legend_email_sent_at timestamptz,
  add column if not exists closing_email_sent_at timestamptz;

create index if not exists marketing_waitlist_legend_email_unsent_idx
  on public.marketing_waitlist (created_at)
  where legend_email_sent_at is null
    and referral_code is not null
    and email is not null;

create index if not exists marketing_waitlist_closing_email_unsent_idx
  on public.marketing_waitlist (created_at)
  where closing_email_sent_at is null
    and referral_code is not null
    and email is not null;

create or replace function public.get_legend_eligible_unsent()
returns table (email text, referral_code text)
language sql
security definer
set search_path = public
as $$
  select mw.email, mw.referral_code
  from public.marketing_waitlist mw
  where mw.email is not null
    and mw.referral_code is not null
    and mw.legend_email_sent_at is null
    and not exists (
      select 1
      from public.challenge_tier_selections legend_row
      where legend_row.referral_code = mw.referral_code
        and legend_row.tier = 'legend'
    )
    and (
      (
        exists (
          select 1
          from public.challenge_tier_selections standard_row
          where standard_row.referral_code = mw.referral_code
            and standard_row.tier = 'standard'
        )
        and (
          select count(*)::int
          from public.marketing_waitlist ref
          where ref.referred_by = mw.referral_code
        ) >= 2
      )
      or
      (
        exists (
          select 1
          from public.challenge_tier_selections champion_row
          where champion_row.referral_code = mw.referral_code
            and champion_row.tier = 'champion'
        )
        and (
          select count(*)::int
          from public.marketing_waitlist ref
          where ref.referred_by = mw.referral_code
        ) >= 3
      )
    )
  order by mw.created_at asc;
$$;

revoke all on function public.get_legend_eligible_unsent() from public, anon, authenticated;
grant execute on function public.get_legend_eligible_unsent() to service_role;

create or replace function public.get_legend_closing_eligible()
returns table (email text, referral_code text)
language sql
security definer
set search_path = public
as $$
  select mw.email, mw.referral_code
  from public.marketing_waitlist mw
  where mw.email is not null
    and mw.referral_code is not null
    and mw.closing_email_sent_at is null
    and not exists (
      select 1
      from public.challenge_claim_reviews review
      where review.referral_code = mw.referral_code
        and review.tier = 'legend'
    )
    and (
      (
        exists (
          select 1
          from public.challenge_tier_selections standard_row
          where standard_row.referral_code = mw.referral_code
            and standard_row.tier = 'standard'
        )
        and (
          select count(*)::int
          from public.marketing_waitlist ref
          where ref.referred_by = mw.referral_code
        ) >= 2
      )
      or
      (
        exists (
          select 1
          from public.challenge_tier_selections champion_row
          where champion_row.referral_code = mw.referral_code
            and champion_row.tier = 'champion'
        )
        and (
          select count(*)::int
          from public.marketing_waitlist ref
          where ref.referred_by = mw.referral_code
        ) >= 3
      )
    )
  order by mw.created_at asc;
$$;

revoke all on function public.get_legend_closing_eligible() from public, anon, authenticated;
grant execute on function public.get_legend_closing_eligible() to service_role;
