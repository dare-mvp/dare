-- ============================================================
-- mobile_critical_gap_fixes.sql
-- Launch-critical settlement, heartbeat, jury, and auto-settle fixes.
-- ============================================================

create or replace function public.settle_dare_action(
  p_actor_user_id uuid,
  p_dare_id uuid
)
returns table (
  dare_id uuid,
  status text,
  winner_id uuid,
  payout_amount integer,
  refunded_amount integer,
  ledger_entries_created integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_hold escrow_holds%rowtype;
  v_winner_wallet wallet_accounts%rowtype;
  v_total_held integer;
  v_payout_ledger_id uuid;
  v_refund_ledger_id uuid;
  v_created integer := 0;
  v_refunded integer := 0;
  v_resulting_score integer;
  v_loser_id uuid;
begin
  select *
    into v_dare
  from dares
  where id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_actor_user_id <> v_dare.issuer_id
    and p_actor_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  select *
    into v_court
  from court_sessions
  where court_sessions.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if v_dare.status = 'settled' then
    select coalesce(sum(le.amount), 0)
      into v_total_held
    from ledger_entries le
    where le.dare_id = p_dare_id
      and le.type = 'payout'
      and le.status = 'posted';

    select coalesce(sum(le.amount), 0)
      into v_refunded
    from ledger_entries le
    where le.dare_id = p_dare_id
      and le.type = 'escrow_release'
      and le.status = 'posted';

    dare_id := v_dare.id;
    status := v_dare.status;
    winner_id := v_dare.winner_id;
    payout_amount := v_total_held;
    refunded_amount := v_refunded;
    ledger_entries_created := 0;
    return next;
    return;
  end if;

  if v_dare.status not in ('completed', 'forfeited') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  if v_dare.status = 'completed'
    and v_dare.dispute_deadline_at is not null
    and now() < v_dare.dispute_deadline_at then
    raise exception 'dispute_window_open' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jury_cases jc
    where jc.dare_id = p_dare_id
      and jc.status in ('filed', 'accepted_for_review', 'jury_assignment', 'jury_voting')
  ) then
    raise exception 'dispute_window_open' using errcode = 'P0001';
  end if;

  select coalesce(sum(eh.amount), 0)
    into v_total_held
  from escrow_holds eh
  where eh.dare_id = p_dare_id
    and eh.status = 'held';

  if v_total_held <= 0 then
    raise exception 'escrow_not_found' using errcode = 'P0001';
  end if;

  if v_dare.winner_id is null then
    for v_hold in
      select *
      from escrow_holds
      where escrow_holds.dare_id = p_dare_id
        and escrow_holds.status = 'held'
      for update
    loop
      v_refund_ledger_id := gen_random_uuid();

      insert into ledger_entries (
        id,
        wallet_account_id,
        user_id,
        dare_id,
        type,
        direction,
        amount,
        currency,
        status,
        idempotency_key,
        metadata
      )
      values (
        v_refund_ledger_id,
        v_hold.wallet_account_id,
        v_hold.user_id,
        p_dare_id,
        'escrow_release',
        'credit',
        v_hold.amount,
        v_hold.currency,
        'posted',
        'settle:' || p_dare_id::text || ':refund:' || v_hold.user_id::text,
        jsonb_build_object('reason', 'tie_or_void')
      );

      update escrow_holds
        set status = 'refunded',
            release_ledger_entry_id = v_refund_ledger_id,
            released_at = now()
      where id = v_hold.id;

      v_refunded := v_refunded + v_hold.amount;
      v_created := v_created + 1;
    end loop;
  else
    select *
      into v_winner_wallet
    from wallet_accounts
    where user_id = v_dare.winner_id
      and currency = v_dare.currency
    for update;

    if not found then
      raise exception 'wallet_not_found' using errcode = 'P0001';
    end if;

    v_payout_ledger_id := gen_random_uuid();

    insert into ledger_entries (
      id,
      wallet_account_id,
      user_id,
      dare_id,
      type,
      direction,
      amount,
      currency,
      status,
      idempotency_key,
      metadata
    )
    values (
      v_payout_ledger_id,
      v_winner_wallet.id,
      v_dare.winner_id,
      p_dare_id,
      'payout',
      'credit',
      v_total_held,
      v_dare.currency,
      'posted',
      'settle:' || p_dare_id::text || ':payout',
      jsonb_build_object('winner_id', v_dare.winner_id)
    );

    update escrow_holds
      set status = 'released',
          release_ledger_entry_id = v_payout_ledger_id,
          released_at = now()
    where escrow_holds.dare_id = p_dare_id
      and escrow_holds.status = 'held';

    v_created := 1;
  end if;

  update dares
    set status = 'settled',
        settled_at = now()
  where id = p_dare_id
  returning * into v_dare;

  update court_sessions
    set phase = 'completed'
  where id = v_court.id;

  if v_dare.winner_id is not null then
    v_loser_id := case
      when v_dare.winner_id = v_dare.issuer_id then v_dare.challenger_id
      else v_dare.issuer_id
    end;

    update profiles
      set wins = wins + 1,
          trust_score = least(1000, trust_score + 10)
    where id = v_dare.winner_id
    returning trust_score into v_resulting_score;

    insert into trust_events (
      user_id,
      event_type,
      delta,
      resulting_score,
      dare_id
    )
    values (v_dare.winner_id, 'dare_win', 10, v_resulting_score, p_dare_id);

    update profiles
      set losses = losses + 1,
          trust_score = greatest(0, trust_score - 5)
    where id = v_loser_id
    returning trust_score into v_resulting_score;

    insert into trust_events (
      user_id,
      event_type,
      delta,
      resulting_score,
      dare_id
    )
    values (v_loser_id, 'dare_loss', -5, v_resulting_score, p_dare_id);
  end if;

  dare_id := v_dare.id;
  status := v_dare.status;
  winner_id := v_dare.winner_id;
  payout_amount := case when v_dare.winner_id is null then 0 else v_total_held end;
  refunded_amount := v_refunded;
  ledger_entries_created := v_created;
  return next;
