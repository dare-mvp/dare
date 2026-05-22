-- ============================================================
-- dare_action_rpcs.sql
-- Atomic DARE create/accept entrypoints for Edge Functions.
-- ============================================================

create or replace function public.create_dare_action(
  p_issuer_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_stake_amount integer,
  p_currency text,
  p_duration_seconds integer,
  p_target_username text,
  p_constitution_test text,
  p_constitution_rules text,
  p_constitution_proof_method text,
  p_constitution_edge_cases text,
  p_ledger_idempotency_key text
)
returns table (
  dare_id uuid,
  constitution_id uuid,
  escrow_hold_id uuid,
  ledger_entry_id uuid,
  status text,
  stake_amount integer,
  currency text,
  challenger_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_issuer profiles%rowtype;
  v_target profiles%rowtype;
  v_wallet wallet_accounts%rowtype;
  v_existing record;
  v_available integer;
  v_pending integer;
  v_withdrawable integer;
  v_dare_id uuid;
  v_constitution_id uuid;
  v_ledger_id uuid;
  v_escrow_id uuid;
  v_status text;
begin
  select
    d.id as dare_id,
    d.constitution_id,
    eh.id as escrow_hold_id,
    le.id as ledger_entry_id,
    d.status,
    d.stake_amount,
    d.currency,
    d.challenger_id
    into v_existing
  from ledger_entries le
  join escrow_holds eh on eh.held_ledger_entry_id = le.id
  join dares d on d.id = le.dare_id
  where le.idempotency_key = p_ledger_idempotency_key
  limit 1;

  if found then
    dare_id := v_existing.dare_id;
    constitution_id := v_existing.constitution_id;
    escrow_hold_id := v_existing.escrow_hold_id;
    ledger_entry_id := v_existing.ledger_entry_id;
    status := v_existing.status;
    stake_amount := v_existing.stake_amount;
    currency := v_existing.currency;
    challenger_id := v_existing.challenger_id;
    return next;
    return;
  end if;

  select *
    into v_issuer
  from profiles
  where id = p_issuer_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  if v_issuer.account_status <> 'active'
    or v_issuer.risk_status not in ('normal', 'watch') then
    raise exception 'account_restricted' using errcode = 'P0001';
  end if;

  if v_issuer.kyc_tier = 'kyc0' then
    raise exception 'kyc_required' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from dare_categories dc
    where dc.id = p_category and dc.active = true
  ) then
    raise exception 'invalid_category' using errcode = 'P0001';
  end if;

  if p_target_username is not null then
    select *
      into v_target
    from profiles
    where username = p_target_username;

    if not found then
      raise exception 'target_not_found' using errcode = 'P0001';
    end if;

    if v_target.id = p_issuer_id then
      raise exception 'self_challenge' using errcode = 'P0001';
    end if;

    if v_target.account_status <> 'active'
      or v_target.risk_status not in ('normal', 'watch')
      or v_target.kyc_tier = 'kyc0' then
      raise exception 'target_restricted' using errcode = 'P0001';
    end if;
  end if;

  select *
    into v_wallet
  from wallet_accounts
  where wallet_accounts.user_id = p_issuer_id
    and wallet_accounts.currency = p_currency
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
  from ledger_entries le
  where le.wallet_account_id = v_wallet.id;

  select coalesce(sum(le.amount), 0)
    into v_pending
  from ledger_entries le
  where le.wallet_account_id = v_wallet.id
    and le.type = 'withdrawal_pending'
    and le.status = 'pending';

  v_withdrawable := v_available - v_pending;
  if v_withdrawable < p_stake_amount then
    raise exception 'insufficient_funds' using errcode = 'P0001';
  end if;

  v_status := case when p_target_username is null then 'open' else 'targeted_pending' end;
  v_dare_id := gen_random_uuid();
  v_constitution_id := gen_random_uuid();
  v_ledger_id := gen_random_uuid();
  v_escrow_id := gen_random_uuid();

  insert into dares (
    id,
    issuer_id,
    challenger_id,
    title,
    description,
    category,
    resolution_type,
    status,
    stake_amount,
    currency,
    winner_payout,
    duration_seconds,
    expires_at
  )
  values (
    v_dare_id,
    p_issuer_id,
    case when p_target_username is null then null else v_target.id end,
    p_title,
    p_description,
    p_category,
    'algorithmic',
    v_status,
    p_stake_amount,
    p_currency,
    p_stake_amount * 2,
    p_duration_seconds,
    now() + interval '24 hours'
  );

  insert into dare_constitutions (
    id,
    dare_id,
    test,
    rules,
    proof_method,
    edge_cases,
    accepted_by_issuer_at
  )
  values (
    v_constitution_id,
    v_dare_id,
    p_constitution_test,
    p_constitution_rules,
    p_constitution_proof_method,
    p_constitution_edge_cases,
    now()
  );

  update dares
    set constitution_id = v_constitution_id
  where id = v_dare_id;

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
    balance_before,
    balance_after,
    idempotency_key,
    metadata
  )
  values (
    v_ledger_id,
    v_wallet.id,
    p_issuer_id,
    v_dare_id,
    'escrow_hold',
    'debit',
    p_stake_amount,
    p_currency,
    'posted',
    v_withdrawable,
    v_withdrawable - p_stake_amount,
    p_ledger_idempotency_key,
    jsonb_build_object('role', 'issuer')
  );

  insert into escrow_holds (
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
    v_dare_id,
    p_issuer_id,
    v_wallet.id,
    p_stake_amount,
    p_currency,
    'held',
    'dare_active',
    v_ledger_id
  );

  dare_id := v_dare_id;
  constitution_id := v_constitution_id;
  escrow_hold_id := v_escrow_id;
  ledger_entry_id := v_ledger_id;
  status := v_status;
  stake_amount := p_stake_amount;
  currency := p_currency;
  challenger_id := case when p_target_username is null then null else v_target.id end;
  return next;
