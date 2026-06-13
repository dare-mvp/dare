create or replace function public.submit_dare_answer_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_prompt_id uuid,
  p_answer_text text
)
returns table (
  answer_id uuid,
  dare_id uuid,
  question_id uuid,
  round_index integer,
  selected_option integer,
  correct boolean,
  response_ms integer,
  score_a integer,
  score_b integer,
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
  v_key public.dare_answer_keys%rowtype;
  v_answer_id uuid;
  v_answer_hash text;
  v_matched boolean;
begin
  if p_answer_text is null or btrim(p_answer_text) = '' then
    raise exception 'answer_required' using errcode = 'P0001';
  end if;

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

  if v_dare.resolution_type <> 'answer_key' then
    raise exception 'invalid_resolution_type' using errcode = 'P0001';
  end if;

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id
  for update;

  if not found or v_court.phase <> 'active' then
    raise exception 'court_not_active' using errcode = 'P0001';
  end if;

  select * into v_prompt
  from public.dare_prompts
  where id = p_prompt_id
    and dare_prompts.dare_id = p_dare_id;

  if not found then
    raise exception 'prompt_not_found' using errcode = 'P0001';
  end if;

  select * into v_key
  from public.dare_answer_keys
  where prompt_id = p_prompt_id;

  if not found then
    raise exception 'answer_key_not_found' using errcode = 'P0001';
  end if;

  v_answer_hash := encode(digest(v_key.answer_salt || ':' || lower(btrim(p_answer_text)), 'sha256'), 'hex');
  v_matched := v_answer_hash = v_key.answer_hash;
  v_answer_id := gen_random_uuid();

  insert into public.dare_answer_submissions (
    id,
    dare_id,
    prompt_id,
    user_id,
    submitted_answer,
    submitted_answer_hash,
    matched
  )
  values (
    v_answer_id,
    p_dare_id,
    p_prompt_id,
    p_user_id,
    btrim(p_answer_text),
    v_answer_hash,
    v_matched
  );

  if p_user_id = v_dare.issuer_id and v_matched then
    v_court.score_a := v_court.score_a + 1;
  elsif p_user_id = v_dare.challenger_id and v_matched then
    v_court.score_b := v_court.score_b + 1;
  end if;

  update public.court_sessions
    set score_a = v_court.score_a,
        score_b = v_court.score_b
  where id = v_court.id
  returning * into v_court;

  insert into public.dare_court_events (
    dare_id,
    court_session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    p_dare_id,
    v_court.id,
    p_user_id,
    'answer_submitted',
    jsonb_build_object('promptId', p_prompt_id, 'matched', v_matched)
  );

  answer_id := v_answer_id;
  dare_id := p_dare_id;
  question_id := p_prompt_id;
  round_index := v_prompt.position;
  selected_option := null;
  correct := v_matched;
  response_ms := null;
  score_a := v_court.score_a;
  score_b := v_court.score_b;
  phase := v_court.phase;
  return next;
exception
  when unique_violation then
    raise exception 'answer_already_submitted' using errcode = 'P0001';
end;
$$;

create or replace function public.complete_dare_action(
  p_actor_user_id uuid,
  p_dare_id uuid
)
returns table (
  dare_id uuid,
  status text,
  winner_id uuid,
  score_a integer,
  score_b integer,
  phase text,
  completed_at timestamptz,
  dispute_deadline_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare public.dares%rowtype;
  v_court public.court_sessions%rowtype;
  v_winner_id uuid;
begin
  select * into v_dare
  from public.dares
  where id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_actor_user_id <> v_dare.issuer_id
    and p_actor_user_id <> v_dare.challenger_id
    and not exists (select 1 from public.profiles where id = p_actor_user_id and is_admin = true) then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('active', 'awaiting_result', 'completed') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  if v_dare.resolution_type = 'answer_key' then
    if v_dare.dare_type = 'skill' then
      v_winner_id := case
        when v_court.score_a > v_court.score_b then v_dare.issuer_id
        when v_court.score_b > v_court.score_a then v_dare.challenger_id
        else null
      end;
    else
      v_winner_id := case when v_court.score_b > 0 then v_dare.challenger_id else null end;
    end if;
  else
    v_winner_id := v_dare.winner_id;
  end if;

  update public.dares
    set status = 'completed',
        winner_id = v_winner_id,
        completed_at = coalesce(completed_at, now()),
        dispute_deadline_at = coalesce(dispute_deadline_at, now() + interval '15 minutes')
  where id = p_dare_id
  returning * into v_dare;

  update public.court_sessions
    set phase = 'completed'
  where id = v_court.id
  returning * into v_court;

  insert into public.dare_court_events (
    dare_id,
    court_session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    p_dare_id,
    v_court.id,
    p_actor_user_id,
    'court_completed',
    jsonb_build_object('winnerId', v_winner_id, 'scoreA', v_court.score_a, 'scoreB', v_court.score_b)
  );

  dare_id := v_dare.id;
  status := v_dare.status;
  winner_id := v_dare.winner_id;
  score_a := v_court.score_a;
  score_b := v_court.score_b;
  phase := v_court.phase;
  completed_at := v_dare.completed_at;
  dispute_deadline_at := v_dare.dispute_deadline_at;
  return next;
end;
$$;

