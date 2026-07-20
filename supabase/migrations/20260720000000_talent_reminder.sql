-- Talent challenge reminder tracking.
-- Nudges participants who joined the /talent waitlist but have not yet
-- submitted a claim (no talent_claim_reviews row). Sent once per participant,
-- 3+ days after they joined, by /api/cron/talent-reminder.

alter table public.marketing_waitlist
  add column if not exists talent_reminder_sent_at timestamptz;

create index if not exists marketing_waitlist_talent_reminder_pending_idx
  on public.marketing_waitlist (created_at)
  where source = 'talent' and talent_reminder_sent_at is null;

-- Expose the flag in the progress view so admins can see reminder state too.
drop view if exists public.talent_challenge_progress;

create view public.talent_challenge_progress as
select
  mw.referral_code,
  mw.email,
  mw.created_at                                                     as joined_at,
  mw.talent_reminder_sent_at,
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

-- Returns talent participants eligible for the "you haven't finished yet" nudge:
-- joined 3+ days ago, never submitted a claim, never reminded.
create or replace function public.get_talent_reminder_eligible()
returns table (email text, referral_code text)
language sql
security definer
set search_path = public
as $$
  select mw.email, mw.referral_code
  from marketing_waitlist mw
  where mw.source = 'talent'
    and mw.talent_reminder_sent_at is null
    and mw.created_at <= now() - interval '3 days'
    and not exists (
      select 1
      from talent_claim_reviews tcr
      where tcr.referral_code = mw.referral_code
    )
  order by mw.created_at asc;
$$;

revoke all on function public.get_talent_reminder_eligible() from public, anon, authenticated;
grant execute on function public.get_talent_reminder_eligible() to service_role;