end;
$$;

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
  stake_amount integer,
  currency text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_challenger profiles%rowtype;
  v_dare dares%rowtype;
  v_wallet wallet_accounts%rowtype;
  v_existing record;
  v_available integer;
  v_pending integer;
  v_withdrawable integer;
  v_ledger_id uuid;
  v_escrow_id uuid;
  v_court_id uuid;
begin
  select
    d.id as dare_id,
    cs.id as court_session_id,
    eh.id as escrow_hold_id,
    le.id as ledger_entry_id,
    d.status,
    d.stake_amount,
    d.currency
    into v_existing
  from ledger_entries le
  join escrow_holds eh on eh.held_ledger_entry_id = le.id
  join dares d on d.id = le.dare_id
  left join court_sessions cs on cs.dare_id = d.id
  where le.idempotency_key = p_ledger_idempotency_key
  limit 1;

  if found then
    dare_id := v_existing.dare_id;
    court_session_id := v_existing.court_session_id;
    escrow_hold_id := v_existing.escrow_hold_id;
    ledger_entry_id := v_existing.ledger_entry_id;
    status := v_existing.status;
    stake_amount := v_existing.stake_amount;
    currency := v_existing.currency;
    return next;
    return;
  end if;

  select *
    into v_challenger
  from profiles
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

  select *
    into v_dare
  from dares
  where id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if v_dare.issuer_id = p_challenger_id then
    raise exception 'self_challenge' using errcode = 'P0001';
  end if;

  if v_dare.status = 'open' then
    null;
  elsif v_dare.status = 'targeted_pending'
    and v_dare.challenger_id = p_challenger_id then
    null;
  else
    raise exception 'dare_not_acceptable' using errcode = 'P0001';
  end if;

  select *
    into v_wallet
  from wallet_accounts
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
  from ledger_entries le
  where le.wallet_account_id = v_wallet.id;

  select coalesce(sum(le.amount), 0)
    into v_pending
  from ledger_entries le
  where le.wallet_account_id = v_wallet.id
    and le.type = 'withdrawal_pending'
    and le.status = 'pending';

  v_withdrawable := v_available - v_pending;
  if v_withdrawable < v_dare.stake_amount then
    raise exception 'insufficient_funds' using errcode = 'P0001';
  end if;

  v_ledger_id := gen_random_uuid();
  v_escrow_id := gen_random_uuid();
  v_court_id := gen_random_uuid();

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
    jsonb_build_object('role', 'challenger')
  );

  insert into escrow_holds (
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

  update dares
    set challenger_id = p_challenger_id,
        status = 'ready_check',
        accepted_at = now()
  where id = v_dare.id;

  update dare_constitutions
    set accepted_by_challenger_at = now()
  where id = v_dare.constitution_id;

  insert into court_sessions (
    id,
    dare_id,
    phase
  )
  values (
    v_court_id,
    v_dare.id,
    'ready_check'
  );

  dare_id := v_dare.id;
  court_session_id := v_court_id;
  escrow_hold_id := v_escrow_id;
  ledger_entry_id := v_ledger_id;
  status := 'ready_check';
  stake_amount := v_dare.stake_amount;
  currency := v_dare.currency;
  return next;
end;
$$;

revoke all on function public.create_dare_action(
  uuid, text, text, text, integer, text, integer, text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_dare_action(
  uuid, text, text, text, integer, text, integer, text, text, text, text, text, text
) to service_role;

revoke all on function public.accept_dare_action(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function public.accept_dare_action(uuid, uuid, text)
to service_role;
