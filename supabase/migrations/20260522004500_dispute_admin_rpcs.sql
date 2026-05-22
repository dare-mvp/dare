-- ============================================================
-- dispute_admin_rpcs.sql
-- Dispute filing and manual admin resolution.
-- ============================================================

create or replace function public.file_dispute_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_reason text,
  p_summary text,
  p_evidence_object_ids uuid[] default '{}'
)
returns table (
  jury_case_id uuid,
  dare_id uuid,
  status text,
  dare_status text,
  court_phase text,
  opponent_user_id uuid,
  evidence_a_id uuid,
  evidence_b_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_case jury_cases%rowtype;
  v_evidence evidence_objects%rowtype;
  v_case_reason text;
  v_evidence_count integer := coalesce(cardinality(p_evidence_object_ids), 0);
begin
  if p_reason not in (
    'score_issue',
    'timer_issue',
    'rules_issue',
    'technical_issue',
    'abuse_or_cheating',
    'other'
  ) then
    raise exception 'invalid_dispute_reason' using errcode = 'P0001';
  end if;

  v_case_reason := p_reason || E'\n\n' || btrim(p_summary);
  if char_length(v_case_reason) < 10 or char_length(v_case_reason) > 3000 then
    raise exception 'invalid_dispute_summary' using errcode = 'P0001';
  end if;

  if v_evidence_count > 1 then
    raise exception 'too_many_evidence_objects' using errcode = 'P0001';
  end if;

  select *
    into v_dare
  from dares d
  where d.id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_user_id <> v_dare.issuer_id and p_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  if v_dare.status <> 'completed' then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  if v_dare.dispute_deadline_at is null or now() > v_dare.dispute_deadline_at then
    raise exception 'dispute_window_closed' using errcode = 'P0001';
  end if;

  select *
    into v_court
  from court_sessions cs
  where cs.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jury_cases jc
    where jc.dare_id = p_dare_id
      and jc.status not in ('closed', 'voided')
  ) then
    raise exception 'duplicate_dispute' using errcode = 'P0001';
  end if;

  if v_evidence_count = 1 then
    select *
      into v_evidence
    from evidence_objects eo
    where eo.id = p_evidence_object_ids[1]
      and eo.dare_id = p_dare_id
      and eo.user_id = p_user_id
      and eo.status in ('uploaded', 'accepted')
    for update;

    if not found then
      raise exception 'evidence_not_found' using errcode = 'P0001';
    end if;
  end if;

  insert into jury_cases (
    dare_id,
    opened_by_user_id,
    status,
    reason,
    evidence_a_id,
    evidence_b_id
  )
  values (
    p_dare_id,
    p_user_id,
    'filed',
    v_case_reason,
    case
      when v_evidence.id is not null and p_user_id = v_dare.issuer_id then v_evidence.id
      else null
    end,
    case
      when v_evidence.id is not null and p_user_id = v_dare.challenger_id then v_evidence.id
      else null
    end
  )
  returning * into v_case;

  update dares d
    set status = 'dispute_pending'
  where d.id = p_dare_id
  returning * into v_dare;

  update court_sessions cs
    set phase = 'disputed'
  where cs.id = v_court.id
  returning * into v_court;

  update escrow_holds eh
    set hold_reason = 'dispute_pending'
  where eh.dare_id = p_dare_id
    and eh.status = 'held';

  update profiles p
    set disputes = p.disputes + 1
  where p.id = p_user_id;

  jury_case_id := v_case.id;
  dare_id := v_case.dare_id;
  status := v_case.status;
  dare_status := v_dare.status;
  court_phase := v_court.phase;
  opponent_user_id := case
    when p_user_id = v_dare.issuer_id then v_dare.challenger_id
    else v_dare.issuer_id
  end;
  evidence_a_id := v_case.evidence_a_id;
  evidence_b_id := v_case.evidence_b_id;
  return next;
end;
$$;

create or replace function public.resolve_jury_case_admin_action(
  p_admin_user_id uuid,
  p_jury_case_id uuid,
  p_verdict text,
  p_admin_note text
)
returns table (
  jury_case_id uuid,
  dare_id uuid,
  status text,
  verdict text,
  dare_status text,
  winner_id uuid,
  court_phase text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin profiles%rowtype;
  v_case jury_cases%rowtype;
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_resolved_winner_id uuid;
  v_note text := btrim(coalesce(p_admin_note, ''));
begin
  if p_verdict not in ('A', 'B', 'void', 'uphold', 'overturn') then
    raise exception 'invalid_verdict' using errcode = 'P0001';
  end if;

  if char_length(v_note) < 10 or char_length(v_note) > 2000 then
    raise exception 'invalid_admin_note' using errcode = 'P0001';
  end if;

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

  if v_case.status in ('closed', 'voided') then
    raise exception 'dispute_already_closed' using errcode = 'P0001';
  end if;

  select *
    into v_dare
  from dares d
  where d.id = v_case.dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  select *
    into v_court
  from court_sessions cs
  where cs.dare_id = v_dare.id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  v_resolved_winner_id := case p_verdict
    when 'A' then v_dare.issuer_id
    when 'B' then v_dare.challenger_id
    when 'void' then null
    when 'uphold' then v_dare.winner_id
    when 'overturn' then case
      when v_dare.winner_id = v_dare.issuer_id then v_dare.challenger_id
      when v_dare.winner_id = v_dare.challenger_id then v_dare.issuer_id
      else null
    end
  end;

  if p_verdict in ('uphold', 'overturn') and v_resolved_winner_id is null then
    raise exception 'invalid_verdict' using errcode = 'P0001';
  end if;

  update jury_cases jc
    set status = 'settlement_pending',
        verdict = p_verdict,
        closed_at = now()
  where jc.id = p_jury_case_id
  returning * into v_case;

  update dares d
    set status = 'completed',
        winner_id = v_resolved_winner_id,
        dispute_deadline_at = now()
  where d.id = v_dare.id
  returning * into v_dare;

  update court_sessions cs
    set phase = 'completed'
  where cs.id = v_court.id
  returning * into v_court;

  jury_case_id := v_case.id;
  dare_id := v_dare.id;
  status := v_case.status;
  verdict := v_case.verdict;
  dare_status := v_dare.status;
  winner_id := v_dare.winner_id;
  court_phase := v_court.phase;
  return next;
end;
$$;

revoke all on function public.file_dispute_action(uuid, uuid, text, text, uuid[])
from public, anon, authenticated;

grant execute on function public.file_dispute_action(uuid, uuid, text, text, uuid[])
to service_role;

revoke all on function public.resolve_jury_case_admin_action(uuid, uuid, text, text)
from public, anon, authenticated;

grant execute on function public.resolve_jury_case_admin_action(uuid, uuid, text, text)
to service_role;
