-- ============================================================
-- court_ready_rpc.sql
-- Atomic Court ready-up and quiz question assignment.
-- ============================================================

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

revoke all on function public.ready_dare_action(uuid, uuid, integer)
from public, anon, authenticated;

grant execute on function public.ready_dare_action(uuid, uuid, integer)
to service_role;
