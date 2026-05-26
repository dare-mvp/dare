-- ============================================================
-- current_court_question_rpc.sql
-- Safe court question read model for mobile clients.
--
-- Returns prompt/options for the authenticated participant's next
-- unanswered round without exposing quiz_questions.correct_option.
-- ============================================================

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
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_round_id uuid;
  v_question_id uuid;
  v_round_index integer;
  v_prompt text;
  v_options jsonb;
  v_now timestamptz := now();
begin
  select *
    into v_dare
  from dares
  where id = p_dare_id;

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
  where court_sessions.dare_id = p_dare_id;

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

  select count(*)
    into total_rounds
  from dare_quiz_rounds dqr
  where dqr.dare_id = p_dare_id;

  select count(*)
    into answered_rounds
  from dare_quiz_answers dqa
  where dqa.dare_id = p_dare_id
    and dqa.user_id = p_user_id;

  select
    dqr.id,
    dqr.question_id,
    dqr.round_index,
    qq.prompt,
    qq.options
    into v_round_id, v_question_id, v_round_index, v_prompt, v_options
  from dare_quiz_rounds dqr
  join quiz_questions qq on qq.id = dqr.question_id
  where dqr.dare_id = p_dare_id
    and qq.active = true
    and not exists (
      select 1
      from dare_quiz_answers dqa
      where dqa.dare_id = p_dare_id
        and dqa.user_id = p_user_id
        and dqa.question_id = dqr.question_id
    )
  order by dqr.round_index asc
  limit 1;

  if not found then
    raise exception 'no_question_available' using errcode = 'P0001';
  end if;

  update dare_quiz_rounds dqr
    set question_delivered_at_a = case
          when p_user_id = v_dare.issuer_id then coalesce(dqr.question_delivered_at_a, v_now)
          else dqr.question_delivered_at_a
        end,
        question_delivered_at_b = case
          when p_user_id = v_dare.challenger_id then coalesce(dqr.question_delivered_at_b, v_now)
          else dqr.question_delivered_at_b
        end
  where dqr.id = v_round_id;

  dare_id := p_dare_id;
  court_session_id := v_court.id;
  question_id := v_question_id;
  round_index := v_round_index;
  prompt := v_prompt;
  options := v_options;
  score_a := v_court.score_a;
  score_b := v_court.score_b;
  server_end_time := v_court.server_end_time;
  phase := v_court.phase;
  return next;
end;
$$;

revoke all on function public.get_current_court_question_action(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.get_current_court_question_action(uuid, uuid)
to service_role;
