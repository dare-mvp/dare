-- pg_cron scheduled jobs for maintenance and game-clock enforcement.
-- Requires pg_cron extension (pre-installed on Supabase hosted projects).
-- Local dev: run `supabase db reset` to apply; cron jobs won't actually fire locally.

create extension if not exists pg_cron with schema extensions;
grant usage on schema cron to postgres;

create or replace function public.expire_court_sessions_action()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session record;
  v_winner_id uuid;
  v_expired_count integer := 0;
begin
  for v_session in
    select
      cs.id as court_session_id,
      cs.dare_id,
      cs.score_a,
      cs.score_b,
      d.issuer_id,
      d.challenger_id
    from court_sessions cs
    join dares d on d.id = cs.dare_id
    where cs.phase = 'active'
      and d.status = 'active'
      and cs.server_start_time is not null
      and cs.server_start_time + make_interval(secs => d.duration_seconds) <= now()
    for update of cs, d
  loop
    v_winner_id := case
      when v_session.score_a > v_session.score_b then v_session.issuer_id
      when v_session.score_b > v_session.score_a then v_session.challenger_id
      else null
    end;

    update court_sessions
      set phase = 'completed',
          server_end_time = coalesce(server_end_time, now())
    where id = v_session.court_session_id;

    update dares
      set status = 'completed',
          winner_id = v_winner_id,
          completed_at = coalesce(completed_at, now()),
          dispute_deadline_at = coalesce(dispute_deadline_at, now() + interval '10 minutes')
    where id = v_session.dare_id;

    v_expired_count := v_expired_count + 1;
  end loop;

  return v_expired_count;
end;
$$;

revoke all on function public.expire_court_sessions_action()
from public, anon, authenticated;

grant execute on function public.expire_court_sessions_action()
to service_role, postgres;

-- Purge expired idempotency records hourly to keep the table lean.
select cron.schedule(
  'purge-idempotency-records',
  '0 * * * *',
  $$
    delete from public.idempotency_records
    where expires_at < now();
  $$
);

-- Mark active court sessions as timed-out every minute.
-- The RPC checks server_end_time; no-ops if no sessions have expired.
select cron.schedule(
  'expire-court-sessions',
  '* * * * *',
  $$
    select public.expire_court_sessions_action();
  $$
);
