-- auto_settle_expired_dares_action: settles completed dares whose dispute
-- window has closed and have no active jury process.
-- Registered as a per-minute pg_cron job alongside expire-court-sessions.

create or replace function public.auto_settle_expired_dares_action()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare   record;
  v_settled integer := 0;
begin
  for v_dare in
    select d.id, d.issuer_id
    from dares d
    where d.status = 'completed'
      and d.dispute_deadline_at is not null
      and d.dispute_deadline_at <= now()
      and not exists (
        select 1
        from jury_cases jc
        where jc.dare_id = d.id
          and jc.status in ('filed', 'jury_assignment', 'jury_voting', 'settlement_pending')
      )
    for update of d
  loop
    begin
      perform *
      from settle_dare_action(v_dare.issuer_id, v_dare.id)
      limit 1;

      v_settled := v_settled + 1;
    exception
      when others then null;  -- skip already-settled or escrow-missing dares
    end;
  end loop;

  return v_settled;
end;
$$;

revoke all on function public.auto_settle_expired_dares_action()
from public, anon, authenticated;

grant execute on function public.auto_settle_expired_dares_action()
to service_role, postgres;

select cron.schedule(
  'auto-settle-expired-dares',
  '* * * * *',
  $$
    select public.auto_settle_expired_dares_action();
  $$
);
