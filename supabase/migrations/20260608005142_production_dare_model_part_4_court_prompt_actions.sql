create or replace function public.ready_dare_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_round_count integer default 0
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
  v_dare public.dares%rowtype;
  v_court public.court_sessions%rowtype;
  v_profile public.profiles%rowtype;
begin
  select * into v_dare
  from public.dares
  where id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_user_id <> v_dare.issuer_id and p_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id;

  if not found or v_profile.kyc_tier = 'kyc0' then
    raise exception 'kyc_required' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('ready_check', 'active') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if v_court.phase not in ('ready_check', 'active') then
    raise exception 'invalid_court_phase' using errcode = 'P0001';
  end if;

  if p_user_id = v_dare.issuer_id then
    v_court.player_a_ready := true;
  else
    v_court.player_b_ready := true;
  end if;

  if v_court.player_a_ready and v_court.player_b_ready and v_court.phase = 'ready_check' then
    update public.court_sessions
      set player_a_ready = true,
          player_b_ready = true,
          phase = 'active',
          server_start_time = now(),
          server_end_time = now() + make_interval(secs => v_dare.duration_seconds),
          player_a_heartbeat_at = now(),
          player_b_heartbeat_at = now(),
          reconnect_deadline = now() + interval '60 seconds'
    where id = v_court.id
    returning * into v_court;

    update public.dares
      set status = 'active',
          started_at = v_court.server_start_time
    where id = v_dare.id
    returning * into v_dare;

    insert into public.dare_court_events (dare_id, court_session_id, actor_user_id, event_type)
    values (v_dare.id, v_court.id, p_user_id, 'court_started');
  else
    update public.court_sessions
      set player_a_ready = v_court.player_a_ready,
          player_b_ready = v_court.player_b_ready
    where id = v_court.id
    returning * into v_court;

    insert into public.dare_court_events (dare_id, court_session_id, actor_user_id, event_type)
    values (v_dare.id, v_court.id, p_user_id, 'court_ready');
  end if;

  select count(*)::integer into assigned_rounds
  from public.dare_prompts
  where dare_prompts.dare_id = v_dare.id;

  dare_id := v_dare.id;
  court_session_id := v_court.id;
  dare_status := v_dare.status;
  phase := v_court.phase;
  player_a_ready := v_court.player_a_ready;
  player_b_ready := v_court.player_b_ready;
  server_start_time := v_court.server_start_time;
  server_end_time := v_court.server_end_time;
  return next;
end;
$$;

create or replace function public.get_current_court_question_action(
  p_user_id uuid,
  p_dare_id uuid
)
returns table (
  dare_id uuid,
  court_session_id uuid,
  question_id uuid,
  round_index integer,
  prompt text,
  options jsonb,
  total_rounds integer,
  answered_rounds integer,
  score_a integer,
  score_b integer,
  server_end_time timestamptz,
  phase text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare public.dares%rowtype;
  v_court public.court_sessions%rowtype;
  v_prompt public.dare_prompts%rowtype;
begin
  select * into v_dare
  from public.dares
  where id = p_dare_id;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_user_id <> v_dare.issuer_id and p_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id;

  if not found or v_court.phase <> 'active' then
    raise exception 'court_not_active' using errcode = 'P0001';
  end if;

  select * into v_prompt
  from public.dare_prompts dp
  where dp.dare_id = p_dare_id
    and not exists (
      select 1
      from public.dare_answer_submissions das
      where das.prompt_id = dp.id
        and das.user_id = p_user_id
    )
  order by dp.position
  limit 1;

  if not found then
    raise exception 'no_active_prompt' using errcode = 'P0001';
  end if;

  select count(*)::integer into total_rounds
  from public.dare_prompts
  where dare_prompts.dare_id = p_dare_id;

  select count(*)::integer into answered_rounds
  from public.dare_answer_submissions
  where dare_answer_submissions.dare_id = p_dare_id
    and dare_answer_submissions.user_id = p_user_id;

  dare_id := v_dare.id;
  court_session_id := v_court.id;
  question_id := v_prompt.id;
  round_index := v_prompt.position;
  prompt := v_prompt.prompt;
  options := coalesce(v_prompt.response_options, '[]'::jsonb);
  score_a := v_court.score_a;
  score_b := v_court.score_b;
  server_end_time := v_court.server_end_time;
  phase := v_court.phase;
  return next;
end;
$$;

