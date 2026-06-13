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
  v_dare public.dares%rowtype;
  v_court public.court_sessions%rowtype;
  v_hold public.escrow_holds%rowtype;
  v_winner_wallet public.wallet_accounts%rowtype;
  v_platform_wallet public.wallet_accounts%rowtype;
  v_total_held integer;
  v_payout_amount integer := 0;
  v_platform_fee integer := 0;
  v_payout_ledger_id uuid;
  v_platform_fee_ledger_id uuid;
  v_refund_ledger_id uuid;
  v_created integer := 0;
  v_refunded integer := 0;
  v_resulting_score integer;
  v_loser_id uuid;
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

  if v_dare.status = 'settled' then
    select coalesce(sum(le.amount), 0) into v_payout_amount
    from public.ledger_entries le
    where le.dare_id = p_dare_id
      and le.type = 'payout'
      and le.status = 'posted';

    select coalesce(sum(le.amount), 0) into v_refunded
    from public.ledger_entries le
    where le.dare_id = p_dare_id
      and le.type = 'escrow_release'
      and le.status = 'posted';

    dare_id := v_dare.id;
    status := v_dare.status;
    winner_id := v_dare.winner_id;
    payout_amount := v_payout_amount;
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
    from public.jury_cases jc
    where jc.dare_id = p_dare_id
      and jc.status in ('filed', 'accepted_for_review', 'jury_assignment', 'jury_voting')
  ) then
    raise exception 'dispute_window_open' using errcode = 'P0001';
  end if;

  select coalesce(sum(eh.amount), 0) into v_total_held
  from public.escrow_holds eh
  where eh.dare_id = p_dare_id
    and eh.status = 'held';

  if v_total_held <= 0 then
    raise exception 'escrow_not_found' using errcode = 'P0001';
  end if;

  if v_dare.winner_id is null then
    for v_hold in
      select *
      from public.escrow_holds
      where escrow_holds.dare_id = p_dare_id
        and escrow_holds.status = 'held'
      for update
    loop
      v_refund_ledger_id := gen_random_uuid();

      insert into public.ledger_entries (
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
        jsonb_build_object('reason', 'void_or_no_valid_completion', 'dare_type', v_dare.dare_type)
      );

      update public.escrow_holds
        set status = 'refunded',
            release_ledger_entry_id = v_refund_ledger_id,
            released_at = now()
      where id = v_hold.id;

      v_refunded := v_refunded + v_hold.amount;
      v_created := v_created + 1;
    end loop;
  else
    if v_dare.dare_type = 'task' and v_dare.winner_id <> v_dare.challenger_id then
      raise exception 'invalid_dare_state' using errcode = 'P0001';
    end if;

    v_platform_fee := least(v_dare.platform_fee, v_total_held);
    v_payout_amount := case
      when v_dare.winner_payout > 0 then least(v_dare.winner_payout, v_total_held - v_platform_fee)
      else v_total_held - v_platform_fee
    end;

    if v_payout_amount <= 0 then
      raise exception 'invalid_dare_state' using errcode = 'P0001';
    end if;

    select * into v_winner_wallet
    from public.wallet_accounts
    where user_id = v_dare.winner_id
      and currency = v_dare.currency
    for update;

    if not found then
      raise exception 'wallet_not_found' using errcode = 'P0001';
    end if;

    v_payout_ledger_id := gen_random_uuid();

    insert into public.ledger_entries (
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
      v_payout_amount,
      v_dare.currency,
      'posted',
      'settle:' || p_dare_id::text || ':payout',
      jsonb_build_object('winner_id', v_dare.winner_id, 'dare_type', v_dare.dare_type)
    );

    v_created := v_created + 1;

    if v_platform_fee > 0 then
      select wa.* into v_platform_wallet
      from public.wallet_accounts wa
      join public.profiles p on p.id = wa.user_id
      where p.username = 'dare_platform'
        and wa.currency = v_dare.currency
        and wa.status = 'active'
      for update of wa;

      if not found then
        raise exception 'platform_wallet_not_found' using errcode = 'P0001';
      end if;

      v_platform_fee_ledger_id := gen_random_uuid();

      insert into public.ledger_entries (
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
        v_platform_fee_ledger_id,
        v_platform_wallet.id,
        v_platform_wallet.user_id,
        p_dare_id,
        'platform_fee',
        'credit',
        v_platform_fee,
        v_dare.currency,
        'posted',
        'settle:' || p_dare_id::text || ':platform_fee',
        jsonb_build_object('winner_id', v_dare.winner_id, 'dare_type', v_dare.dare_type)
      );

      v_created := v_created + 1;
    end if;

    update public.escrow_holds
      set status = 'released',
          release_ledger_entry_id = v_payout_ledger_id,
          released_at = now()
    where escrow_holds.dare_id = p_dare_id
      and escrow_holds.status = 'held';
  end if;

  update public.dares
    set status = 'settled',
        settled_at = now()
  where id = p_dare_id
  returning * into v_dare;

  update public.court_sessions
    set phase = 'completed'
  where id = v_court.id;

  if v_dare.winner_id is not null then
    update public.profiles
      set wins = wins + 1,
          trust_score = least(1000, trust_score + 10)
    where id = v_dare.winner_id
    returning trust_score into v_resulting_score;

    insert into public.trust_events (
      user_id,
      event_type,
      delta,
      resulting_score,
      dare_id
    )
    values (v_dare.winner_id, 'dare_win', 10, v_resulting_score, p_dare_id);

    if v_dare.dare_type = 'skill' then
      v_loser_id := case
        when v_dare.winner_id = v_dare.issuer_id then v_dare.challenger_id
        else v_dare.issuer_id
      end;

      update public.profiles
        set losses = losses + 1,
            trust_score = greatest(0, trust_score - 5)
      where id = v_loser_id
      returning trust_score into v_resulting_score;

      insert into public.trust_events (
        user_id,
        event_type,
        delta,
        resulting_score,
        dare_id
      )
      values (v_loser_id, 'dare_loss', -5, v_resulting_score, p_dare_id);
    end if;
  end if;

  dare_id := v_dare.id;
  status := v_dare.status;
  winner_id := v_dare.winner_id;
  payout_amount := v_payout_amount;
  refunded_amount := v_refunded;
  ledger_entries_created := v_created;
  return next;
exception
  when unique_violation then
    raise exception 'settlement_already_processed' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_dare_action(
  uuid, text, text, text, text, text, integer, integer, text, integer, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_dare_action(
  uuid, text, text, text, text, text, integer, integer, text, integer, text, text, text, text, text, text, text, text
) to service_role;

revoke all on function public.accept_dare_action(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.accept_dare_action(uuid, uuid, text)
to service_role;

revoke all on function public.ready_dare_action(uuid, uuid, integer)
from public, anon, authenticated;
grant execute on function public.ready_dare_action(uuid, uuid, integer)
to service_role;

revoke all on function public.get_current_court_question_action(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.get_current_court_question_action(uuid, uuid)
to service_role;

revoke all on function public.submit_dare_answer_action(uuid, uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.submit_dare_answer_action(uuid, uuid, uuid, text)
to service_role;

revoke all on function public.complete_dare_action(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.complete_dare_action(uuid, uuid)
to service_role;

revoke all on function public.settle_dare_action(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.settle_dare_action(uuid, uuid)
to service_role;
