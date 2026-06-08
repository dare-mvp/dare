-- Harden witnessed result voting and make result disputes enter the jury path.

create table if not exists public.court_witness_attendance (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references public.dares(id) on delete cascade,
  court_session_id uuid not null references public.court_sessions(id) on delete cascade,
  witness_user_id uuid not null references public.profiles(id) on delete restrict,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  vote_eligible_at timestamptz not null default (now() + interval '30 seconds'),
  status text not null default 'present',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dare_id, witness_user_id),
  constraint court_witness_attendance_status_valid
    check (status in ('present', 'left'))
);

alter table public.court_witness_attendance
  add column if not exists vote_eligible_at timestamptz
    not null default (now() + interval '30 seconds');

alter table public.court_witness_attendance
  add column if not exists status text
    not null default 'present';

create index if not exists court_witness_attendance_dare_seen_idx
  on public.court_witness_attendance (dare_id, last_seen_at desc);

create index if not exists court_witness_attendance_user_seen_idx
  on public.court_witness_attendance (witness_user_id, last_seen_at desc);

create unique index if not exists court_witness_attendance_dare_witness_uidx
  on public.court_witness_attendance (dare_id, witness_user_id);

drop trigger if exists trg_court_witness_attendance_updated_at
  on public.court_witness_attendance;
create trigger trg_court_witness_attendance_updated_at
  before update on public.court_witness_attendance
  for each row execute function public.set_updated_at();

alter table public.court_witness_attendance enable row level security;
revoke all on public.court_witness_attendance from public, anon, authenticated;

drop policy if exists "court_witness_attendance_own_read"
  on public.court_witness_attendance;
create policy "court_witness_attendance_own_read"
  on public.court_witness_attendance for select
  to authenticated
  using ((select auth.uid()) = witness_user_id);

grant select on public.court_witness_attendance to authenticated;

create or replace function public.record_witness_attendance_action(
  p_user_id uuid,
  p_dare_id uuid
)
returns table (
  attendance_id uuid,
  dare_id uuid,
  user_id uuid,
  joined_at timestamptz,
  last_seen_at timestamptz,
  vote_eligible_at timestamptz,
  eligible_to_vote boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare public.dares%rowtype;
  v_court public.court_sessions%rowtype;
  v_attendance public.court_witness_attendance%rowtype;
begin
  select * into v_dare
  from public.dares
  where id = p_dare_id;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if v_dare.resolution_type <> 'witnessed' then
    raise exception 'invalid_resolution_type' using errcode = 'P0001';
  end if;

  if p_user_id = v_dare.issuer_id or p_user_id = v_dare.challenger_id then
    raise exception 'participant_cannot_witness_vote' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('active', 'awaiting_result') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.account_status = 'active'
      and p.kyc_tier <> 'kyc0'
  ) then
    raise exception 'witness_not_eligible' using errcode = 'P0001';
  end if;

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id
    and court_sessions.phase in ('active', 'awaiting_result')
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  insert into public.court_witness_attendance (
    dare_id,
    court_session_id,
    witness_user_id
  )
  values (
    p_dare_id,
    v_court.id,
    p_user_id
  )
  on conflict (dare_id, witness_user_id) do update
    set court_session_id = excluded.court_session_id,
        last_seen_at = now(),
        status = 'present'
  returning * into v_attendance;

  attendance_id := v_attendance.id;
  dare_id := v_attendance.dare_id;
  user_id := v_attendance.witness_user_id;
  joined_at := v_attendance.joined_at;
  last_seen_at := v_attendance.last_seen_at;
  vote_eligible_at := v_attendance.vote_eligible_at;
  eligible_to_vote := now() >= v_attendance.vote_eligible_at
    and v_attendance.last_seen_at >= now() - interval '90 seconds'
    and v_attendance.status = 'present';
  return next;
end;
$$;

