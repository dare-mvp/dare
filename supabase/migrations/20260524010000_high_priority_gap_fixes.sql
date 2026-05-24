-- ============================================================
-- high_priority_gap_fixes.sql
-- Jury anti-collusion, ready-up KYC, and RG cooling-off fixes.
-- ============================================================

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
    select count(*)
    from jury_assignments ja
    where ja.jury_case_id = p_jury_case_id
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
  );
  votes_needed := v_case.votes_needed;
  due_at := v_due_at;
  return next;
end;
$$;

create or replace function public.ready_dare_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_round_count integer default 5
)
returns table (
  dare_id uuid,
  court_session_id uuid,
  dare_status text,
  phase text,
  player_a_ready boolean,
  player_b_ready boolean,
  server_start_time timestamptz,
  server_end_time timestamptz,
  assigned_rounds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_issuer_profile profiles%rowtype;
  v_challenger_profile profiles%rowtype;
  v_question_count integer;
  v_existing_rounds integer;
  v_now timestamptz := now();
begin
  if p_round_count < 1 or p_round_count > 20 then
    raise exception 'invalid_round_count' using errcode = 'P0001';
  end if;

  select *
    into v_dare
  from dares
  where id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_user_id <> v_dare.issuer_id
    and p_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  if v_dare.challenger_id is null then
    raise exception 'dare_not_acceptable' using errcode = 'P0001';
  end if;

  select *
    into v_issuer_profile
  from profiles
  where id = v_dare.issuer_id;

  select *
    into v_challenger_profile
  from profiles
  where id = v_dare.challenger_id;

  if v_issuer_profile.kyc_tier = 'kyc0'
    or v_challenger_profile.kyc_tier = 'kyc0' then
    raise exception 'kyc_required' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('ready_check', 'active') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  select *
    into v_court
  from court_sessions
  where court_sessions.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if v_court.phase not in ('ready_check', 'active') then
    raise exception 'invalid_court_state' using errcode = 'P0001';
  end if;

  if p_user_id = v_dare.issuer_id then
    v_court.player_a_ready := true;
    v_court.player_a_heartbeat_at := v_now;
  else
    v_court.player_b_ready := true;
    v_court.player_b_heartbeat_at := v_now;
  end if;

  select count(*)
    into v_existing_rounds
  from dare_quiz_rounds dqr
  where dqr.dare_id = p_dare_id;

  if v_court.player_a_ready and v_court.player_b_ready
    and v_court.phase = 'ready_check' then
    if v_existing_rounds = 0 then
      select count(*)
        into v_question_count
      from quiz_questions qq
      where qq.active = true
        and qq.category = v_dare.category;

      if v_question_count < p_round_count then
        raise exception 'question_pool_insufficient' using errcode = 'P0001';
      end if;

      insert into dare_quiz_rounds (
        dare_id,
        question_id,
        round_index,
        question_delivered_at_a,
        question_delivered_at_b
      )
      select
        p_dare_id,
        selected_questions.id,
        (row_number() over (order by selected_questions.random_order) - 1)::smallint,
        v_now,
        v_now
      from (
        select qq.id, random() as random_order
        from quiz_questions qq
        where qq.active = true
          and qq.category = v_dare.category
        order by random_order
        limit p_round_count
      ) selected_questions;
    end if;

    select count(*)
      into v_existing_rounds
    from dare_quiz_rounds dqr
    where dqr.dare_id = p_dare_id;

    v_court.phase := 'active';
    v_court.server_start_time := coalesce(v_court.server_start_time, v_now);
    v_court.server_end_time := coalesce(
      v_court.server_end_time,
      v_now + (v_dare.duration_seconds * interval '1 second')
    );

    update dares
      set status = 'active',
          started_at = coalesce(started_at, v_now)
    where id = p_dare_id;

    v_dare.status := 'active';
  end if;

  update court_sessions
    set phase = v_court.phase,
        player_a_ready = v_court.player_a_ready,
        player_b_ready = v_court.player_b_ready,
        server_start_time = v_court.server_start_time,
        server_end_time = v_court.server_end_time,
        player_a_heartbeat_at = v_court.player_a_heartbeat_at,
        player_b_heartbeat_at = v_court.player_b_heartbeat_at
  where id = v_court.id;

  dare_id := p_dare_id;
  court_session_id := v_court.id;
  dare_status := v_dare.status;
  phase := v_court.phase;
  player_a_ready := v_court.player_a_ready;
  player_b_ready := v_court.player_b_ready;
  server_start_time := v_court.server_start_time;
  server_end_time := v_court.server_end_time;
  assigned_rounds := v_existing_rounds;
  return next;
end;
$$;

create or replace function public.update_responsible_gaming_settings_action(
  p_user_id uuid,
  p_daily_deposit_limit_kobo integer default null,
  p_weekly_deposit_limit_kobo integer default null,
  p_monthly_deposit_limit_kobo integer default null,
  p_session_max_minutes integer default null,
  p_max_stake_per_dare_kobo integer default null
)
returns table (
  user_id uuid,
  daily_deposit_limit_kobo integer,
  weekly_deposit_limit_kobo integer,
  monthly_deposit_limit_kobo integer,
  session_max_minutes integer,
  max_stake_per_dare_kobo integer,
  pending_daily_deposit_limit_kobo integer,
  pending_weekly_deposit_limit_kobo integer,
  pending_monthly_deposit_limit_kobo integer,
  pending_session_max_minutes integer,
  pending_max_stake_per_dare_kobo integer,
  pending_limits_effective_at timestamptz,
  self_excluded boolean,
  self_exclusion_until timestamptz,
  cooling_off_until timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile profiles%rowtype;
  v_settings responsible_gaming_settings%rowtype;
  v_effective_at timestamptz := now() + interval '24 hours';
  v_increase_requested boolean;
begin
  select *
    into v_profile
  from profiles p
  where p.id = p_user_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  if v_profile.account_status <> 'active'
    or v_profile.risk_status not in ('normal', 'watch') then
    raise exception 'account_restricted' using errcode = 'P0001';
  end if;

  insert into responsible_gaming_settings (user_id)
  values (p_user_id)
  on conflict on constraint responsible_gaming_settings_pkey do nothing;

  select *
    into v_settings
  from responsible_gaming_settings rgs
  where rgs.user_id = p_user_id
  for update;

  if v_settings.pending_limits_effective_at is not null
    and v_settings.pending_limits_effective_at <= now() then
    update responsible_gaming_settings rgs
      set daily_deposit_limit_kobo = coalesce(
            rgs.pending_daily_deposit_limit_kobo,
            rgs.daily_deposit_limit_kobo
          ),
          weekly_deposit_limit_kobo = coalesce(
            rgs.pending_weekly_deposit_limit_kobo,
            rgs.weekly_deposit_limit_kobo
          ),
          monthly_deposit_limit_kobo = coalesce(
            rgs.pending_monthly_deposit_limit_kobo,
            rgs.monthly_deposit_limit_kobo
          ),
          session_max_minutes = coalesce(
            rgs.pending_session_max_minutes,
            rgs.session_max_minutes
          ),
          max_stake_per_dare_kobo = coalesce(
            rgs.pending_max_stake_per_dare_kobo,
            rgs.max_stake_per_dare_kobo
          ),
          pending_daily_deposit_limit_kobo = null,
          pending_weekly_deposit_limit_kobo = null,
          pending_monthly_deposit_limit_kobo = null,
          pending_session_max_minutes = null,
          pending_max_stake_per_dare_kobo = null,
          pending_limits_effective_at = null
    where rgs.user_id = p_user_id
    returning * into v_settings;
  end if;

  v_increase_requested :=
    (
      p_daily_deposit_limit_kobo is not null
      and v_settings.daily_deposit_limit_kobo is not null
      and p_daily_deposit_limit_kobo > v_settings.daily_deposit_limit_kobo
    )
    or (
      p_weekly_deposit_limit_kobo is not null
      and v_settings.weekly_deposit_limit_kobo is not null
      and p_weekly_deposit_limit_kobo > v_settings.weekly_deposit_limit_kobo
    )
    or (
      p_monthly_deposit_limit_kobo is not null
      and v_settings.monthly_deposit_limit_kobo is not null
      and p_monthly_deposit_limit_kobo > v_settings.monthly_deposit_limit_kobo
    )
    or (
      p_session_max_minutes is not null
      and v_settings.session_max_minutes is not null
      and p_session_max_minutes > v_settings.session_max_minutes
    )
    or (
      p_max_stake_per_dare_kobo is not null
      and v_settings.max_stake_per_dare_kobo is not null
      and p_max_stake_per_dare_kobo > v_settings.max_stake_per_dare_kobo
    );

  if v_increase_requested
    and v_settings.pending_limits_effective_at is not null
    and v_settings.pending_limits_effective_at > now() then
    raise exception 'cooling_off_active' using errcode = 'P0001';
  end if;

  update responsible_gaming_settings rgs
    set daily_deposit_limit_kobo = case
          when p_daily_deposit_limit_kobo is null then rgs.daily_deposit_limit_kobo
          when rgs.daily_deposit_limit_kobo is null
            or p_daily_deposit_limit_kobo <= rgs.daily_deposit_limit_kobo
            then p_daily_deposit_limit_kobo
          else rgs.daily_deposit_limit_kobo
        end,
        weekly_deposit_limit_kobo = case
          when p_weekly_deposit_limit_kobo is null then rgs.weekly_deposit_limit_kobo
          when rgs.weekly_deposit_limit_kobo is null
            or p_weekly_deposit_limit_kobo <= rgs.weekly_deposit_limit_kobo
            then p_weekly_deposit_limit_kobo
          else rgs.weekly_deposit_limit_kobo
        end,
        monthly_deposit_limit_kobo = case
          when p_monthly_deposit_limit_kobo is null then rgs.monthly_deposit_limit_kobo
          when rgs.monthly_deposit_limit_kobo is null
            or p_monthly_deposit_limit_kobo <= rgs.monthly_deposit_limit_kobo
            then p_monthly_deposit_limit_kobo
          else rgs.monthly_deposit_limit_kobo
        end,
        session_max_minutes = case
          when p_session_max_minutes is null then rgs.session_max_minutes
          when rgs.session_max_minutes is null
            or p_session_max_minutes <= rgs.session_max_minutes
            then p_session_max_minutes
          else rgs.session_max_minutes
        end,
        max_stake_per_dare_kobo = case
          when p_max_stake_per_dare_kobo is null then rgs.max_stake_per_dare_kobo
          when rgs.max_stake_per_dare_kobo is null
            or p_max_stake_per_dare_kobo <= rgs.max_stake_per_dare_kobo
            then p_max_stake_per_dare_kobo
          else rgs.max_stake_per_dare_kobo
        end,
        pending_daily_deposit_limit_kobo = case
          when p_daily_deposit_limit_kobo is not null
            and rgs.daily_deposit_limit_kobo is not null
            and p_daily_deposit_limit_kobo > rgs.daily_deposit_limit_kobo
            then p_daily_deposit_limit_kobo
          when p_daily_deposit_limit_kobo is not null then null
          else rgs.pending_daily_deposit_limit_kobo
        end,
        pending_weekly_deposit_limit_kobo = case
          when p_weekly_deposit_limit_kobo is not null
            and rgs.weekly_deposit_limit_kobo is not null
            and p_weekly_deposit_limit_kobo > rgs.weekly_deposit_limit_kobo
            then p_weekly_deposit_limit_kobo
          when p_weekly_deposit_limit_kobo is not null then null
          else rgs.pending_weekly_deposit_limit_kobo
        end,
        pending_monthly_deposit_limit_kobo = case
          when p_monthly_deposit_limit_kobo is not null
            and rgs.monthly_deposit_limit_kobo is not null
            and p_monthly_deposit_limit_kobo > rgs.monthly_deposit_limit_kobo
            then p_monthly_deposit_limit_kobo
          when p_monthly_deposit_limit_kobo is not null then null
          else rgs.pending_monthly_deposit_limit_kobo
        end,
        pending_session_max_minutes = case
          when p_session_max_minutes is not null
            and rgs.session_max_minutes is not null
            and p_session_max_minutes > rgs.session_max_minutes
            then p_session_max_minutes
          when p_session_max_minutes is not null then null
          else rgs.pending_session_max_minutes
        end,
        pending_max_stake_per_dare_kobo = case
          when p_max_stake_per_dare_kobo is not null
            and rgs.max_stake_per_dare_kobo is not null
            and p_max_stake_per_dare_kobo > rgs.max_stake_per_dare_kobo
            then p_max_stake_per_dare_kobo
          when p_max_stake_per_dare_kobo is not null then null
          else rgs.pending_max_stake_per_dare_kobo
        end
  where rgs.user_id = p_user_id
  returning * into v_settings;

  update responsible_gaming_settings rgs
    set pending_limits_effective_at = case
          when v_settings.pending_daily_deposit_limit_kobo is not null
            or v_settings.pending_weekly_deposit_limit_kobo is not null
            or v_settings.pending_monthly_deposit_limit_kobo is not null
            or v_settings.pending_session_max_minutes is not null
            or v_settings.pending_max_stake_per_dare_kobo is not null
            then coalesce(rgs.pending_limits_effective_at, v_effective_at)
          else null
        end
  where rgs.user_id = p_user_id
  returning * into v_settings;

  user_id := v_settings.user_id;
  daily_deposit_limit_kobo := v_settings.daily_deposit_limit_kobo;
  weekly_deposit_limit_kobo := v_settings.weekly_deposit_limit_kobo;
  monthly_deposit_limit_kobo := v_settings.monthly_deposit_limit_kobo;
  session_max_minutes := v_settings.session_max_minutes;
  max_stake_per_dare_kobo := v_settings.max_stake_per_dare_kobo;
  pending_daily_deposit_limit_kobo := v_settings.pending_daily_deposit_limit_kobo;
  pending_weekly_deposit_limit_kobo := v_settings.pending_weekly_deposit_limit_kobo;
  pending_monthly_deposit_limit_kobo := v_settings.pending_monthly_deposit_limit_kobo;
  pending_session_max_minutes := v_settings.pending_session_max_minutes;
  pending_max_stake_per_dare_kobo := v_settings.pending_max_stake_per_dare_kobo;
  pending_limits_effective_at := v_settings.pending_limits_effective_at;
  self_excluded := v_settings.self_excluded;
  self_exclusion_until := v_settings.self_exclusion_until;
  cooling_off_until := v_settings.cooling_off_until;
  return next;
end;
$$;

revoke all on function public.assign_jury_case_action(uuid, uuid, integer)
from public, anon, authenticated;
grant execute on function public.assign_jury_case_action(uuid, uuid, integer)
to service_role;

revoke all on function public.ready_dare_action(uuid, uuid, integer)
from public, anon, authenticated;
grant execute on function public.ready_dare_action(uuid, uuid, integer)
to service_role;

revoke all on function public.update_responsible_gaming_settings_action(
  uuid, integer, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.update_responsible_gaming_settings_action(
  uuid, integer, integer, integer, integer, integer
) to service_role;
