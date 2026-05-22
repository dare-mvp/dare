-- ============================================================
-- complete_and_settle_rpcs.sql
-- Authoritative DARE completion and escrow settlement.
-- ============================================================

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
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_score_a integer;
  v_score_b integer;
  v_assigned_rounds integer;
  v_answer_count integer;
  v_winner_id uuid;
  v_now timestamptz := now();
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

  if v_dare.status = 'settled' then
    select *
      into v_court
    from court_sessions
    where court_sessions.dare_id = p_dare_id;

    dare_id := v_dare.id;
    status := v_dare.status;
    winner_id := v_dare.winner_id;
    score_a := coalesce(v_court.score_a, 0);
    score_b := coalesce(v_court.score_b, 0);
    phase := coalesce(v_court.phase, 'completed');
    completed_at := v_dare.completed_at;
    dispute_deadline_at := v_dare.dispute_deadline_at;
    return next;
    return;
  end if;

  if v_dare.status not in ('active', 'awaiting_result', 'completed') then
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

  if v_court.phase not in ('active', 'awaiting_result', 'completed') then
    raise exception 'invalid_court_state' using errcode = 'P0001';
  end if;

  select count(*)
    into v_assigned_rounds
  from dare_quiz_rounds dqr
  where dqr.dare_id = p_dare_id;

  select count(*)
    into v_answer_count
  from dare_quiz_answers dqa
  where dqa.dare_id = p_dare_id;

  if v_dare.status <> 'completed'
    and v_court.server_end_time is not null
    and v_now < v_court.server_end_time
    and v_answer_count < (v_assigned_rounds * 2) then
    raise exception 'court_still_active' using errcode = 'P0001';
  end if;

  select coalesce(count(*) filter (
    where dqa.user_id = v_dare.issuer_id and dqa.correct
  ), 0)
    into v_score_a
  from dare_quiz_answers dqa
  where dqa.dare_id = p_dare_id;

  select coalesce(count(*) filter (
    where dqa.user_id = v_dare.challenger_id and dqa.correct
  ), 0)
    into v_score_b
  from dare_quiz_answers dqa
  where dqa.dare_id = p_dare_id;

  if v_score_a > v_score_b then
    v_winner_id := v_dare.issuer_id;
  elsif v_score_b > v_score_a then
    v_winner_id := v_dare.challenger_id;
  else
    v_winner_id := null;
  end if;

  update court_sessions
    set phase = 'completed',
        score_a = v_score_a,
        score_b = v_score_b,
        server_end_time = coalesce(server_end_time, v_now)
  where id = v_court.id
  returning * into v_court;

  update dares
    set status = 'completed',
        winner_id = v_winner_id,
        completed_at = coalesce(dares.completed_at, v_now),
        dispute_deadline_at = coalesce(
          dares.dispute_deadline_at,
          v_now + interval '10 minutes'
        )
  where dares.id = p_dare_id
  returning * into v_dare;

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
        jsonb_build_object('reason', 'tie')
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
    where id = case
      when v_dare.winner_id = v_dare.issuer_id then v_dare.challenger_id
      else v_dare.issuer_id
    end
    returning trust_score into v_resulting_score;

    insert into trust_events (
      user_id,
      event_type,
      delta,
      resulting_score,
      dare_id
    )
    values (
      case
        when v_dare.winner_id = v_dare.issuer_id then v_dare.challenger_id
        else v_dare.issuer_id
      end,
      'dare_loss',
      -5,
      v_resulting_score,
      p_dare_id
    );
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

revoke all on function public.complete_dare_action(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.complete_dare_action(uuid, uuid)
to service_role;

revoke all on function public.settle_dare_action(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.settle_dare_action(uuid, uuid)
to service_role;