create or replace function public.submit_witness_vote_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_vote text
)
returns table (
  vote_id uuid,
  dare_id uuid,
  voter_id uuid,
  vote text,
  votes_a integer,
  votes_b integer,
  phase text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare public.dares%rowtype;
  v_court public.court_sessions%rowtype;
  v_attendance public.court_witness_attendance%rowtype;
  v_vote_id uuid := gen_random_uuid();
begin
  if p_vote not in ('A', 'B') then
    raise exception 'invalid_witness_vote' using errcode = 'P0001';
  end if;

  select * into v_dare
  from public.dares
  where id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if v_dare.resolution_type <> 'witnessed' then
    raise exception 'invalid_resolution_type' using errcode = 'P0001';
  end if;

  if p_user_id = v_dare.issuer_id or p_user_id = v_dare.challenger_id then
    raise exception 'participant_cannot_witness_vote' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('active', 'awaiting_result') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if v_court.phase not in ('active', 'awaiting_result') then
    raise exception 'invalid_court_phase' using errcode = 'P0001';
  end if;

  select * into v_attendance
  from public.court_witness_attendance cwa
  where cwa.dare_id = p_dare_id
    and cwa.court_session_id = v_court.id
    and cwa.witness_user_id = p_user_id
  for update;

  if not found then
    raise exception 'witness_attendance_required' using errcode = 'P0001';
  end if;

  if v_attendance.last_seen_at < now() - interval '90 seconds'
    or now() < v_attendance.vote_eligible_at
    or v_attendance.status <> 'present' then
    raise exception 'witness_attendance_not_eligible' using errcode = 'P0001';
  end if;

  insert into public.dare_votes (id, dare_id, voter_id, vote)
  values (v_vote_id, p_dare_id, p_user_id, p_vote);

  update public.court_sessions
    set votes_a = votes_a + case when p_vote = 'A' then 1 else 0 end,
        votes_b = votes_b + case when p_vote = 'B' then 1 else 0 end,
        phase = case when phase = 'active' then 'awaiting_result' else phase end
  where id = v_court.id
  returning * into v_court;

  update public.dares
    set status = case when status = 'active' then 'awaiting_result' else status end
  where id = v_dare.id
  returning * into v_dare;

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
    'witness_vote',
    jsonb_build_object('vote', p_vote)
  );

  vote_id := v_vote_id;
  dare_id := p_dare_id;
  voter_id := p_user_id;
  vote := p_vote;
  votes_a := v_court.votes_a;
  votes_b := v_court.votes_b;
  phase := v_court.phase;
  return next;
exception
  when unique_violation then
    raise exception 'witness_vote_already_submitted' using errcode = 'P0001';
end;
$$;

