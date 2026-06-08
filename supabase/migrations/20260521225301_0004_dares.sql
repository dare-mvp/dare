-- ============================================================
-- 0004_dares.sql
-- Core DARE tables: dares, constitutions, escrow holds,
-- dare-level spectator votes.
--
-- Applied gaps:
--   GAP-04  Add dare_id FK to ledger_entries now that dares exists
--   GAP-14  dares.constitution_id back-reference (circular ref handled
--           by nullable initial column + deferred FK add)
--   GAP-19  escrow_holds.hold_reason distinguishes active vs frozen holds
--   GAP-01  dare_votes table for witnessed-resolution vote audit trail
-- ============================================================

-- ── dares ────────────────────────────────────────────────────
-- constitution_id is initially omitted to avoid circular dependency.
-- It is added via ALTER after dare_constitutions is created below.
create table dares (
  id                  uuid primary key default gen_random_uuid(),
  issuer_id           uuid not null references profiles(id) on delete restrict,
  challenger_id       uuid references profiles(id) on delete restrict,
  title               text not null,
  description         text,
  category            text not null,
  resolution_type     text not null,
  status              text not null,
  stake_amount        integer not null,
  currency            text not null default 'NGN',
  platform_fee        integer not null default 0,
  winner_payout       integer not null default 0,
  duration_seconds    integer not null,
  winner_id           uuid references profiles(id) on delete restrict,
  dispute_deadline_at timestamptz,
  created_at          timestamptz not null default now(),
  accepted_at         timestamptz,
  started_at          timestamptz,
  completed_at        timestamptz,
  settled_at          timestamptz,
  expires_at          timestamptz,
  updated_at          timestamptz not null default now(),

  constraint dares_title_len
    check (char_length(title) between 5 and 140),
  constraint dares_category_valid
    check (category in ('knowledge','physical','verbal','sports','creative','other')),
  constraint dares_resolution_type_valid
    check (resolution_type in ('answer_key','witnessed','evidence')),
  constraint dares_status_valid check (status in (
    'draft','open','targeted_pending','accepted',
    'ready_check','active','awaiting_result','completed',
    'dispute_pending','jury_open','jury_closed','settled',
    'cancelled','expired','forfeited','voided','declined'
  )),
  constraint dares_stake_positive
    check (stake_amount > 0),
  constraint dares_fee_nonnegative
    check (platform_fee >= 0 and winner_payout >= 0),
  constraint dares_duration_range
    check (duration_seconds between 30 and 3600),
  constraint dares_currency_valid
    check (char_length(currency) = 3),
  constraint dares_no_self_challenge
    check (challenger_id is null or challenger_id <> issuer_id),
  constraint dares_winner_valid
    check (winner_id is null or winner_id = issuer_id or winner_id = challenger_id)
);

create index dares_status_created_idx    on dares (status, created_at desc);
create index dares_category_status_idx   on dares (category, status, created_at desc);
create index dares_issuer_created_idx    on dares (issuer_id, created_at desc);
create index dares_challenger_created_idx on dares (challenger_id, created_at desc);
create index dares_winner_id_idx         on dares (winner_id) where winner_id is not null;
create index dares_open_feed_idx         on dares (created_at desc)
  where status in ('open','active','completed','settled');
create index dares_dispute_deadline_idx  on dares (dispute_deadline_at)
  where status = 'completed' and dispute_deadline_at is not null;

create trigger trg_dares_updated_at
  before update on dares
  for each row execute function set_updated_at();

-- ── dare_constitutions ───────────────────────────────────────
-- Immutable challenge rules. Amendments create a new version row.
create table dare_constitutions (
  id                        uuid primary key default gen_random_uuid(),
  dare_id                   uuid not null references dares(id) on delete cascade,
  version                   integer not null default 1,
  test                      text not null,
  rules                     text not null,
  proof_method              text,
  edge_cases                text,
  accepted_by_issuer_at     timestamptz,
  accepted_by_challenger_at timestamptz,
  created_at                timestamptz not null default now(),

  unique (dare_id, version),
  constraint dare_constitutions_version_positive check (version > 0),
  constraint dare_constitutions_test_len  check (char_length(test) between 5 and 1000),
  constraint dare_constitutions_rules_len check (char_length(rules) between 3 and 3000)
);

create index dare_constitutions_dare_id_idx on dare_constitutions (dare_id);

-- ── GAP-14: dares.constitution_id back-reference ─────────────
-- Added now that dare_constitutions exists.
-- Nullable initially; set by create_dare RPC after constitution insert.
alter table dares
  add column constitution_id uuid references dare_constitutions(id) on delete restrict;

-- ── GAP-04: ledger_entries.dare_id FK ────────────────────────
-- dares now exists; bind the previously bare dare_id column.
alter table ledger_entries
  add constraint ledger_entries_dare_id_fk
  foreign key (dare_id) references dares(id) on delete restrict;

-- ── escrow_holds ─────────────────────────────────────────────
-- Per-user escrow record for a DARE.
-- GAP-19: hold_reason distinguishes active-dare holds from
--         dispute-frozen or admin-frozen holds for wallet display.
create table escrow_holds (
  id                    uuid primary key default gen_random_uuid(),
  dare_id               uuid not null references dares(id) on delete restrict,
  user_id               uuid not null references profiles(id) on delete restrict,
  wallet_account_id     uuid not null references wallet_accounts(id) on delete restrict,
  amount                integer not null,
  currency              text not null default 'NGN',
  status                text not null default 'held',
  hold_reason           text not null default 'dare_active',           -- GAP-19
  held_ledger_entry_id    uuid references ledger_entries(id) on delete restrict,
  release_ledger_entry_id uuid references ledger_entries(id) on delete restrict,
  held_at               timestamptz not null default now(),
  released_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (dare_id, user_id),
  constraint escrow_holds_amount_positive
    check (amount > 0),
  constraint escrow_holds_currency_valid
    check (char_length(currency) = 3),
  constraint escrow_holds_status_valid
    check (status in ('held','released','refunded','forfeited','voided')),
  constraint escrow_holds_hold_reason_valid
    check (hold_reason in ('dare_active','dispute_pending','risk_hold','admin_hold'))
);

create index escrow_holds_dare_id_idx     on escrow_holds (dare_id);
create index escrow_holds_user_status_idx on escrow_holds (user_id, status);
create index escrow_holds_wallet_status_idx on escrow_holds (wallet_account_id, status);

create trigger trg_escrow_holds_updated_at
  before update on escrow_holds
  for each row execute function set_updated_at();

-- ── dare_votes (GAP-01) ──────────────────────────────────────
-- Spectator vote records for witnessed-resolution DAREs.
-- Prevents double-voting and provides an auditable tally.
-- Denormalized counters live on court_sessions (see 0005_court_and_quiz.sql).
create table dare_votes (
  id          uuid primary key default gen_random_uuid(),
  dare_id     uuid not null references dares(id) on delete cascade,
  voter_id    uuid not null references profiles(id) on delete restrict,
  vote        text not null,
  created_at  timestamptz not null default now(),

  unique (dare_id, voter_id),
  constraint dare_votes_vote_valid check (vote in ('A','B'))
);

create index dare_votes_dare_idx  on dare_votes (dare_id);
create index dare_votes_voter_idx on dare_votes (voter_id);
