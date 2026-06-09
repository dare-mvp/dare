create or replace function public.has_active_court_commitment(
  p_user_id uuid,
  p_exclude_dare_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.dares d
    where (d.issuer_id = p_user_id or d.challenger_id = p_user_id)
      and (p_exclude_dare_id is null or d.id <> p_exclude_dare_id)
      and d.status in (
        'ready_check',
        'active',
        'awaiting_result',
        'dispute_pending',
        'jury_open'
      )
  );
$$;

revoke all on function public.has_active_court_commitment(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.has_active_court_commitment(uuid, uuid)
to service_role;

create index if not exists dares_active_commitment_issuer_idx
  on public.dares (issuer_id, status)
  where status in ('ready_check', 'active', 'awaiting_result', 'dispute_pending', 'jury_open');

create index if not exists dares_active_commitment_challenger_idx
  on public.dares (challenger_id, status)
  where challenger_id is not null
    and status in ('ready_check', 'active', 'awaiting_result', 'dispute_pending', 'jury_open');

create or replace function public.accept_dare_action(
  p_challenger_id uuid,
  p_dare_id uuid,
  p_ledger_idempotency_key text
)
returns table (
  dare_id uuid,
  court_session_id uuid,
  escrow_hold_id uuid,
  ledger_entry_id uuid,
  status text,
  dare_type text,
  funding_model text,
  stake_amount integer,
  reward_amount integer,
  escrow_amount integer,
  currency text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_challenger public.profiles%rowtype;
  v_dare public.dares%rowtype;
  v_wallet public.wallet_accounts%rowtype;
  v_existing record;
  v_available integer;
  v_pending integer;
  v_withdrawable integer;
  v_ledger_id uuid;
  v_escrow_id uuid;
  v_court_id uuid;
  v_locks_issuer boolean;
begin
  select
    d.id as dare_id,
    cs.id as court_session_id,
    eh.id as escrow_hold_id,
    le.id as ledger_entry_id,
    d.status,
    d.dare_type,
    d.funding_model,
    d.stake_amount,
    d.reward_amount,
    eh.amount as escrow_amount,
    d.currency
    into v_existing
  from public.ledger_entries le
  join public.escrow_holds eh on eh.held_ledger_entry_id = le.id
  join public.dares d on d.id = le.dare_id
  left join public.court_sessions cs on cs.dare_id = d.id
  where le.idempotency_key = p_ledger_idempotency_key
  limit 1;

  if found then
    dare_id := v_existing.dare_id;
    court_session_id := v_existing.court_session_id;
    escrow_hold_id := v_existing.escrow_hold_id;
    ledger_entry_id := v_existing.ledger_entry_id;
    status := v_existing.status;
    dare_type := v_existing.dare_type;
    funding_model := v_existing.funding_model;
    stake_amount := v_existing.stake_amount;
    reward_amount := v_existing.reward_amount;
    escrow_amount := v_existing.escrow_amount;
    currency := v_existing.currency;
    return next;
    return;
  end if;

  select * into v_challenger
  from public.profiles
  where id = p_challenger_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  if v_challenger.account_status <> 'active'
    or v_challenger.risk_status not in ('normal', 'watch') then
    raise exception 'account_restricted' using errcode = 'P0001';
  end if;

  if v_challenger.kyc_tier = 'kyc0' then
    raise exception 'kyc_required' using errcode = 'P0001';
  end if;

  select * into v_dare
  from public.dares
  where id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if v_dare.issuer_id = p_challenger_id then
    raise exception 'self_challenge' using errcode = 'P0001';
  end if;

  if v_dare.status = 'ready_check' and v_dare.challenger_id = p_challenger_id then
    select id into v_court_id from public.court_sessions where court_sessions.dare_id = v_dare.id;
    dare_id := v_dare.id;
    court_session_id := v_court_id;
    escrow_hold_id := null;
    ledger_entry_id := null;
    status := v_dare.status;
    dare_type := v_dare.dare_type;
    funding_model := v_dare.funding_model;
    stake_amount := v_dare.stake_amount;
    reward_amount := v_dare.reward_amount;
    escrow_amount := 0;
    currency := v_dare.currency;
    return next;
    return;
  end if;

  if v_dare.status = 'open' then
    null;
  elsif v_dare.status = 'targeted_pending'
    and v_dare.challenger_id = p_challenger_id then
    null;
  else
    raise exception 'dare_not_acceptable' using errcode = 'P0001';
  end if;

  v_locks_issuer := v_dare.dare_type = 'skill'
    or v_dare.resolution_type = 'witnessed';

  if v_locks_issuer and v_dare.issuer_id::text < p_challenger_id::text then
    perform pg_advisory_xact_lock(hashtextextended('active_court_commitment:' || v_dare.issuer_id::text, 0::bigint));
    perform pg_advisory_xact_lock(hashtextextended('active_court_commitment:' || p_challenger_id::text, 0::bigint));
  else
    perform pg_advisory_xact_lock(hashtextextended('active_court_commitment:' || p_challenger_id::text, 0::bigint));
    if v_locks_issuer then
      perform pg_advisory_xact_lock(hashtextextended('active_court_commitment:' || v_dare.issuer_id::text, 0::bigint));
    end if;
  end if;

  if public.has_active_court_commitment(p_challenger_id, v_dare.id) then
    raise exception 'active_court_commitment' using errcode = 'P0001';
  end if;

  if v_locks_issuer
    and public.has_active_court_commitment(v_dare.issuer_id, v_dare.id) then
    raise exception 'active_court_commitment' using errcode = 'P0001';
  end if;

  v_court_id := gen_random_uuid();

  if v_dare.dare_type = 'skill' then
    select * into v_wallet
    from public.wallet_accounts
    where wallet_accounts.user_id = p_challenger_id
      and wallet_accounts.currency = v_dare.currency
    for update;

    if not found then
      raise exception 'wallet_not_found' using errcode = 'P0001';
    end if;

    if v_wallet.status <> 'active' then
      raise exception 'wallet_restricted' using errcode = 'P0001';
    end if;

    select coalesce(sum(
      case
        when le.direction = 'credit' and le.status = 'posted' then le.amount
        when le.direction = 'debit' and le.status = 'posted' then -le.amount
        else 0
      end
    ), 0)
      into v_available
    from public.ledger_entries le
    where le.wallet_account_id = v_wallet.id;

    select coalesce(sum(le.amount), 0)
      into v_pending
    from public.ledger_entries le
    where le.wallet_account_id = v_wallet.id
      and le.type = 'withdrawal_pending'
      and le.status = 'pending';

    v_withdrawable := v_available - v_pending;
    if v_withdrawable < v_dare.stake_amount then
      raise exception 'insufficient_funds' using errcode = 'P0001';
    end if;

    v_ledger_id := gen_random_uuid();
    v_escrow_id := gen_random_uuid();

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
      balance_before,
      balance_after,
      idempotency_key,
      metadata
    )
    values (
      v_ledger_id,
      v_wallet.id,
      p_challenger_id,
      v_dare.id,
      'escrow_hold',
      'debit',
      v_dare.stake_amount,
      v_dare.currency,
      'posted',
      v_withdrawable,
      v_withdrawable - v_dare.stake_amount,
      p_ledger_idempotency_key,
      jsonb_build_object('role', 'challenger', 'dare_type', v_dare.dare_type, 'funding_model', v_dare.funding_model)
    );

    insert into public.escrow_holds (
      id,
      dare_id,
      user_id,
      wallet_account_id,
      amount,
      currency,
      status,
      hold_reason,
      held_ledger_entry_id
    )
    values (
      v_escrow_id,
      v_dare.id,
      p_challenger_id,
      v_wallet.id,
      v_dare.stake_amount,
      v_dare.currency,
      'held',
      'dare_active',
      v_ledger_id
    );
  end if;

  update public.dares
    set challenger_id = p_challenger_id,
        status = 'ready_check',
        accepted_at = now()
  where id = v_dare.id;

  update public.dare_constitutions
    set accepted_by_challenger_at = now()
  where id = v_dare.constitution_id;

  insert into public.court_sessions (id, dare_id, phase)
  values (v_court_id, v_dare.id, 'ready_check');

  dare_id := v_dare.id;
  court_session_id := v_court_id;
  escrow_hold_id := v_escrow_id;
  ledger_entry_id := v_ledger_id;
  status := 'ready_check';
  dare_type := v_dare.dare_type;
  funding_model := v_dare.funding_model;
  stake_amount := v_dare.stake_amount;
  reward_amount := v_dare.reward_amount;
  escrow_amount := case when v_dare.dare_type = 'skill' then v_dare.stake_amount else 0 end;
  currency := v_dare.currency;
  return next;
end;
$$;

revoke all on function public.accept_dare_action(uuid, uuid, text)
from public, anon, authenticated, service_role;

grant execute on function public.accept_dare_action(uuid, uuid, text)
to authenticated, service_role;
