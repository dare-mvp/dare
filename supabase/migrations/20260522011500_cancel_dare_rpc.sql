-- ============================================================
-- cancel_dare_rpc.sql
-- Cancel open DAREs and refund issuer escrow.
-- ============================================================

create or replace function public.cancel_dare_action(
  p_actor_user_id uuid,
  p_dare_id uuid,
  p_ledger_idempotency_key text
)
returns table (
  dare_id uuid,
  status text,
  escrow_hold_id uuid,
  release_ledger_entry_id uuid,
  refunded_amount integer,
  currency text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor profiles%rowtype;
  v_dare dares%rowtype;
  v_hold escrow_holds%rowtype;
  v_existing record;
  v_available integer;
  v_release_ledger_id uuid;
begin
  select
    d.id as dare_id,
    d.status,
    eh.id as escrow_hold_id,
    le.id as release_ledger_entry_id,
    le.amount as refunded_amount,
    le.currency
    into v_existing
  from ledger_entries le
  join escrow_holds eh on eh.release_ledger_entry_id = le.id
  join dares d on d.id = le.dare_id
  where le.idempotency_key = p_ledger_idempotency_key
  limit 1;

  if found then
    dare_id := v_existing.dare_id;
    status := v_existing.status;
    escrow_hold_id := v_existing.escrow_hold_id;
    release_ledger_entry_id := v_existing.release_ledger_entry_id;
    refunded_amount := v_existing.refunded_amount;
    currency := v_existing.currency;
    return next;
    return;
  end if;

  select *
    into v_actor
  from profiles p
  where p.id = p_actor_user_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  select *
    into v_dare
  from dares d
  where d.id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_actor_user_id <> v_dare.issuer_id and not v_actor.is_admin then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('open', 'targeted_pending') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jury_cases jc
    where jc.dare_id = p_dare_id
      and jc.status not in ('closed', 'voided')
  ) then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  select *
    into v_hold
  from escrow_holds eh
  where eh.dare_id = p_dare_id
    and eh.user_id = v_dare.issuer_id
    and eh.status = 'held'
  for update;

  if not found then
    raise exception 'escrow_not_found' using errcode = 'P0001';
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
  where le.wallet_account_id = v_hold.wallet_account_id;

  v_release_ledger_id := gen_random_uuid();

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
    v_release_ledger_id,
    v_hold.wallet_account_id,
    v_dare.issuer_id,
    p_dare_id,
    'escrow_release',
    'credit',
    v_hold.amount,
    v_hold.currency,
    'posted',
    v_available,
    v_available + v_hold.amount,
    p_ledger_idempotency_key,
    jsonb_build_object('reason', 'dare_cancelled')
  );

  update escrow_holds eh
    set status = 'refunded',
        release_ledger_entry_id = v_release_ledger_id,
        released_at = now()
  where eh.id = v_hold.id
  returning * into v_hold;

  update dares d
    set status = 'cancelled'
  where d.id = p_dare_id
  returning * into v_dare;

  dare_id := v_dare.id;
  status := v_dare.status;
  escrow_hold_id := v_hold.id;
  release_ledger_entry_id := v_release_ledger_id;
  refunded_amount := v_hold.amount;
  currency := v_hold.currency;
  return next;
exception
  when unique_violation then
    raise exception 'cancellation_already_processed' using errcode = 'P0001';
end;
$$;

revoke all on function public.cancel_dare_action(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function public.cancel_dare_action(uuid, uuid, text)
to service_role;
