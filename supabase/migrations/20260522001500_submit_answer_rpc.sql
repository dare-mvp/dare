-- ============================================================
-- submit_answer_rpc.sql
-- Authoritative answer submission and scoring.
-- ============================================================

create or replace function public.submit_dare_answer_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_round_index integer,
  p_question_id uuid,
  p_selected_option integer
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
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_round dare_quiz_rounds%rowtype;
  v_question quiz_questions%rowtype;
  v_answer_id uuid;
  v_delivered_at timestamptz;
  v_response_ms integer;
  v_correct boolean;
  v_now timestamptz := now();
begin
  if p_round_index < 0 then
    raise exception 'invalid_round_index' using errcode = 'P0001';
  end if;

  if p_selected_option < 0 or p_selected_option > 5 then
    raise exception 'invalid_selected_option' using errcode = 'P0001';
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

  if v_dare.status <> 'active' then
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

  if v_court.phase <> 'active' then
    raise exception 'invalid_court_state' using errcode = 'P0001';
  end if;

  if v_court.server_start_time is null
    or v_court.server_end_time is null
    or v_now < v_court.server_start_time
    or v_now > v_court.server_end_time then
    raise exception 'question_window_closed' using errcode = 'P0001';
  end if;

  select *
    into v_round
  from dare_quiz_rounds
  where dare_quiz_rounds.dare_id = p_dare_id
    and dare_quiz_rounds.round_index = p_round_index
    and dare_quiz_rounds.question_id = p_question_id;

  if not found then
    raise exception 'question_not_assigned' using errcode = 'P0001';
  end if;

  select *
    into v_question
  from quiz_questions
  where id = p_question_id
    and active = true;

  if not found then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;

  if p_user_id = v_dare.issuer_id then
    v_delivered_at := v_round.question_delivered_at_a;
  else
    v_delivered_at := v_round.question_delivered_at_b;
  end if;

  if v_delivered_at is null then
    raise exception 'question_not_delivered' using errcode = 'P0001';
  end if;

  v_response_ms := greatest(
    0,
    floor(extract(epoch from (v_now - v_delivered_at)) * 1000)::integer
  );
  v_correct := p_selected_option = v_question.correct_option;
  v_answer_id := gen_random_uuid();

  insert into dare_quiz_answers (
    id,
    dare_id,
    user_id,
    question_id,
    round_index,
    selected_option,
    correct,
    response_ms
  )
  values (
    v_answer_id,
    p_dare_id,
    p_user_id,
    p_question_id,
    p_round_index,
    p_selected_option,
    v_correct,
    v_response_ms
  );

  if v_correct and p_user_id = v_dare.issuer_id then
    update court_sessions
      set score_a = court_sessions.score_a + 1
    where court_sessions.id = v_court.id
    returning * into v_court;
  elsif v_correct then
    update court_sessions
      set score_b = court_sessions.score_b + 1
    where court_sessions.id = v_court.id
    returning * into v_court;
  end if;

  answer_id := v_answer_id;
  dare_id := p_dare_id;
  question_id := p_question_id;
  round_index := p_round_index;
  selected_option := p_selected_option;
  correct := v_correct;
  response_ms := v_response_ms;
  score_a := v_court.score_a;
  score_b := v_court.score_b;
  phase := v_court.phase;
  return next;
exception
  when unique_violation then
    raise exception 'answer_already_submitted' using errcode = 'P0001';
end;
$$;

revoke all on function public.submit_dare_answer_action(
  uuid, uuid, integer, uuid, integer
) from public, anon, authenticated;

grant execute on function public.submit_dare_answer_action(
  uuid, uuid, integer, uuid, integer
) to service_role;
