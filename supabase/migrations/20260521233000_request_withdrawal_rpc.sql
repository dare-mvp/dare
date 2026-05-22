-- ============================================================
-- request_withdrawal_rpc.sql
-- Atomic withdrawal queue entrypoint for Edge Functions.
-- ============================================================

create or replace function public.request_withdrawal(
  p_user_id uuid,
  p_wallet_account_id uuid,
  p_amount integer,
  p_currency text,
  p_bank_code text,
  p_account_number text,
  p_account_name text,
  p_ledger_idempotency_key text
)
returns table (
  withdrawal_request_id uuid,
  ledger_entry_id uuid,
  status text,
  amount integer,
  currency text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wallet wallet_accounts%rowtype;
  v_existing record;
  v_available integer;
  v_pending integer;
  v_withdrawable integer;
  v_ledger_id uuid;
  v_withdrawal_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select
    wr.id as withdrawal_request_id,
    wr.ledger_entry_id,
    wr.status,
    wr.amount,
    wr.currency
    into v_existing
  from withdrawal_requests wr
  join ledger_entries le on le.id = wr.ledger_entry_id
  where le.idempotency_key = p_ledger_idempotency_key
  limit 1;

  if found then
    withdrawal_request_id := v_existing.withdrawal_request_id;
    ledger_entry_id := v_existing.ledger_entry_id;
    status := v_existing.status;
    amount := v_existing.amount;
    currency := v_existing.currency;
    return next;
    return;
  end if;

  select *
    into v_wallet
  from wallet_accounts
  where wallet_accounts.id = p_wallet_account_id
    and wallet_accounts.user_id = p_user_id
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
  where le.wallet_account_id = p_wallet_account_id;

  select coalesce(sum(le.amount), 0)
    into v_pending
  from ledger_entries le
  where le.wallet_account_id = p_wallet_account_id
    and le.type = 'withdrawal_pending'
    and le.status = 'pending';

  v_withdrawable := v_available - v_pending;

  if v_withdrawable < p_amount then
    raise exception 'insufficient_funds' using errcode = 'P0001';
  end if;

  v_ledger_id := gen_random_uuid();
  v_withdrawal_id := gen_random_uuid();

  insert into ledger_entries (
    id,
    wallet_account_id,
    user_id,
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
    p_wallet_account_id,
    p_user_id,
    'withdrawal_pending',
    'debit',
    p_amount,
    p_currency,
    'pending',
    v_withdrawable,
    v_withdrawable - p_amount,
    p_ledger_idempotency_key,
    jsonb_build_object('source', 'mobile_withdrawal_request')
  );

  insert into withdrawal_requests (
    id,
    user_id,
    wallet_account_id,
    amount,
    currency,
    bank_code,
    account_number,
    account_name,
    status,
    ledger_entry_id
  )
  values (
    v_withdrawal_id,
    p_user_id,
    p_wallet_account_id,
    p_amount,
    p_currency,
    p_bank_code,
    p_account_number,
    p_account_name,
    'pending',
    v_ledger_id
  );

  withdrawal_request_id := v_withdrawal_id;
  ledger_entry_id := v_ledger_id;
  status := 'pending';
  amount := p_amount;
  currency := p_currency;
  return next;
end;
$$;

revoke all on function public.request_withdrawal(
  uuid, uuid, integer, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.request_withdrawal(
  uuid, uuid, integer, text, text, text, text, text
) to service_role;
