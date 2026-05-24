-- ============================================================
-- withdrawal_execution_rpc.sql
-- Atomic claim step for Paystack withdrawal execution workers.
-- ============================================================

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
    where wr.status = 'pending'
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

revoke all on function public.claim_paystack_withdrawals(integer)
from public, anon, authenticated;
grant execute on function public.claim_paystack_withdrawals(integer)
to service_role;
