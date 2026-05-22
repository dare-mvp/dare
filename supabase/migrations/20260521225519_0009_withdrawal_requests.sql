-- ============================================================
-- 0009_withdrawal_requests.sql
-- Withdrawal request lifecycle table.
--
-- Applied gaps:
--   GAP-03  withdrawal_requests — queue-based withdrawal workflow
--           with bank details, processing batch, and failure tracking
-- ============================================================

-- ── withdrawal_requests (GAP-03) ─────────────────────────────
-- Represents the lifecycle of a user's withdrawal request.
-- The ledger tracks the financial events (withdrawal_pending,
-- withdrawal_completed) but this table owns the operational state:
-- bank details, provider transfer reference, retry count, and
-- failure reason. Ops or the automated payout provider processes rows
-- in 'pending' status.
create table withdrawal_requests (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references profiles(id) on delete restrict,
  wallet_account_id         uuid not null references wallet_accounts(id) on delete restrict,
  amount                    integer not null,
  currency                  text not null default 'NGN',
  -- Bank transfer destination
  bank_code                 text not null,
  account_number            text not null,
  account_name              text not null,
  -- Provider details (Paystack transfer recipient / transfer)
  provider                  text,
  provider_recipient_code   text,
  provider_transfer_reference text,
  status                    text not null default 'pending',
  failure_reason            text,
  retry_count               smallint not null default 0,
  -- Link to the ledger entry that debited the available balance
  ledger_entry_id           uuid references ledger_entries(id) on delete restrict,
  requested_at              timestamptz not null default now(),
  processed_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint withdrawal_requests_amount_positive
    check (amount > 0),
  constraint withdrawal_requests_currency_valid
    check (char_length(currency) = 3),
  constraint withdrawal_requests_status_valid
    check (status in ('pending','processing','completed','failed','reversed','cancelled')),
  constraint withdrawal_requests_retry_count_valid
    check (retry_count >= 0)
);

-- Active withdrawal lookup (ops dashboard, cron reconciliation)
create index withdrawal_requests_user_status_idx
  on withdrawal_requests (user_id, status);
create index withdrawal_requests_status_requested_idx
  on withdrawal_requests (status, requested_at)
  where status in ('pending','processing');

create trigger trg_withdrawal_requests_updated_at
  before update on withdrawal_requests
  for each row execute function set_updated_at();
