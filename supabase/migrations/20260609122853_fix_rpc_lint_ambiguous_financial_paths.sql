create or replace function public.approve_withdrawal_admin_action(
  p_admin_user_id uuid,
  p_withdrawal_request_id uuid,
  p_admin_note text
)
returns table (
  withdrawal_request_id uuid,
  user_id uuid,
  amount integer,
  currency text,
  status text,
  provider text,
  provider_transfer_reference text,
  processed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin profiles%rowtype;
  v_withdrawal withdrawal_requests%rowtype;
begin
  select * into v_admin
  from profiles
  where profiles.id = p_admin_user_id;

  if not found or not v_admin.is_admin then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  if p_admin_note is null or length(trim(p_admin_note)) < 5 then
    raise exception 'invalid_admin_note' using errcode = 'P0001';
  end if;

  select * into v_withdrawal
  from withdrawal_requests
  where withdrawal_requests.id = p_withdrawal_request_id
  for update;

  if not found then
    raise exception 'withdrawal_not_found' using errcode = 'P0001';
  end if;

  if v_withdrawal.status in ('approved', 'processing', 'completed') then
    return query
    select
      v_withdrawal.id,
      v_withdrawal.user_id,
      v_withdrawal.amount,
      v_withdrawal.currency,
      v_withdrawal.status,
      v_withdrawal.provider,
      v_withdrawal.provider_transfer_reference,
      v_withdrawal.processed_at;
    return;
  end if;

  if v_withdrawal.status <> 'pending' then
    raise exception 'invalid_withdrawal_state' using errcode = 'P0001';
  end if;

  update withdrawal_requests
  set status = 'approved',
      provider = 'paystack',
      provider_transfer_reference = coalesce(
        withdrawal_requests.provider_transfer_reference,
        'wd_' || replace(withdrawal_requests.id::text, '-', '')
      ),
      failure_reason = null,
      updated_at = now()
  where withdrawal_requests.id = p_withdrawal_request_id
  returning * into v_withdrawal;

  return query
  select
    v_withdrawal.id,
    v_withdrawal.user_id,
    v_withdrawal.amount,
    v_withdrawal.currency,
    v_withdrawal.status,
    v_withdrawal.provider,
    v_withdrawal.provider_transfer_reference,
    v_withdrawal.processed_at;
end;
$$;

create or replace function public.freeze_user_admin_action(
  p_admin_user_id uuid,
  p_target_user_id uuid,
  p_admin_note text
)
returns table (
  user_id uuid,
  account_status text,
  wallet_accounts_frozen integer,
  jury_opt_in boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin profiles%rowtype;
  v_target profiles%rowtype;
  v_wallets_frozen integer := 0;
begin
  select * into v_admin
  from profiles
  where profiles.id = p_admin_user_id;

  if not found or not v_admin.is_admin then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  if p_admin_user_id = p_target_user_id then
    raise exception 'invalid_admin_action' using errcode = 'P0001';
  end if;

  if p_admin_note is null or length(trim(p_admin_note)) < 5 then
    raise exception 'invalid_admin_note' using errcode = 'P0001';
  end if;

  select * into v_target
  from profiles
  where profiles.id = p_target_user_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  if v_target.account_status in ('closed', 'banned') then
    raise exception 'invalid_account_state' using errcode = 'P0001';
  end if;

  update profiles
  set account_status = 'frozen',
      jury_opt_in = false,
      jury_categories = '{}',
      updated_at = now()
  where profiles.id = p_target_user_id
  returning * into v_target;

  update wallet_accounts
  set status = 'frozen',
      updated_at = now()
  where wallet_accounts.user_id = p_target_user_id
    and wallet_accounts.status = 'active';

  get diagnostics v_wallets_frozen = row_count;

  return query
  select
    v_target.id,
    v_target.account_status,
    v_wallets_frozen,
    v_target.jury_opt_in,
    v_target.updated_at;
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
  where dares.id = p_dare_id
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
          completed_at = coalesce(dares.completed_at, now()),
          dispute_deadline_at = coalesce(dares.dispute_deadline_at, now() + interval '15 minutes')
    where dares.id = p_dare_id
    returning * into v_dare;

    update public.court_sessions
      set phase = 'completed'
    where court_sessions.id = v_court.id
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
        set evidence_a_id = coalesce(jury_cases.evidence_a_id, v_evidence_a_id),
            evidence_b_id = coalesce(jury_cases.evidence_b_id, v_evidence_b_id)
      where jury_cases.id = v_case.id
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
    where dares.id = p_dare_id
    returning * into v_dare;

    update public.court_sessions
      set phase = 'disputed'
    where court_sessions.id = v_court.id
    returning * into v_court;

    update public.escrow_holds
      set hold_reason = 'dispute_pending'
    where escrow_holds.dare_id = p_dare_id
      and escrow_holds.status = 'held';

    update public.profiles
      set disputes = profiles.disputes + 1
    where profiles.id = p_user_id;

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
    where dares.id = v_dare.id
    returning * into v_dare;
  end if;

  if claim_state not in ('dispute_requested', 'conflicted', 'agreed') and v_court.phase = 'active' then
    update public.court_sessions
      set phase = 'awaiting_result'
    where court_sessions.id = v_court.id
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
  where dares.id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_actor_user_id <> v_dare.issuer_id
    and p_actor_user_id <> v_dare.challenger_id
    and not exists (select 1 from public.profiles where profiles.id = p_actor_user_id and profiles.is_admin = true) then
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
        'outcome', drc.claimed_outcome,
        'winner', drc.claimed_winner_id
      ))::integer,
      count(*) filter (where drc.claimed_outcome = 'dispute')::integer,
      (array_agg(drc.claimed_winner_id order by drc.claimed_winner_id::text))[1]
    into v_claims_count, v_distinct_decisions, v_dispute_claims, v_winner_id
    from public.dare_result_claims drc
    where drc.dare_id = p_dare_id
      and drc.user_id in (v_dare.issuer_id, v_dare.challenger_id);

    if v_dispute_claims > 0 or v_claims_count < 2 or v_distinct_decisions > 1 then
      raise exception 'result_not_ready' using errcode = 'P0001';
    end if;
  end if;

  update public.dares
    set status = 'completed',
        winner_id = v_winner_id,
        completed_at = coalesce(dares.completed_at, now()),
        dispute_deadline_at = coalesce(dares.dispute_deadline_at, now() + interval '15 minutes')
  where dares.id = p_dare_id
  returning * into v_dare;

  update public.court_sessions
    set phase = 'completed'
  where court_sessions.id = v_court.id
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

revoke all on function public.approve_withdrawal_admin_action(uuid, uuid, text)
from public, anon, authenticated, service_role;
revoke all on function public.freeze_user_admin_action(uuid, uuid, text)
from public, anon, authenticated, service_role;
revoke all on function public.submit_result_claim_action(uuid, uuid, text, uuid, text, uuid[])
from public, anon, authenticated, service_role;
revoke all on function public.complete_dare_action(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.approve_withdrawal_admin_action(uuid, uuid, text)
to service_role;
grant execute on function public.freeze_user_admin_action(uuid, uuid, text)
to service_role;
grant execute on function public.submit_result_claim_action(uuid, uuid, text, uuid, text, uuid[])
to service_role;
grant execute on function public.complete_dare_action(uuid, uuid)
to service_role;
