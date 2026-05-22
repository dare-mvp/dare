-- ============================================================
-- jury_assignment_vote_rpcs.sql
-- Jury assignment and voting for disputed DAREs.
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

  with eligible_jurors as (
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
    order by random()
    limit greatest(
      0,
      v_target_count - (
        select count(*)
        from jury_assignments ja
        where ja.jury_case_id = p_jury_case_id
      )
    )
  ),
  inserted as (
    insert into jury_assignments (
      jury_case_id,
      juror_id,
      status,
      blind_side_mapping,
      due_at
    )
    select
      p_jury_case_id,
      eligible_jurors.id,
      'assigned',
      jsonb_build_object('A', 'issuer', 'B', 'challenger'),
      v_due_at
    from eligible_jurors
    returning juror_id
  )
  insert into notifications (
    user_id,
    type,
    title,
    body,
    action
  )
  select
    inserted.juror_id,
    'jury_invite',
    'Jury case assigned',
    'A dispute case is ready for your review.',
    jsonb_build_object(
      'type', 'jury_case',
      'juryCaseId', p_jury_case_id,
      'dareId', v_dare.id
    )
  from inserted;

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

create or replace function public.cast_jury_vote_action(
  p_juror_id uuid,
  p_jury_case_id uuid,
  p_vote text,
  p_rationale text
)
returns table (
  jury_case_id uuid,
  assignment_id uuid,
  vote_id uuid,
  status text,
  verdict text,
  dare_id uuid,
  dare_status text,
  winner_id uuid,
  votes_cast integer,
  votes_needed integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_case jury_cases%rowtype;
  v_assignment jury_assignments%rowtype;
  v_vote jury_votes%rowtype;
  v_dare dares%rowtype;
  v_count_a integer;
  v_count_b integer;
  v_count_void integer;
  v_count_escalate integer;
  v_votes_cast integer;
  v_result text;
begin
  if p_vote not in ('A', 'B', 'void', 'escalate') then
    raise exception 'invalid_vote' using errcode = 'P0001';
  end if;

  if char_length(btrim(p_rationale)) < 20 or char_length(btrim(p_rationale)) > 3000 then
    raise exception 'invalid_vote_rationale' using errcode = 'P0001';
  end if;

  select *
    into v_case
  from jury_cases jc
  where jc.id = p_jury_case_id
  for update;

  if not found then
    raise exception 'jury_case_not_found' using errcode = 'P0001';
  end if;

  if v_case.status <> 'jury_voting' then
    raise exception 'invalid_jury_case_state' using errcode = 'P0001';
  end if;

  select *
    into v_assignment
  from jury_assignments ja
  where ja.jury_case_id = p_jury_case_id
    and ja.juror_id = p_juror_id
  for update;

  if not found then
    raise exception 'jury_assignment_not_found' using errcode = 'P0001';
  end if;

  if v_assignment.status not in ('assigned', 'claimed') then
    raise exception 'jury_vote_already_submitted' using errcode = 'P0001';
  end if;

  if v_assignment.due_at is not null and now() > v_assignment.due_at then
    update jury_assignments ja
      set status = 'expired'
    where ja.id = v_assignment.id;
    raise exception 'jury_assignment_expired' using errcode = 'P0001';
  end if;

  select *
    into v_dare
  from dares d
  where d.id = v_case.dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_juror_id = v_dare.issuer_id or p_juror_id = v_dare.challenger_id then
    raise exception 'jury_assignment_not_found' using errcode = 'P0001';
  end if;

  insert into jury_votes (
    jury_case_id,
    juror_id,
    vote,
    rationale
  )
  values (
    p_jury_case_id,
    p_juror_id,
    p_vote,
    btrim(p_rationale)
  )
  returning * into v_vote;

  update jury_assignments ja
    set status = 'completed',
        completed_at = now()
  where ja.id = v_assignment.id
  returning * into v_assignment;

  select
    count(*) filter (where jv.vote = 'A')::integer,
    count(*) filter (where jv.vote = 'B')::integer,
    count(*) filter (where jv.vote = 'void')::integer,
    count(*) filter (where jv.vote = 'escalate')::integer,
    count(*)::integer
    into v_count_a, v_count_b, v_count_void, v_count_escalate, v_votes_cast
  from jury_votes jv
  where jv.jury_case_id = p_jury_case_id;

  if v_votes_cast >= v_case.votes_needed then
    if v_count_escalate >= greatest(v_count_a, v_count_b, v_count_void) then
      v_result := 'escalate';
    elsif v_count_a > v_count_b and v_count_a > v_count_void then
      v_result := 'A';
    elsif v_count_b > v_count_a and v_count_b > v_count_void then
      v_result := 'B';
    elsif v_count_void > v_count_a and v_count_void > v_count_b then
      v_result := 'void';
    else
      v_result := 'escalate';
    end if;

    if v_result = 'escalate' then
      update jury_cases jc
        set status = 'escalated',
            verdict = 'escalate',
            escalated_at = now()
      where jc.id = p_jury_case_id
      returning * into v_case;
    else
      update jury_cases jc
        set status = 'settlement_pending',
            verdict = v_result,
            closed_at = now()
      where jc.id = p_jury_case_id
      returning * into v_case;

      update dares d
        set status = 'completed',
            winner_id = case v_result
              when 'A' then v_dare.issuer_id
              when 'B' then v_dare.challenger_id
              else null
            end,
            dispute_deadline_at = now()
      where d.id = v_dare.id
      returning * into v_dare;

      update court_sessions cs
        set phase = 'completed'
      where cs.dare_id = v_dare.id;
    end if;
  end if;

  jury_case_id := v_case.id;
  assignment_id := v_assignment.id;
  vote_id := v_vote.id;
  status := v_case.status;
  verdict := v_case.verdict;
  dare_id := v_dare.id;
  dare_status := v_dare.status;
  winner_id := v_dare.winner_id;
  votes_cast := v_votes_cast;
  votes_needed := v_case.votes_needed;
  return next;
exception
  when unique_violation then
    raise exception 'jury_vote_already_submitted' using errcode = 'P0001';
end;
$$;

revoke all on function public.assign_jury_case_action(uuid, uuid, integer)
from public, anon, authenticated;

grant execute on function public.assign_jury_case_action(uuid, uuid, integer)
to service_role;

revoke all on function public.cast_jury_vote_action(uuid, uuid, text, text)
from public, anon, authenticated;

grant execute on function public.cast_jury_vote_action(uuid, uuid, text, text)
to service_role;
