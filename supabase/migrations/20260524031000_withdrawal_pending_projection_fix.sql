-- ============================================================
-- withdrawal_pending_projection_fix.sql
-- Pending withdrawal holds count only while the withdrawal request
-- is still pending or processing.
-- ============================================================

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
    and wr.status in ('pending', 'processing');
$$;

revoke all on function public.get_pending_withdrawal_balance(uuid)
from public, anon, authenticated;
grant execute on function public.get_pending_withdrawal_balance(uuid)
to service_role, postgres;

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
    and wr.status in ('pending', 'processing')
  group by le.wallet_account_id
) wd on wd.wallet_account_id = wa.id;

do $$
declare
  v_signature regprocedure;
  v_sql text;
begin
  foreach v_signature in array array[
    'public.request_withdrawal(uuid, uuid, integer, text, text, text, text, text)'::regprocedure,
    'public.create_dare_action(uuid, text, text, text, integer, text, integer, text, text, text, text, text, text)'::regprocedure,
    'public.accept_dare_action(uuid, uuid, text)'::regprocedure
  ]
  loop
    select pg_get_functiondef(v_signature) into v_sql;

    v_sql := replace(
      v_sql,
      'select coalesce(sum(le.amount), 0)
    into v_pending
  from ledger_entries le
  where le.wallet_account_id = v_wallet.id
    and le.type = ''withdrawal_pending''
    and le.status = ''pending'';',
      'select public.get_pending_withdrawal_balance(v_wallet.id)
    into v_pending;'
    );

    v_sql := replace(
      v_sql,
      'select coalesce(sum(le.amount), 0)
    into v_pending
  from ledger_entries le
  where le.wallet_account_id = p_wallet_account_id
    and le.type = ''withdrawal_pending''
    and le.status = ''pending'';',
      'select public.get_pending_withdrawal_balance(p_wallet_account_id)
    into v_pending;'
    );

    execute v_sql;
  end loop;
end;
$$;
