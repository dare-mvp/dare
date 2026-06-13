-- Production Court result paths for witnessed and evidence DAREs.
--
-- Answer Key remains score-based and never exposes the committed answer key.
-- Witnessed DAREs can use audience votes or matching participant claims.
-- Evidence DAREs use participant result claims with uploaded evidence metadata,
-- then the existing dispute/jury path handles conflicts.

drop policy if exists "dare_court_events_participant_read" on public.dare_court_events;
create policy "dare_court_events_participant_read"
  on public.dare_court_events for select
  to authenticated
  using (
    event_type <> 'answer_submitted'
    and exists (
      select 1
      from public.dares d
      where d.id = dare_court_events.dare_id
        and ((select auth.uid()) = d.issuer_id or (select auth.uid()) = d.challenger_id)
    )
  );

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

  if v_dare.status = 'active' then
    update public.dares
      set status = 'awaiting_result'
    where id = v_dare.id
    returning * into v_dare;
  end if;

  if v_court.phase = 'active' then
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
    and (v_court.votes_a > 0 or v_court.votes_b > 0)
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

create or replace function public.create_evidence_upload_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_file_name text,
  p_mime_type text,
  p_file_size_bytes bigint
)
returns table (
  evidence_object_id uuid,
  dare_id uuid,
  user_id uuid,
  storage_bucket text,
  storage_path text,
  media_type text,
  byte_size bigint,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare public.dares%rowtype;
  v_evidence_id uuid := gen_random_uuid();
  v_extension text;
  v_path text;
  v_existing_count integer;
begin
  if p_file_name is null
    or char_length(trim(p_file_name)) < 1
    or char_length(trim(p_file_name)) > 180 then
    raise exception 'invalid_evidence_file_name' using errcode = 'P0001';
  end if;

  if p_mime_type not in ('image/png', 'image/jpeg', 'video/mp4') then
    raise exception 'invalid_evidence_mime_type' using errcode = 'P0001';
  end if;

  if p_file_size_bytes is null
    or p_file_size_bytes < 1
    or p_file_size_bytes > 10485760 then
    raise exception 'invalid_evidence_file_size' using errcode = 'P0001';
  end if;

  select * into v_dare
  from public.dares d
  where d.id = p_dare_id;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_user_id <> v_dare.issuer_id and p_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  if not (
    v_dare.status in ('completed', 'dispute_pending', 'jury_open')
    or (
      v_dare.resolution_type = 'evidence'
      and v_dare.status in ('active', 'awaiting_result')
    )
  ) then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  select count(*) into v_existing_count
  from public.evidence_objects eo
  where eo.dare_id = p_dare_id
    and eo.user_id = p_user_id
    and eo.status <> 'deleted';

  if v_existing_count >= 5 then
    raise exception 'evidence_limit_exceeded' using errcode = 'P0001';
  end if;

  v_extension := case p_mime_type
    when 'image/png' then '.png'
    when 'image/jpeg' then '.jpg'
    when 'video/mp4' then '.mp4'
  end;
  v_path := p_dare_id::text || '/' || p_user_id::text || '/' ||
    v_evidence_id::text || v_extension;

  insert into public.evidence_objects (
    id,
    dare_id,
    user_id,
    storage_bucket,
    storage_path,
    media_type,
    byte_size,
    status,
    metadata
  )
  values (
    v_evidence_id,
    p_dare_id,
    p_user_id,
    'dare-evidence',
    v_path,
    p_mime_type,
    p_file_size_bytes,
    'pending',
    jsonb_build_object('original_file_name', trim(p_file_name))
  );

  evidence_object_id := v_evidence_id;
  dare_id := p_dare_id;
  user_id := p_user_id;
  storage_bucket := 'dare-evidence';
  storage_path := v_path;
  media_type := p_mime_type;
  byte_size := p_file_size_bytes;
  status := 'pending';
  return next;
end;
$$;

create or replace function public.confirm_evidence_upload_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_evidence_object_id uuid,
  p_content_hash text default null
)
returns table (
  evidence_object_id uuid,
  jury_case_id uuid,
  dare_id uuid,
  side text,
  status text,
  uploaded_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare public.dares%rowtype;
  v_evidence public.evidence_objects%rowtype;
  v_case public.jury_cases%rowtype;
  v_side text;
begin
  if p_content_hash is not null
    and (
      char_length(p_content_hash) < 16
      or char_length(p_content_hash) > 128
    ) then
    raise exception 'invalid_evidence_content_hash' using errcode = 'P0001';
  end if;

  select * into v_dare
  from public.dares d
  where d.id = p_dare_id;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_user_id <> v_dare.issuer_id and p_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  select * into v_evidence
  from public.evidence_objects eo
  where eo.id = p_evidence_object_id
    and eo.dare_id = p_dare_id
    and eo.user_id = p_user_id
  for update;

  if not found then
    raise exception 'evidence_not_found' using errcode = 'P0001';
  end if;

  if v_evidence.status not in ('pending', 'uploaded') then
    raise exception 'invalid_evidence_state' using errcode = 'P0001';
  end if;

  select * into v_case
  from public.jury_cases jc
  where jc.dare_id = p_dare_id
    and jc.status in (
      'filed',
      'accepted_for_review',
      'jury_assignment',
      'jury_voting'
    )
  order by jc.opened_at desc
  limit 1
  for update;

  if not found
    and not (
      v_dare.resolution_type = 'evidence'
      and v_dare.status in ('active', 'awaiting_result')
    ) then
    raise exception 'jury_case_not_found' using errcode = 'P0001';
  end if;

  v_side := case when p_user_id = v_dare.issuer_id then 'A' else 'B' end;

  if v_case.id is not null then
    if v_side = 'A'
      and v_case.evidence_a_id is not null
      and v_case.evidence_a_id <> p_evidence_object_id then
      raise exception 'evidence_slot_filled' using errcode = 'P0001';
    end if;

    if v_side = 'B'
      and v_case.evidence_b_id is not null
      and v_case.evidence_b_id <> p_evidence_object_id then
      raise exception 'evidence_slot_filled' using errcode = 'P0001';
    end if;
  end if;

  update public.evidence_objects eo
    set status = 'uploaded',
        uploaded_at = coalesce(eo.uploaded_at, now()),
        content_hash = coalesce(p_content_hash, eo.content_hash)
  where eo.id = p_evidence_object_id
  returning * into v_evidence;

  if v_case.id is not null then
    update public.jury_cases jc
      set evidence_a_id = case
            when v_side = 'A' then p_evidence_object_id
            else jc.evidence_a_id
          end,
          evidence_b_id = case
            when v_side = 'B' then p_evidence_object_id
            else jc.evidence_b_id
          end
    where jc.id = v_case.id
    returning * into v_case;
  else
    insert into public.dare_court_events (
      dare_id,
      court_session_id,
      actor_user_id,
      event_type,
      payload
    )
    select
      p_dare_id,
      cs.id,
      p_user_id,
      'evidence_submitted',
      jsonb_build_object('evidenceObjectId', p_evidence_object_id)
    from public.court_sessions cs
    where cs.dare_id = p_dare_id
    limit 1;
  end if;

  evidence_object_id := v_evidence.id;
  jury_case_id := v_case.id;
  dare_id := p_dare_id;
  side := v_side;
  status := v_evidence.status;
  uploaded_at := v_evidence.uploaded_at;
  return next;
end;
$$;

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

revoke all on function public.create_evidence_upload_action(
  uuid, uuid, text, text, bigint
) from public, anon, authenticated;
grant execute on function public.create_evidence_upload_action(
  uuid, uuid, text, text, bigint
) to service_role;

revoke all on function public.confirm_evidence_upload_action(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.confirm_evidence_upload_action(
  uuid, uuid, uuid, text
) to service_role;