create or replace function public.submit_result_claim_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_claimed_outcome text,
  p_claimed_winner_id uuid default null,
  p_rationale text default null,
  p_evidence_object_ids uuid[] default '{}'
)
returns table (
  claim_id uuid,
  dare_id uuid,
  user_id uuid,
  resolution_type text,
  claimed_outcome text,
  claimed_winner_id uuid,
  claim_state text,
  dare_status text,
  court_phase text,
  agreed_winner_id uuid,
  claims_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare public.dares%rowtype;
  v_court public.court_sessions%rowtype;
  v_claim_id uuid := gen_random_uuid();
  v_claimed_winner_id uuid;
  v_claims_count integer := 0;
  v_other_claim public.dare_result_claims%rowtype;
  v_agreed_winner_id uuid;
  v_has_uploaded_evidence boolean := false;
  v_has_other_claim boolean := false;
  v_case public.jury_cases%rowtype;
  v_case_reason text;
  v_evidence_a_id uuid;
  v_evidence_b_id uuid;
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

  if v_dare.resolution_type not in ('witnessed', 'evidence') then
    raise exception 'invalid_resolution_type' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('active', 'awaiting_result', 'completed') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if v_court.phase not in ('active', 'awaiting_result', 'completed') then
    raise exception 'invalid_court_phase' using errcode = 'P0001';
  end if;

  if v_dare.dare_type = 'skill' then
    if p_claimed_outcome = 'issuer_won' then
      v_claimed_winner_id := v_dare.issuer_id;
    elsif p_claimed_outcome = 'challenger_won' then
      v_claimed_winner_id := v_dare.challenger_id;
    elsif p_claimed_outcome in ('void', 'dispute') then
      v_claimed_winner_id := null;
    else
      raise exception 'invalid_result_claim' using errcode = 'P0001';
    end if;
  else
    if p_claimed_outcome = 'performer_completed' then
      v_claimed_winner_id := v_dare.challenger_id;
    elsif p_claimed_outcome in ('void', 'dispute') then
      v_claimed_winner_id := null;
    else
      raise exception 'invalid_result_claim' using errcode = 'P0001';
    end if;
  end if;

  if p_claimed_winner_id is not null and p_claimed_winner_id <> v_claimed_winner_id then
    raise exception 'invalid_claimed_winner' using errcode = 'P0001';
  end if;

  if p_evidence_object_ids is null then
    p_evidence_object_ids := '{}';
  end if;

  if array_length(p_evidence_object_ids, 1) > 3 then
    raise exception 'too_many_evidence_objects' using errcode = 'P0001';
  end if;

  if array_length(p_evidence_object_ids, 1) is not null then
    if exists (
      select 1
      from unnest(p_evidence_object_ids) as evidence_id
      where not exists (
        select 1
        from public.evidence_objects eo
        where eo.id = evidence_id
          and eo.dare_id = p_dare_id
          and eo.user_id = p_user_id
          and eo.status in ('uploaded', 'accepted')
      )
    ) then
      raise exception 'invalid_evidence_state' using errcode = 'P0001';
    end if;

    v_has_uploaded_evidence := true;
  end if;

  if v_dare.resolution_type = 'evidence'
    and p_claimed_outcome not in ('void', 'dispute')
    and not v_has_uploaded_evidence then
    raise exception 'evidence_required' using errcode = 'P0001';
  end if;

  insert into public.dare_result_claims (
    id,
    dare_id,
    user_id,
    claimed_outcome,
    claimed_winner_id,
    rationale,
    evidence_object_ids
  )
  values (
    v_claim_id,
    p_dare_id,
    p_user_id,
    p_claimed_outcome,
    v_claimed_winner_id,
    nullif(btrim(coalesce(p_rationale, '')), ''),
    p_evidence_object_ids
  );

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
    'result_claim',
    jsonb_build_object(
      'claimedOutcome', p_claimed_outcome,
      'claimedWinnerId', v_claimed_winner_id,
      'evidenceCount', coalesce(array_length(p_evidence_object_ids, 1), 0)
    )
  );

  select * into v_other_claim
  from public.dare_result_claims drc
  where drc.dare_id = p_dare_id
    and drc.user_id <> p_user_id
  limit 1;
  v_has_other_claim := found;

  select count(*)::integer into v_claims_count
  from public.dare_result_claims drc
  where drc.dare_id = p_dare_id
    and drc.user_id in (v_dare.issuer_id, v_dare.challenger_id);

  if p_claimed_outcome = 'dispute'
    or (v_has_other_claim and v_other_claim.claimed_outcome = 'dispute') then
    claim_state := 'dispute_requested';
  elsif v_has_other_claim
    and v_other_claim.claimed_outcome = p_claimed_outcome
    and v_other_claim.claimed_winner_id is not distinct from v_claimed_winner_id then
    claim_state := 'agreed';
    v_agreed_winner_id := v_claimed_winner_id;

    update public.dares
      set status = 'completed',
          winner_id = v_agreed_winner_id,
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
      p_user_id,
      'court_completed',
      jsonb_build_object('winnerId', v_agreed_winner_id, 'source', 'result_claim_consensus')
    );
  elsif v_has_other_claim then
    claim_state := 'conflicted';
  else
    claim_state := 'pending';
  end if;

  if claim_state in ('dispute_requested', 'conflicted') then
    v_evidence_a_id := case
      when p_user_id = v_dare.issuer_id then p_evidence_object_ids[1]
      when v_has_other_claim and v_other_claim.user_id = v_dare.issuer_id then v_other_claim.evidence_object_ids[1]
      else null
    end;
    v_evidence_b_id := case
      when p_user_id = v_dare.challenger_id then p_evidence_object_ids[1]
      when v_has_other_claim and v_other_claim.user_id = v_dare.challenger_id then v_other_claim.evidence_object_ids[1]
      else null
    end;
    v_case_reason := left(
      case
        when claim_state = 'dispute_requested' then 'Result dispute requested by participant claim.'
        else 'Conflicting participant result claims require jury review.'
      end
      || E'\n\nCurrent claim: ' || p_claimed_outcome
      || case when v_has_other_claim then E'\nOther claim: ' || v_other_claim.claimed_outcome else '' end
      || case when nullif(btrim(coalesce(p_rationale, '')), '') is not null then E'\nRationale: ' || btrim(p_rationale) else '' end,
      3000
    );

    select * into v_case
    from public.jury_cases jc
    where jc.dare_id = p_dare_id
      and jc.status not in ('closed', 'voided')
    order by jc.opened_at desc
    limit 1
    for update;

    if found then
      update public.jury_cases
        set evidence_a_id = coalesce(evidence_a_id, v_evidence_a_id),
            evidence_b_id = coalesce(evidence_b_id, v_evidence_b_id)
      where id = v_case.id
      returning * into v_case;
    else
      insert into public.jury_cases (
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
        v_evidence_a_id,
        v_evidence_b_id
      )
      returning * into v_case;
    end if;

    update public.dares
      set status = 'dispute_pending'
    where id = p_dare_id
    returning * into v_dare;

    update public.court_sessions
      set phase = 'disputed'
    where id = v_court.id
    returning * into v_court;

    update public.escrow_holds
      set hold_reason = 'dispute_pending'
    where dare_id = p_dare_id
      and status = 'held';

    update public.profiles
      set disputes = disputes + 1
    where id = p_user_id;

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
      'dispute_filed',
      jsonb_build_object('juryCaseId', v_case.id, 'source', 'result_claim')
    );
  end if;

  if claim_state not in ('dispute_requested', 'conflicted', 'agreed') and v_dare.status = 'active' then
    update public.dares
      set status = 'awaiting_result'
    where id = v_dare.id
    returning * into v_dare;
  end if;

  if claim_state not in ('dispute_requested', 'conflicted', 'agreed') and v_court.phase = 'active' then
    update public.court_sessions
      set phase = 'awaiting_result'
    where id = v_court.id
    returning * into v_court;
  end if;

  claim_id := v_claim_id;
  dare_id := v_dare.id;
  user_id := p_user_id;
  resolution_type := v_dare.resolution_type;
  claimed_outcome := p_claimed_outcome;
  claimed_winner_id := v_claimed_winner_id;
  dare_status := v_dare.status;
  court_phase := v_court.phase;
  agreed_winner_id := v_agreed_winner_id;
  claims_count := v_claims_count;
  return next;
