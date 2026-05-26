-- ============================================================
-- admin_freeze_withdrawal_approval.sql
-- Admin launch gates: account freeze and manual withdrawal approval.
-- ============================================================

alter table public.withdrawal_requests
  drop constraint if exists withdrawal_requests_status_valid;

alter table public.withdrawal_requests
  add constraint withdrawal_requests_status_valid
  check (status in (
    'pending',
    'approved',
    'processing',
    'completed',
    'failed',
    'reversed',
    'cancelled',
    'rejected'
  ));

create or replace function public.get_pending_withdrawal_balance(
  p_wallet_account_id uuid
)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(le.amount), 0)::integer
  from ledger_entries le
  join withdrawal_requests wr on wr.ledger_entry_id = le.id
  where le.wallet_account_id = p_wallet_account_id
    and le.type = 'withdrawal_pending'
    and le.status = 'pending'
    and wr.status in ('pending', 'approved', 'processing');
$$;

create or replace view public.wallet_summary
with (security_invoker = true) as
select
  wa.id                         as wallet_account_id,
  wa.user_id,
  wa.currency,
  wa.status                     as account_status,
  coalesce(bal.available_balance, 0)  as available_balance,
  coalesce(esc_active.escrowed, 0)    as escrowed_balance,
  coalesce(esc_disputed.held, 0)      as dispute_held_balance,
  coalesce(wd.pending_withdrawal, 0)  as pending_withdrawal_balance
from wallet_accounts wa
left join wallet_balance_projection bal
  on bal.wallet_account_id = wa.id
left join (
  select wallet_account_id, sum(amount) as escrowed
  from escrow_holds
  where status = 'held' and hold_reason = 'dare_active'
  group by wallet_account_id
) esc_active on esc_active.wallet_account_id = wa.id
left join (
  select wallet_account_id, sum(amount) as held
  from escrow_holds
  where status = 'held' and hold_reason = 'dispute_pending'
  group by wallet_account_id
) esc_disputed on esc_disputed.wallet_account_id = wa.id
left join (
  select le.wallet_account_id, sum(le.amount) as pending_withdrawal
  from ledger_entries le
  join withdrawal_requests wr on wr.ledger_entry_id = le.id
  where le.type = 'withdrawal_pending'
    and le.status = 'pending'
    and wr.status in ('pending', 'approved', 'processing')
  group by le.wallet_account_id
) wd on wd.wallet_account_id = wa.id;

drop function if exists public.claim_paystack_withdrawals(integer);

create or replace function public.claim_paystack_withdrawals(
  p_limit integer default 10
)
returns table (
  withdrawal_request_id uuid,
  user_id uuid,
  wallet_account_id uuid,
  amount integer,
  currency text,
  bank_code text,
  account_number text,
  account_name text,
  provider_recipient_code text,
  provider_transfer_reference text,
  retry_count smallint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
begin
  v_limit := least(greatest(coalesce(p_limit, 10), 1), 50);

  return query
  with candidates as (
    select wr.id
    from withdrawal_requests wr
    where wr.status = 'approved'
      and (wr.provider is null or wr.provider = 'paystack')
      and wr.retry_count < 3
    order by wr.requested_at asc, wr.id asc
    limit v_limit
    for update skip locked
  ),
  claimed as (
    update withdrawal_requests wr
      set status = 'processing',
          provider = 'paystack',
          provider_transfer_reference = coalesce(
            wr.provider_transfer_reference,
            'wd_' || replace(wr.id::text, '-', '')
          ),
          retry_count = wr.retry_count + 1,
          failure_reason = null,
          updated_at = now()
    from candidates
    where wr.id = candidates.id
    returning wr.*
  )
  select
    claimed.id,
    claimed.user_id,
    claimed.wallet_account_id,
    claimed.amount,
    claimed.currency,
    claimed.bank_code,
    claimed.account_number,
    claimed.account_name,
    claimed.provider_recipient_code,
    claimed.provider_transfer_reference,
    claimed.retry_count
  from claimed;
end;
$$;

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
  where id = p_admin_user_id;

  if not found or not v_admin.is_admin then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  if p_admin_note is null or length(trim(p_admin_note)) < 5 then
    raise exception 'invalid_admin_note' using errcode = 'P0001';
  end if;

  select * into v_withdrawal
  from withdrawal_requests
  where id = p_withdrawal_request_id
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
        provider_transfer_reference,
        'wd_' || replace(id::text, '-', '')
      ),
      failure_reason = null,
      updated_at = now()
  where id = p_withdrawal_request_id
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

create or replace function public.reject_withdrawal_admin_action(
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
  failure_reason text,
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
  where id = p_admin_user_id;

  if not found or not v_admin.is_admin then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  if p_admin_note is null or length(trim(p_admin_note)) < 5 then
    raise exception 'invalid_admin_note' using errcode = 'P0001';
  end if;

  select * into v_withdrawal
  from withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if not found then
    raise exception 'withdrawal_not_found' using errcode = 'P0001';
  end if;

  if v_withdrawal.status = 'rejected' then
    return query
    select
      v_withdrawal.id,
      v_withdrawal.user_id,
      v_withdrawal.amount,
      v_withdrawal.currency,
      v_withdrawal.status,
      v_withdrawal.failure_reason,
      v_withdrawal.processed_at;
    return;
  end if;

  if v_withdrawal.status not in ('pending', 'approved') then
    raise exception 'invalid_withdrawal_state' using errcode = 'P0001';
  end if;

  update withdrawal_requests
  set status = 'rejected',
      processed_at = now(),
      failure_reason = left(trim(p_admin_note), 500),
      updated_at = now()
  where id = p_withdrawal_request_id
  returning * into v_withdrawal;

  return query
  select
    v_withdrawal.id,
    v_withdrawal.user_id,
    v_withdrawal.amount,
    v_withdrawal.currency,
    v_withdrawal.status,
    v_withdrawal.failure_reason,
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
  where id = p_admin_user_id;

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
  where id = p_target_user_id
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
  where id = p_target_user_id
  returning * into v_target;

  update wallet_accounts
  set status = 'frozen',
      updated_at = now()
  where user_id = p_target_user_id
    and status = 'active';

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

revoke all on function public.approve_withdrawal_admin_action(uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.reject_withdrawal_admin_action(uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.freeze_user_admin_action(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function public.approve_withdrawal_admin_action(uuid, uuid, text)
to service_role;
grant execute on function public.reject_withdrawal_admin_action(uuid, uuid, text)
to service_role;
grant execute on function public.freeze_user_admin_action(uuid, uuid, text)
to service_role;
