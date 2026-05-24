-- ============================================================
-- rate_limits_webhooks_cron_jury_guards.sql
-- Action rate limits, cron verification, Paystack withdrawal
-- webhook support primitives, and jury DB-level guards.
-- ============================================================

create table if not exists public.action_rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null,
  window_start timestamptz not null,
  window_seconds integer not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, scope, window_start, window_seconds),
  constraint action_rate_limits_scope_nonempty check (char_length(scope) between 3 and 100),
  constraint action_rate_limits_window_positive check (window_seconds > 0),
  constraint action_rate_limits_count_nonnegative check (request_count >= 0)
);

create index if not exists action_rate_limits_updated_idx
  on public.action_rate_limits (updated_at);

alter table public.action_rate_limits enable row level security;

drop policy if exists "action_rate_limits_no_user_access"
  on public.action_rate_limits;

create policy "action_rate_limits_no_user_access"
  on public.action_rate_limits
  for all
  using (false)
  with check (false);

create or replace function public.consume_action_rate_limit(
  p_user_id uuid,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  limit_count integer,
  remaining integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'invalid_rate_limit' using errcode = 'P0001';
  end if;

  if p_scope is null or char_length(btrim(p_scope)) < 3 then
    raise exception 'invalid_rate_limit' using errcode = 'P0001';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into action_rate_limits (
    user_id,
    scope,
    window_start,
    window_seconds,
    request_count
  )
  values (
    p_user_id,
    btrim(p_scope),
    v_window_start,
    p_window_seconds,
    1
  )
  on conflict (user_id, scope, window_start, window_seconds)
  do update
    set request_count = action_rate_limits.request_count + 1,
        updated_at = now()
  returning request_count into v_count;

  allowed := v_count <= p_limit;
  limit_count := p_limit;
  remaining := greatest(0, p_limit - v_count);
  reset_at := v_window_start + make_interval(secs => p_window_seconds);
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from (reset_at - now())))::integer)
  end;

  return next;
end;
$$;

revoke all on function public.consume_action_rate_limit(uuid, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_action_rate_limit(uuid, text, integer, integer)
to service_role;

create or replace function public.jury_vote_immutability_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'jury_votes rows are immutable. Insert a new administrative resolution instead.'
    using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_jury_vote_immutability on public.jury_votes;
create trigger trg_jury_vote_immutability
  before update or delete on public.jury_votes
  for each row execute function public.jury_vote_immutability_guard();

revoke all on function public.jury_vote_immutability_guard()
from public, anon, authenticated;

create or replace function public.jury_assignment_participant_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from jury_cases jc
    join dares d on d.id = jc.dare_id
    where jc.id = new.jury_case_id
      and new.juror_id in (d.issuer_id, d.challenger_id)
  ) then
    raise exception 'jury_participant_not_allowed' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_jury_assignment_participant_guard
  on public.jury_assignments;
create trigger trg_jury_assignment_participant_guard
  before insert or update of jury_case_id, juror_id on public.jury_assignments
  for each row execute function public.jury_assignment_participant_guard();

revoke all on function public.jury_assignment_participant_guard()
from public, anon, authenticated;