exception
  when unique_violation then
    raise exception 'result_claim_already_submitted' using errcode = 'P0001';
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
  v_claims_count integer := 0;
  v_distinct_decisions integer := 0;
  v_dispute_claims integer := 0;
  v_prompt_count integer := 0;
  v_submission_count integer := 0;
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
    select count(*)::integer into v_prompt_count
    from public.dare_prompts
    where dare_prompts.dare_id = p_dare_id;

    if v_prompt_count <= 0 then
      raise exception 'result_not_ready' using errcode = 'P0001';
    end if;

    if v_dare.dare_type = 'skill' then
      select count(*)::integer into v_submission_count
      from public.dare_answer_submissions das
      where das.dare_id = p_dare_id
        and das.user_id in (v_dare.issuer_id, v_dare.challenger_id);

      if v_submission_count < v_prompt_count * 2 then
        raise exception 'result_not_ready' using errcode = 'P0001';
      end if;
    else
      select count(*)::integer into v_submission_count
      from public.dare_answer_submissions das
      where das.dare_id = p_dare_id
        and das.user_id = v_dare.challenger_id;

      if v_submission_count < v_prompt_count then
        raise exception 'result_not_ready' using errcode = 'P0001';
      end if;
    end if;

    if v_dare.dare_type = 'skill' then
      v_winner_id := case
        when v_court.score_a > v_court.score_b then v_dare.issuer_id
        when v_court.score_b > v_court.score_a then v_dare.challenger_id
        else null
      end;
    else
      v_winner_id := case when v_court.score_b > 0 then v_dare.challenger_id else null end;
    end if;
  elsif v_dare.resolution_type = 'witnessed'
    and (v_court.votes_a + v_court.votes_b) >= 3
    and v_court.votes_a <> v_court.votes_b then
    v_winner_id := case
      when v_court.votes_a > v_court.votes_b then v_dare.issuer_id
      else v_dare.challenger_id
    end;
  else
    select
      count(*)::integer,
      count(distinct jsonb_build_object(
        'outcome', claimed_outcome,
        'winner', claimed_winner_id
      ))::integer,
      count(*) filter (where claimed_outcome = 'dispute')::integer,
      min(claimed_winner_id)
    into v_claims_count, v_distinct_decisions, v_dispute_claims, v_winner_id
    from public.dare_result_claims
    where dare_result_claims.dare_id = p_dare_id
      and dare_result_claims.user_id in (v_dare.issuer_id, v_dare.challenger_id);

    if v_dispute_claims > 0 or v_claims_count < 2 or v_distinct_decisions > 1 then
      raise exception 'result_not_ready' using errcode = 'P0001';
    end if;
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
    jsonb_build_object(
      'winnerId', v_winner_id,
      'scoreA', v_court.score_a,
      'scoreB', v_court.score_b,
      'votesA', v_court.votes_a,
      'votesB', v_court.votes_b,
      'resolutionType', v_dare.resolution_type
    )
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

revoke all on function public.record_witness_attendance_action(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.record_witness_attendance_action(uuid, uuid)
  to service_role;

revoke all on function public.submit_witness_vote_action(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.submit_witness_vote_action(uuid, uuid, text)
  to service_role;

revoke all on function public.submit_result_claim_action(uuid, uuid, text, uuid, text, uuid[])
  from public, anon, authenticated;
grant execute on function public.submit_result_claim_action(uuid, uuid, text, uuid, text, uuid[])
  to service_role;

revoke all on function public.complete_dare_action(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.complete_dare_action(uuid, uuid)
  to service_role;