exception
  when unique_violation then
    raise exception 'settlement_already_processed' using errcode = 'P0001';
end;
$$;

create or replace function public.forfeit_dare_action(
  p_actor_user_id uuid,
  p_dare_id uuid
)
returns table (
  dare_id uuid,
  status text,
  forfeiter_id uuid,
  winner_id uuid,
  court_phase text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_winner_id uuid;
  v_resulting_score integer;
begin
  select *
    into v_dare
  from dares d
  where d.id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_actor_user_id <> v_dare.issuer_id and p_actor_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  select *
    into v_court
  from court_sessions cs
  where cs.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if v_dare.status = 'settled' then
    dare_id := v_dare.id;
    status := v_dare.status;
    forfeiter_id := p_actor_user_id;
    winner_id := v_dare.winner_id;
    court_phase := coalesce(v_court.phase, 'completed');
    completed_at := v_dare.completed_at;
    return next;
    return;
  end if;

  if v_dare.status <> 'forfeited' then
    if v_dare.status <> 'active' then
      raise exception 'invalid_dare_state' using errcode = 'P0001';
    end if;

    if v_court.phase <> 'active' then
      raise exception 'invalid_court_state' using errcode = 'P0001';
    end if;

    v_winner_id := case
      when p_actor_user_id = v_dare.issuer_id then v_dare.challenger_id
      else v_dare.issuer_id
    end;

    update court_sessions cs
      set phase = 'forfeited',
          server_end_time = coalesce(cs.server_end_time, now())
    where cs.id = v_court.id
    returning * into v_court;

    update dares d
      set status = 'forfeited',
          winner_id = v_winner_id,
          completed_at = coalesce(d.completed_at, now()),
          dispute_deadline_at = now()
    where d.id = p_dare_id
    returning * into v_dare;

    update profiles p
      set trust_score = greatest(0, p.trust_score - 10)
    where p.id = p_actor_user_id
    returning p.trust_score into v_resulting_score;

    insert into trust_events (
      user_id,
      event_type,
      delta,
      resulting_score,
      dare_id
    )
    values (
      p_actor_user_id,
      'dare_forfeit',
      -10,
      v_resulting_score,
      p_dare_id
    );
  end if;

  perform *
  from settle_dare_action(p_actor_user_id, p_dare_id)
  limit 1;

  select *
    into v_dare
  from dares d
  where d.id = p_dare_id;

  select *
    into v_court
  from court_sessions cs
  where cs.dare_id = p_dare_id;

  dare_id := v_dare.id;
  status := v_dare.status;
  forfeiter_id := p_actor_user_id;
  winner_id := v_dare.winner_id;
  court_phase := coalesce(v_court.phase, 'completed');
  completed_at := v_dare.completed_at;
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
  v_resulting_score integer;
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

  update profiles
    set trust_score = least(1000, trust_score + 2)
  where id = p_juror_id
  returning trust_score into v_resulting_score;

  insert into trust_events (
    user_id,
    event_type,
    delta,
    resulting_score,
    jury_case_id
  )
  values (
    p_juror_id,
    'jury_vote_completed',
    2,
    v_resulting_score,
    p_jury_case_id
  );

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

      update dares d
        set status = 'dispute_pending'
      where d.id = v_dare.id
      returning * into v_dare;
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

create or replace function public.forfeit_stale_court_sessions_action()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session record;
  v_a_last timestamptz;
  v_b_last timestamptz;
  v_a_stale boolean;
  v_b_stale boolean;
  v_forfeiter_id uuid;
  v_forfeited integer := 0;
begin
  for v_session in
    select
      cs.id as court_session_id,
      cs.dare_id,
      cs.server_start_time,
      cs.player_a_heartbeat_at,
      cs.player_b_heartbeat_at,
      d.issuer_id,
      d.challenger_id
    from court_sessions cs
    join dares d on d.id = cs.dare_id
    where cs.phase = 'active'
      and d.status = 'active'
      and cs.server_start_time is not null
      and now() >= cs.server_start_time + interval '60 seconds'
    for update of cs, d
  loop
    v_a_last := coalesce(v_session.player_a_heartbeat_at, v_session.server_start_time);
    v_b_last := coalesce(v_session.player_b_heartbeat_at, v_session.server_start_time);
    v_a_stale := v_a_last + interval '60 seconds' < now();
    v_b_stale := v_b_last + interval '60 seconds' < now();
    v_forfeiter_id := null;

    if v_a_stale and not v_b_stale then
      v_forfeiter_id := v_session.issuer_id;
    elsif v_b_stale and not v_a_stale then
      v_forfeiter_id := v_session.challenger_id;
    elsif v_a_stale and v_b_stale and v_a_last < v_b_last then
      v_forfeiter_id := v_session.issuer_id;
    elsif v_a_stale and v_b_stale and v_b_last < v_a_last then
      v_forfeiter_id := v_session.challenger_id;
    end if;

    if v_forfeiter_id is not null then
      perform *
      from forfeit_dare_action(v_forfeiter_id, v_session.dare_id)
      limit 1;

      v_forfeited := v_forfeited + 1;
    end if;
  end loop;

  return v_forfeited;
end;
$$;

create or replace function public.expire_jury_cases_action()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_case jury_cases%rowtype;
  v_votes_cast integer;
  v_expired integer := 0;
begin
  for v_case in
    select *
    from jury_cases jc
    where jc.status = 'jury_voting'
      and not exists (
        select 1
        from jury_assignments active_assignment
        where active_assignment.jury_case_id = jc.id
          and active_assignment.status in ('assigned', 'claimed')
          and (
            active_assignment.due_at is null
            or active_assignment.due_at > now()
          )
      )
    for update of jc
  loop
    select count(*)::integer
      into v_votes_cast
    from jury_votes jv
    where jv.jury_case_id = v_case.id;

    if v_votes_cast < v_case.votes_needed then
      update jury_assignments
        set status = 'expired'
      where jury_case_id = v_case.id
        and status in ('assigned', 'claimed');

      update jury_cases
        set status = 'escalated',
            verdict = 'escalate',
            escalated_at = now()
      where id = v_case.id;

      update dares
        set status = 'dispute_pending'
      where id = v_case.dare_id
        and status = 'jury_open';

      v_expired := v_expired + 1;
    end if;
  end loop;

  return v_expired;
end;
$$;

create or replace function public.auto_settle_expired_dares_action()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare record;
  v_settled integer := 0;
begin
  for v_dare in
    select d.id, d.issuer_id
    from dares d
    where d.status in ('completed', 'forfeited')
      and (
        d.status = 'forfeited'
        or d.dispute_deadline_at is null
        or d.dispute_deadline_at <= now()
      )
      and not exists (
        select 1
        from jury_cases jc
        where jc.dare_id = d.id
          and jc.status in ('filed', 'accepted_for_review', 'jury_assignment', 'jury_voting')
      )
    for update of d
  loop
    begin
      perform *
      from settle_dare_action(v_dare.issuer_id, v_dare.id)
      limit 1;

      v_settled := v_settled + 1;
    exception
      when others then null;
    end;
  end loop;

  return v_settled;
end;
$$;

revoke all on function public.settle_dare_action(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.settle_dare_action(uuid, uuid)
to service_role;

revoke all on function public.forfeit_dare_action(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.forfeit_dare_action(uuid, uuid)
to service_role;

revoke all on function public.cast_jury_vote_action(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.cast_jury_vote_action(uuid, uuid, text, text)
to service_role;

revoke all on function public.forfeit_stale_court_sessions_action()
from public, anon, authenticated;
grant execute on function public.forfeit_stale_court_sessions_action()
to service_role, postgres;

revoke all on function public.expire_jury_cases_action()
from public, anon, authenticated;
grant execute on function public.expire_jury_cases_action()
to service_role, postgres;

revoke all on function public.auto_settle_expired_dares_action()
from public, anon, authenticated;
grant execute on function public.auto_settle_expired_dares_action()
to service_role, postgres;

select cron.schedule(
  'forfeit-stale-court-sessions',
  '* * * * *',
  $$
    select public.forfeit_stale_court_sessions_action();
  $$
);

select cron.schedule(
  'expire-jury-cases',
  '* * * * *',
  $$
    select public.expire_jury_cases_action();
  $$
);