create or replace function public.assign_jury_case_action(
  p_admin_user_id uuid,
  p_jury_case_id uuid,
  p_assignment_count integer default null
)
returns table (
  jury_case_id uuid,
  dare_id uuid,
  status text,
  dare_status text,
  assigned_count integer,
  votes_needed integer,
  due_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin profiles%rowtype;
  v_case jury_cases%rowtype;
  v_dare dares%rowtype;
  v_target_count integer;
  v_due_at timestamptz := now() + interval '24 hours';
  v_needed integer;
  v_juror record;
  v_inserted_count integer := 0;
begin
  select *
    into v_admin
  from profiles p
  where p.id = p_admin_user_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  if not v_admin.is_admin then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  select *
    into v_case
  from jury_cases jc
  where jc.id = p_jury_case_id
  for update;

  if not found then
    raise exception 'jury_case_not_found' using errcode = 'P0001';
  end if;

  if v_case.status not in ('filed', 'accepted_for_review', 'jury_assignment', 'jury_voting') then
    raise exception 'invalid_jury_case_state' using errcode = 'P0001';
  end if;

  select *
    into v_dare
  from dares d
  where d.id = v_case.dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('dispute_pending', 'jury_open') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  update jury_assignments ja
    set status = 'cancelled'
  where ja.jury_case_id = p_jury_case_id
    and ja.juror_id in (v_dare.issuer_id, v_dare.challenger_id)
    and ja.status in ('assigned', 'claimed');

  v_target_count := coalesce(p_assignment_count, v_case.votes_needed);
  if v_target_count not in (3, 5, 7) then
    raise exception 'invalid_assignment_count' using errcode = 'P0001';
  end if;

  if v_target_count < v_case.votes_needed then
    raise exception 'invalid_assignment_count' using errcode = 'P0001';
  end if;

  v_needed := greatest(
    0,
    v_target_count - (
      select count(*)::integer
      from jury_assignments ja
      where ja.jury_case_id = p_jury_case_id
        and ja.status in ('assigned', 'claimed', 'completed')
    )
  );

  for v_juror in
    select p.id
    from profiles p
    where p.jury_opt_in = true
      and p.account_status = 'active'
      and p.risk_status = 'normal'
      and p.trust_score >= 500
      and p.completed_dares >= 10
      and p.kyc_tier in ('kyc1', 'kyc2', 'kyc3')
      and p.id <> v_dare.issuer_id
      and p.id <> v_dare.challenger_id
      and (
        cardinality(p.jury_categories) = 0
        or v_dare.category = any(p.jury_categories)
      )
      and (
        select count(*)
        from jury_assignments ja
        where ja.juror_id = p.id
          and ja.status in ('assigned', 'claimed')
      ) < 3
      and not exists (
        select 1
        from jury_assignments existing
        where existing.jury_case_id = p_jury_case_id
          and existing.juror_id = p.id
          and existing.status in ('assigned', 'claimed', 'completed')
      )
      and not exists (
        select 1
        from user_devices juror_device
        join user_devices blocked_device
          on blocked_device.device_fingerprint = juror_device.device_fingerprint
        where juror_device.user_id = p.id
          and blocked_device.user_id in (v_dare.issuer_id, v_dare.challenger_id)
      )
    order by random()
  loop
    exit when v_inserted_count >= v_needed;

    if exists (
      select 1
      from user_devices candidate_device
      join user_devices selected_device
        on selected_device.device_fingerprint = candidate_device.device_fingerprint
      join jury_assignments selected_assignment
        on selected_assignment.juror_id = selected_device.user_id
      where candidate_device.user_id = v_juror.id
        and selected_assignment.jury_case_id = p_jury_case_id
        and selected_assignment.status in ('assigned', 'claimed', 'completed')
    ) then
      continue;
    end if;

    insert into jury_assignments (
      jury_case_id,
      juror_id,
      status,
      blind_side_mapping,
      due_at
    )
    values (
      p_jury_case_id,
      v_juror.id,
      'assigned',
      case
        when random() < 0.5 then jsonb_build_object('A', 'issuer', 'B', 'challenger')
        else jsonb_build_object('A', 'challenger', 'B', 'issuer')
      end,
      v_due_at
    );

    insert into notifications (
      user_id,
      type,
      title,
      body,
      action
    )
    values (
      v_juror.id,
      'jury_invite',
      'Jury case assigned',
      'A dispute case is ready for your review.',
      jsonb_build_object(
        'type', 'jury_case',
        'juryCaseId', p_jury_case_id,
        'dareId', v_dare.id
      )
    );

    v_inserted_count := v_inserted_count + 1;
  end loop;

  if (
    select count(*)::integer
    from jury_assignments ja
    where ja.jury_case_id = p_jury_case_id
      and ja.status in ('assigned', 'claimed', 'completed')
  ) < v_case.votes_needed then
    raise exception 'jury_pool_insufficient' using errcode = 'P0001';
  end if;

  update jury_cases jc
    set status = 'jury_voting'
  where jc.id = p_jury_case_id
  returning * into v_case;

  update dares d
    set status = 'jury_open'
  where d.id = v_dare.id
  returning * into v_dare;

  jury_case_id := v_case.id;
  dare_id := v_dare.id;
  status := v_case.status;
  dare_status := v_dare.status;
  assigned_count := (
    select count(*)::integer
    from jury_assignments ja
    where ja.jury_case_id = p_jury_case_id
      and ja.status in ('assigned', 'claimed', 'completed')
  );
  votes_needed := v_case.votes_needed;
  due_at := v_due_at;
  return next;
end;
$$;

revoke all on function public.assign_jury_case_action(uuid, uuid, integer)
from public, anon, authenticated;
grant execute on function public.assign_jury_case_action(uuid, uuid, integer)
to service_role;

create or replace function public.verify_required_cron_jobs()
returns table (
  job_name text,
  active boolean,
  cron_schedule text,
  command text
)
language sql
security definer
set search_path = public, cron, pg_temp
as $$
  with required(job_name, cron_schedule) as (
    values
      ('purge-idempotency-records', '0 * * * *'),
      ('expire-court-sessions', '* * * * *'),
      ('auto-settle-expired-dares', '* * * * *'),
      ('forfeit-stale-court-sessions', '* * * * *'),
      ('expire-jury-cases', '* * * * *'),
      ('purge-action-rate-limits', '15 * * * *')
  )
  select
    required.job_name,
    coalesce(cron.job.active, false) as active,
    cron.job.schedule as cron_schedule,
    cron.job.command
  from required
  left join cron.job on cron.job.jobname = required.job_name
    and cron.job.schedule = required.cron_schedule;
$$;

revoke all on function public.verify_required_cron_jobs()
from public, anon, authenticated;
grant execute on function public.verify_required_cron_jobs()
to service_role, postgres;

do $$
declare
  v_job record;
begin
  for v_job in
    select jobid
    from cron.job
    where jobname in (
      'purge-idempotency-records',
      'expire-court-sessions',
      'auto-settle-expired-dares',
      'forfeit-stale-court-sessions',
      'expire-jury-cases',
      'purge-action-rate-limits'
    )
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'purge-idempotency-records',
  '0 * * * *',
  $$
    delete from public.idempotency_records
    where expires_at < now();
  $$
);

select cron.schedule(
  'expire-court-sessions',
  '* * * * *',
  $$
    select public.expire_court_sessions_action();
  $$
);

select cron.schedule(
  'auto-settle-expired-dares',
  '* * * * *',
  $$
    select public.auto_settle_expired_dares_action();
  $$
);

select cron.schedule(
  'forfeit-stale-court-sessions',
  '* * * * *',
  $$
    select public.forfeit_stale_court_sessions_action();
  $$
);

select cron.schedule(
  'expire-jury-cases',
  '* * * * *',
  $$
    select public.expire_jury_cases_action();
  $$
);

select cron.schedule(
  'purge-action-rate-limits',
  '15 * * * *',
  $$
    delete from public.action_rate_limits
    where updated_at < now() - interval '2 days';
  $$
);
