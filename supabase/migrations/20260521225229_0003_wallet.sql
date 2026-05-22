-- ============================================================
-- 0003_wallet.sql
-- Wallet accounts, payment transactions, and the ledger.
--
-- Applied gaps:
--   GAP-04  ledger_entries.dare_id FK to dares (added after dares table exists)
--           NOTE: FK is added via ALTER in 0004_dares.sql because dares
--           doesn't exist yet at this point. The column is declared bare here.
--   GAP-05  balance_before / balance_after snapshot columns
-- ============================================================

-- ── wallet_accounts ──────────────────────────────────────────
create table wallet_accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete restrict,
  currency    text not null default 'NGN',
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, currency),
  constraint wallet_accounts_status_valid
    check (status in ('active','frozen','closed')),
  constraint wallet_accounts_currency_valid
    check (char_length(currency) = 3)
);

create index wallet_accounts_user_id_idx on wallet_accounts (user_id);

create trigger trg_wallet_accounts_updated_at
  before update on wallet_accounts
  for each row execute function set_updated_at();

-- ── payment_transactions ─────────────────────────────────────
-- External payment provider interactions (Paystack, etc.).
-- Secret keys and HMAC verification live in Edge Functions only.
create table payment_transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles(id) on delete restrict,
  provider              text not null,
  provider_reference    text not null,
  type                  text not null,
  amount                integer not null,
  currency              text not null default 'NGN',
  status                text not null,
  raw_provider_payload  jsonb not null default '{}',
  initialized_at        timestamptz not null default now(),
  verified_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (provider, provider_reference),
  constraint payment_transactions_amount_positive
    check (amount > 0),
  constraint payment_transactions_currency_valid
    check (char_length(currency) = 3),
  constraint payment_transactions_type_valid
    check (type in ('deposit','withdrawal','payout','refund')),
  constraint payment_transactions_status_valid check (status in (
    'initialized','provider_pending','verified_success',
    'verified_failed','expired','reversed','cancelled'
  ))
);

create index payment_transactions_user_id_idx
  on payment_transactions (user_id, created_at desc);
create index payment_transactions_status_idx
  on payment_transactions (status);
create index payment_transactions_provider_reference_idx
  on payment_transactions (provider, provider_reference);

create trigger trg_payment_transactions_updated_at
  before update on payment_transactions
  for each row execute function set_updated_at();

-- ── ledger_entries ───────────────────────────────────────────
-- Append-only financial ledger. Wallet balance is derived from this table.
-- Direct UPDATE or DELETE is forbidden by the immutability trigger.
-- Corrections must be posted as compensating entries.
--
-- dare_id FK is added in 0004_dares.sql once the dares table exists.
-- GAP-05: balance_before / balance_after capture the running balance at
--         write time so forensic audit does not require full ledger replay.
create table ledger_entries (
  id                      uuid primary key default gen_random_uuid(),
  wallet_account_id       uuid not null references wallet_accounts(id) on delete restrict,
  user_id                 uuid not null references profiles(id) on delete restrict,
  dare_id                 uuid,                                   -- FK added in 0004_dares.sql (GAP-04)
  payment_transaction_id  uuid references payment_transactions(id) on delete restrict,
  type                    text not null,
  direction               text not null,
  amount                  integer not null,
  currency                text not null default 'NGN',
  status                  text not null default 'posted',
  balance_before          integer,                               -- GAP-05: running balance snapshot
  balance_after           integer,                               -- GAP-05
  idempotency_key         text unique,
  metadata                jsonb not null default '{}',
  created_at              timestamptz not null default now(),

  constraint ledger_entries_amount_positive
    check (amount > 0),
  constraint ledger_entries_currency_valid
    check (char_length(currency) = 3),
  constraint ledger_entries_direction_valid
    check (direction in ('credit','debit')),
  constraint ledger_entries_status_valid
    check (status in ('posted','pending','failed','reversed','voided')),
  constraint ledger_entries_type_valid check (type in (
    'deposit_confirmed',
    'escrow_hold',
    'escrow_release',
    'payout',
    'platform_fee',
    'withdrawal_pending',
    'withdrawal_completed',
    'reversal',
    'adjustment',
    'bonus_credit',
    'juror_reward'
  ))
);

create index ledger_entries_wallet_created_idx
  on ledger_entries (wallet_account_id, created_at desc);
create index ledger_entries_user_created_idx
  on ledger_entries (user_id, created_at desc);
create index ledger_entries_dare_id_idx
  on ledger_entries (dare_id) where dare_id is not null;
create index ledger_entries_payment_transaction_id_idx
  on ledger_entries (payment_transaction_id) where payment_transaction_id is not null;
create index ledger_entries_type_idx
  on ledger_entries (type);
create index ledger_entries_status_idx
  on ledger_entries (status);

-- Immutability: block UPDATE and DELETE for all callers.
-- Service role uses compensating entries for corrections.
create trigger trg_ledger_immutability
  before update or delete on ledger_entries
  for each row execute function ledger_immutability_guard();
