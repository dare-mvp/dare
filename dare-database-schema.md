# DARE Database Schema Specification

## Purpose

This document defines the first production database schema direction for DARE. It is intended to drive Postgres/Supabase migrations, RLS policies, server functions, seed data, and database tests.

The schema is designed for the MVP described in `docs/05-mvp-scope.md`: Algorithmic DAREs, wallet ledger, escrow, Court ready-up, quiz scoring, settlement, notifications, dispute foundation, admin review, and risk/audit logging.

Current implementation status: the initial Supabase migration set now exists under `supabase/migrations/`. Local migration filenames now match the remote Supabase migration history for project `dhzcoywgiyrbsiiwlstw`, including the post-deployment RLS/index performance cleanup; this document remains the product and architecture reference for why those tables, policies, and read models exist.

## Design Principles

1. The client is untrusted.
2. Sensitive writes go through server functions or API endpoints.
3. Wallet balance is a projection from immutable ledger entries.
4. DARE lifecycle is enforced by explicit states and guarded transitions.
5. Payment provider events are idempotent by provider reference.
6. Evidence, jury, and admin data are private by default.
7. RLS protects read access; service-role functions perform sensitive writes.
8. Every financial, settlement, and admin action is auditable.

## Naming Conventions

- Table names: plural snake_case.
- Primary keys: `id uuid primary key default gen_random_uuid()`.
- Auth references: `profiles.id` references `auth.users(id)`.
- Money fields: integer minor units. For NGN, use kobo.
- Currency fields: ISO 4217 string, default `NGN`.
- Status fields: text with check constraints in early migrations; Postgres enums may be introduced later if stable.
- Timestamps: `timestamptz`.
- JSON data: `jsonb`.

## Required Extensions

```sql
create extension if not exists pgcrypto;
create extension if not exists citext;
```

Optional later:

```sql
create extension if not exists pg_trgm;
```

Use `pg_trgm` only if fuzzy username/search becomes necessary.

## Status Values

### Account Status

```text
active
limited
frozen
banned
closed
```

### Risk Status

```text
normal
watch
review
hold
blocked
```

### KYC Tier

```text
kyc0
kyc1
kyc2
kyc3
```

### DARE Status

```text
draft
open
targeted_pending
accepted
ready_check
active
awaiting_result
completed
dispute_pending
jury_open
jury_closed
settled
cancelled
expired
forfeited
voided
declined
```

### Resolution Type

```text
algorithmic
witnessed
evidenced
honour
```

### Court Phase

```text
waiting
ready_check
countdown
active
awaiting_result
completed
disputed
forfeited
cancelled
```

### Ledger Entry Type

```text
deposit_confirmed
escrow_hold
escrow_release
payout
platform_fee
withdrawal_pending
withdrawal_completed
reversal
adjustment
bonus_credit
juror_reward
```

### Ledger Direction

```text
credit
debit
```

### Ledger Status

```text
posted
pending
failed
reversed
voided
```

### Payment Transaction Status

```text
initialized
provider_pending
verified_success
verified_failed
expired
reversed
cancelled
```

### Escrow Status

```text
held
released
refunded
forfeited
voided
```

### Jury Case Status

```text
filed
accepted_for_review
jury_assignment
jury_voting
verdict_reached
settlement_pending
closed
escalated
voided
```

### Jury Assignment Status

```text
assigned
claimed
completed
expired
declined
cancelled
```

### Jury Vote

```text
A
B
void
escalate
```

## Core Tables

### profiles

App-level user profile. `auth.users` remains the authentication source of truth.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  display_name text,
  avatar_url text,
  avatar_emoji text,
  country text,
  city text,
  trust_score integer not null default 0,
  tier text not null default 'newcomer',
  wins integer not null default 0,
  losses integer not null default 0,
  disputes integer not null default 0,
  completed_dares integer not null default 0,
  jury_opt_in boolean not null default false,
  jury_categories text[] not null default '{}',
  kyc_tier text not null default 'kyc0',
  account_status text not null default 'active',
  risk_status text not null default 'normal',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_len check (char_length(username::text) between 3 and 30),
  constraint profiles_username_format check (username::text ~ '^[a-zA-Z0-9_]+$'),
  constraint profiles_trust_score_range check (trust_score between 0 and 1000),
  constraint profiles_counts_nonnegative check (
    wins >= 0 and losses >= 0 and disputes >= 0 and completed_dares >= 0
  ),
  constraint profiles_kyc_tier_valid check (kyc_tier in ('kyc0','kyc1','kyc2','kyc3')),
  constraint profiles_account_status_valid check (account_status in ('active','limited','frozen','banned','closed')),
  constraint profiles_risk_status_valid check (risk_status in ('normal','watch','review','hold','blocked'))
);
```

Indexes:

```sql
create index profiles_trust_score_idx on profiles (trust_score desc);
create index profiles_account_status_idx on profiles (account_status);
create index profiles_risk_status_idx on profiles (risk_status);
create index profiles_jury_opt_in_idx on profiles (jury_opt_in) where jury_opt_in = true;
```

RLS intent:

- Users can read public-safe profile fields through safe views/read models.
- Users can read their own full profile.
- Users can update their own non-sensitive profile fields only through API or restricted column grants.
- Users cannot update `trust_score`, `tier`, counters, KYC, account status, risk status, or `is_admin`.
- Admin/service role can read and manage operational fields.

### wallet_accounts

Internal wallet account per user and currency.

```sql
create table wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete restrict,
  currency text not null default 'NGN',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, currency),
  constraint wallet_accounts_status_valid check (status in ('active','frozen','closed')),
  constraint wallet_accounts_currency_valid check (char_length(currency) = 3)
);
```

Indexes:

```sql
create index wallet_accounts_user_id_idx on wallet_accounts (user_id);
```

RLS intent:

- Users can read their own wallet account.
- Users cannot insert/update wallet accounts directly.
- Service role creates wallet accounts after profile creation.

### payment_transactions

External payment provider interactions.

```sql
create table payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete restrict,
  provider text not null,
  provider_reference text not null,
  type text not null,
  amount integer not null,
  currency text not null default 'NGN',
  status text not null,
  raw_provider_payload jsonb not null default '{}',
  initialized_at timestamptz not null default now(),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference),
  constraint payment_transactions_amount_positive check (amount > 0),
  constraint payment_transactions_currency_valid check (char_length(currency) = 3),
  constraint payment_transactions_type_valid check (type in ('deposit','withdrawal','payout','refund')),
  constraint payment_transactions_status_valid check (
    status in ('initialized','provider_pending','verified_success','verified_failed','expired','reversed','cancelled')
  )
);
```

Indexes:

```sql
create index payment_transactions_user_id_idx on payment_transactions (user_id, created_at desc);
create index payment_transactions_status_idx on payment_transactions (status);
create index payment_transactions_provider_reference_idx on payment_transactions (provider, provider_reference);
```

RLS intent:

- Users can read their own payment transaction summaries.
- Raw provider payload may need a private admin/service-only view if it contains sensitive data.
- Users cannot insert/update/delete payment transactions directly.

### ledger_entries

Append-only financial ledger. This is the source for wallet projections.

```sql
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references wallet_accounts(id) on delete restrict,
  user_id uuid not null references profiles(id) on delete restrict,
  dare_id uuid,
  payment_transaction_id uuid references payment_transactions(id) on delete restrict,
  type text not null,
  direction text not null,
  amount integer not null,
  currency text not null default 'NGN',
  status text not null default 'posted',
  idempotency_key text unique,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint ledger_entries_amount_positive check (amount > 0),
  constraint ledger_entries_currency_valid check (char_length(currency) = 3),
  constraint ledger_entries_direction_valid check (direction in ('credit','debit')),
  constraint ledger_entries_status_valid check (status in ('posted','pending','failed','reversed','voided')),
  constraint ledger_entries_type_valid check (
    type in (
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
    )
  )
);
```

Indexes:

```sql
create index ledger_entries_wallet_created_idx on ledger_entries (wallet_account_id, created_at desc);
create index ledger_entries_user_created_idx on ledger_entries (user_id, created_at desc);
create index ledger_entries_dare_id_idx on ledger_entries (dare_id) where dare_id is not null;
create index ledger_entries_payment_transaction_id_idx on ledger_entries (payment_transaction_id) where payment_transaction_id is not null;
create index ledger_entries_type_idx on ledger_entries (type);
create index ledger_entries_status_idx on ledger_entries (status);
```

RLS intent:

- Users can read their own ledger entries.
- Users cannot insert/update/delete ledger entries.
- Service role writes ledger entries.
- Admin can inspect ledger entries.

Immutability:

- Add a trigger to block update/delete for non-service roles.
- Prefer no updates at all for posted rows; corrections should be compensating entries.

### wallet_balance_projection

View for available balance. Exact projection rules may evolve, but the first version should distinguish posted credits and debits.

```sql
create view wallet_balance_projection as
select
  wallet_account_id,
  user_id,
  currency,
  coalesce(sum(case when direction = 'credit' and status = 'posted' then amount else 0 end), 0) -
  coalesce(sum(case when direction = 'debit' and status = 'posted' then amount else 0 end), 0) as available_balance
from ledger_entries
group by wallet_account_id, user_id, currency;
```

Note:

- Escrow visibility should use `escrow_holds`, not only ledger projection.
- Held and pending balances may need separate views.

### dares

Central challenge entity.

```sql
create table dares (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references profiles(id) on delete restrict,
  challenger_id uuid references profiles(id) on delete restrict,
  title text not null,
  description text,
  category text not null,
  resolution_type text not null,
  status text not null,
  stake_amount integer not null,
  currency text not null default 'NGN',
  platform_fee integer not null default 0,
  winner_payout integer not null default 0,
  duration_seconds integer not null,
  winner_id uuid references profiles(id) on delete restrict,
  dispute_deadline_at timestamptz,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  settled_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint dares_title_len check (char_length(title) between 5 and 140),
  constraint dares_category_valid check (category in ('knowledge','physical','verbal','sports','creative','other')),
  constraint dares_resolution_type_valid check (resolution_type in ('algorithmic','witnessed','evidenced','honour')),
  constraint dares_status_valid check (
    status in (
      'draft',
      'open',
      'targeted_pending',
      'accepted',
      'ready_check',
      'active',
      'awaiting_result',
      'completed',
      'dispute_pending',
      'jury_open',
      'jury_closed',
      'settled',
      'cancelled',
      'expired',
      'forfeited',
      'voided',
      'declined'
    )
  ),
  constraint dares_stake_positive check (stake_amount > 0),
  constraint dares_fee_nonnegative check (platform_fee >= 0 and winner_payout >= 0),
  constraint dares_duration_range check (duration_seconds between 30 and 3600),
  constraint dares_currency_valid check (char_length(currency) = 3),
  constraint dares_no_self_challenge check (challenger_id is null or challenger_id <> issuer_id),
  constraint dares_winner_valid check (
    winner_id is null or winner_id = issuer_id or winner_id = challenger_id
  )
);
```

Indexes:

```sql
create index dares_status_created_idx on dares (status, created_at desc);
create index dares_category_status_idx on dares (category, status, created_at desc);
create index dares_issuer_created_idx on dares (issuer_id, created_at desc);
create index dares_challenger_created_idx on dares (challenger_id, created_at desc);
create index dares_winner_id_idx on dares (winner_id) where winner_id is not null;
create index dares_open_feed_idx on dares (created_at desc) where status in ('open','active','completed','settled');
```

RLS intent:

- Users can read open/active/completed public DARE summaries.
- Participants can read full DARE details.
- Targeted pending DAREs visible only to issuer, target challenger, and admins.
- Users cannot directly update DARE state.
- Service functions perform create/accept/ready/complete/settle transitions.

### dare_constitutions

Immutable challenge rules.

```sql
create table dare_constitutions (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id) on delete cascade,
  version integer not null default 1,
  test text not null,
  rules text not null,
  proof_method text,
  edge_cases text,
  accepted_by_issuer_at timestamptz,
  accepted_by_challenger_at timestamptz,
  created_at timestamptz not null default now(),
  unique (dare_id, version),
  constraint dare_constitutions_version_positive check (version > 0),
  constraint dare_constitutions_test_len check (char_length(test) between 5 and 1000),
  constraint dare_constitutions_rules_len check (char_length(rules) between 3 and 3000)
);
```

Indexes:

```sql
create index dare_constitutions_dare_id_idx on dare_constitutions (dare_id);
```

RLS intent:

- Same visibility as parent DARE.
- No direct client updates after creation.
- Amendments create a new version.

### escrow_holds

Per-user escrow records for a DARE.

```sql
create table escrow_holds (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id) on delete restrict,
  user_id uuid not null references profiles(id) on delete restrict,
  wallet_account_id uuid not null references wallet_accounts(id) on delete restrict,
  amount integer not null,
  currency text not null default 'NGN',
  status text not null default 'held',
  held_ledger_entry_id uuid references ledger_entries(id) on delete restrict,
  release_ledger_entry_id uuid references ledger_entries(id) on delete restrict,
  held_at timestamptz not null default now(),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dare_id, user_id),
  constraint escrow_holds_amount_positive check (amount > 0),
  constraint escrow_holds_currency_valid check (char_length(currency) = 3),
  constraint escrow_holds_status_valid check (status in ('held','released','refunded','forfeited','voided'))
);
```

Indexes:

```sql
create index escrow_holds_dare_id_idx on escrow_holds (dare_id);
create index escrow_holds_user_status_idx on escrow_holds (user_id, status);
create index escrow_holds_wallet_status_idx on escrow_holds (wallet_account_id, status);
```

RLS intent:

- Users can read their own escrow holds.
- Participants can see DARE-level escrow summary.
- Users cannot insert/update/delete escrow holds.
- Service role manages escrow.

### court_sessions

Runtime Court state.

```sql
create table court_sessions (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null unique references dares(id) on delete cascade,
  phase text not null default 'waiting',
  player_a_ready boolean not null default false,
  player_b_ready boolean not null default false,
  server_start_time timestamptz,
  server_end_time timestamptz,
  player_a_heartbeat_at timestamptz,
  player_b_heartbeat_at timestamptz,
  reconnect_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint court_sessions_phase_valid check (
    phase in ('waiting','ready_check','countdown','active','awaiting_result','completed','disputed','forfeited','cancelled')
  )
);
```

Indexes:

```sql
create index court_sessions_phase_idx on court_sessions (phase);
create index court_sessions_dare_id_idx on court_sessions (dare_id);
```

RLS intent:

- Participants can read their Court session.
- Spectators may read limited active Court state through a view.
- Users cannot directly update phase/readiness/heartbeats except via server functions.

### quiz_questions

Controlled question bank for Algorithmic DARE MVP.

```sql
create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  prompt text not null,
  options jsonb not null,
  correct_option integer not null,
  difficulty text not null default 'normal',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_questions_category_valid check (category in ('knowledge','sports','verbal','creative','other')),
  constraint quiz_questions_prompt_len check (char_length(prompt) between 5 and 500),
  constraint quiz_questions_correct_option_range check (correct_option between 0 and 5),
  constraint quiz_questions_difficulty_valid check (difficulty in ('easy','normal','hard'))
);
```

Indexes:

```sql
create index quiz_questions_active_category_idx on quiz_questions (category, difficulty) where active = true;
```

RLS intent:

- Public read of active question prompt/options may be allowed only through server-selected match question API.
- Do not expose `correct_option` to clients through direct table reads.
- Prefer no direct client read; serve quiz payloads through API/RPC.

### dare_quiz_answers

Answer records.

```sql
create table dare_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete restrict,
  question_id uuid not null references quiz_questions(id) on delete restrict,
  selected_option integer not null,
  correct boolean not null,
  response_ms integer,
  created_at timestamptz not null default now(),
  unique (dare_id, user_id, question_id),
  constraint dare_quiz_answers_selected_option_range check (selected_option between 0 and 5),
  constraint dare_quiz_answers_response_ms_valid check (response_ms is null or response_ms >= 0)
);
```

Indexes:

```sql
create index dare_quiz_answers_dare_user_idx on dare_quiz_answers (dare_id, user_id);
create index dare_quiz_answers_question_idx on dare_quiz_answers (question_id);
```

RLS intent:

- Participants can read their own answer records.
- Admin/service role can read all.
- Clients cannot insert answers directly; answers go through server scoring function.

### court_chat_messages

Realtime and persisted chat.

```sql
create table court_chat_messages (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  username_snapshot text,
  message text not null,
  moderation_status text not null default 'visible',
  created_at timestamptz not null default now(),
  constraint court_chat_messages_message_len check (char_length(message) between 1 and 500),
  constraint court_chat_messages_moderation_status_valid check (
    moderation_status in ('visible','hidden','flagged','deleted')
  )
);
```

Indexes:

```sql
create index court_chat_messages_dare_created_idx on court_chat_messages (dare_id, created_at desc);
create index court_chat_messages_user_created_idx on court_chat_messages (user_id, created_at desc);
```

RLS intent:

- Participants and spectators can read visible messages for public/active DAREs.
- Authenticated users can send messages through rate-limited API/RPC.
- Users cannot edit/delete messages directly.

### notifications

User inbox.

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  action jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_title_len check (char_length(title) between 1 and 160),
  constraint notifications_body_len check (char_length(body) between 1 and 1000)
);
```

Indexes:

```sql
create index notifications_user_created_idx on notifications (user_id, created_at desc);
create index notifications_user_unread_idx on notifications (user_id, is_read) where is_read = false;
```

RLS intent:

- Users can read and mark their own notifications read.
- Users cannot create arbitrary notifications.

## Dispute, Jury, Evidence, And Admin Tables

### evidence_objects

Evidence is post-MVP for primary DARE type, but disputes and future evidence DAREs need a schema.

```sql
create table evidence_objects (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete restrict,
  storage_bucket text not null,
  storage_path text not null,
  content_hash text,
  media_type text not null,
  byte_size bigint,
  capture_started_at timestamptz,
  capture_ended_at timestamptz,
  uploaded_at timestamptz,
  status text not null default 'uploaded',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  constraint evidence_objects_status_valid check (status in ('pending','uploaded','processing','accepted','rejected','deleted')),
  constraint evidence_objects_byte_size_valid check (byte_size is null or byte_size >= 0)
);
```

Indexes:

```sql
create index evidence_objects_dare_id_idx on evidence_objects (dare_id);
create index evidence_objects_user_id_idx on evidence_objects (user_id);
create index evidence_objects_status_idx on evidence_objects (status);
```

RLS intent:

- Participants can read metadata for their own DARE.
- Jurors can read assigned evidence packet metadata.
- Signed media access is generated by service role only.

### jury_cases

```sql
create table jury_cases (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id) on delete restrict,
  opened_by_user_id uuid not null references profiles(id) on delete restrict,
  status text not null default 'filed',
  reason text not null,
  votes_needed integer not null default 3,
  verdict text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  escalated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jury_cases_reason_len check (char_length(reason) between 10 and 3000),
  constraint jury_cases_votes_needed_valid check (votes_needed in (3,5,7)),
  constraint jury_cases_status_valid check (
    status in (
      'filed',
      'accepted_for_review',
      'jury_assignment',
      'jury_voting',
      'verdict_reached',
      'settlement_pending',
      'closed',
      'escalated',
      'voided'
    )
  ),
  constraint jury_cases_verdict_valid check (verdict is null or verdict in ('A','B','void','escalate','uphold','overturn'))
);
```

Indexes:

```sql
create index jury_cases_dare_id_idx on jury_cases (dare_id);
create index jury_cases_status_opened_idx on jury_cases (status, opened_at desc);
create index jury_cases_opened_by_user_idx on jury_cases (opened_by_user_id, opened_at desc);
```

RLS intent:

- Participants can read status and final verdict for their case.
- Assigned jurors can read case packet.
- Admins can read all.
- Case creation goes through API/RPC.

### jury_assignments

```sql
create table jury_assignments (
  id uuid primary key default gen_random_uuid(),
  jury_case_id uuid not null references jury_cases(id) on delete cascade,
  juror_id uuid not null references profiles(id) on delete restrict,
  status text not null default 'assigned',
  blind_side_mapping jsonb not null default '{}',
  assigned_at timestamptz not null default now(),
  claimed_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jury_case_id, juror_id),
  constraint jury_assignments_status_valid check (status in ('assigned','claimed','completed','expired','declined','cancelled'))
);
```

Indexes:

```sql
create index jury_assignments_juror_status_idx on jury_assignments (juror_id, status);
create index jury_assignments_case_status_idx on jury_assignments (jury_case_id, status);
create index jury_assignments_due_idx on jury_assignments (due_at) where status in ('assigned','claimed');
```

RLS intent:

- Jurors can read their own assignments.
- Participants cannot read juror identities before verdict unless policy allows it.
- Admins can read all.

### jury_votes

```sql
create table jury_votes (
  id uuid primary key default gen_random_uuid(),
  jury_case_id uuid not null references jury_cases(id) on delete cascade,
  juror_id uuid not null references profiles(id) on delete restrict,
  vote text not null,
  rationale text not null,
  created_at timestamptz not null default now(),
  unique (jury_case_id, juror_id),
  constraint jury_votes_vote_valid check (vote in ('A','B','void','escalate')),
  constraint jury_votes_rationale_len check (char_length(rationale) between 20 and 3000)
);
```

Indexes:

```sql
create index jury_votes_case_idx on jury_votes (jury_case_id);
create index jury_votes_juror_idx on jury_votes (juror_id, created_at desc);
```

RLS intent:

- Jurors can create vote only through API/RPC.
- Jurors can read their own submitted vote.
- Participants can see verdict summary after case closes, not live vote tally.
- Admins can read all.

### audit_logs

```sql
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references profiles(id) on delete set null,
  actor_type text not null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint audit_logs_actor_type_valid check (actor_type in ('user','admin','system','provider')),
  constraint audit_logs_action_len check (char_length(action) between 3 and 120),
  constraint audit_logs_target_type_len check (char_length(target_type) between 3 and 120)
);
```

Indexes:

```sql
create index audit_logs_actor_created_idx on audit_logs (actor_user_id, created_at desc);
create index audit_logs_target_idx on audit_logs (target_type, target_id, created_at desc);
create index audit_logs_action_created_idx on audit_logs (action, created_at desc);
```

RLS intent:

- Users generally cannot read audit logs.
- Admins can read audit logs.
- Service role writes audit logs.

### risk_events

```sql
create table risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  dare_id uuid references dares(id) on delete set null,
  type text not null,
  severity text not null,
  status text not null default 'open',
  evidence jsonb not null default '{}',
  reviewed_by_user_id uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint risk_events_severity_valid check (severity in ('low','medium','high','critical')),
  constraint risk_events_status_valid check (status in ('open','reviewing','resolved','dismissed','escalated'))
);
```

Indexes:

```sql
create index risk_events_user_status_idx on risk_events (user_id, status);
create index risk_events_dare_status_idx on risk_events (dare_id, status);
create index risk_events_severity_created_idx on risk_events (severity, created_at desc);
```

RLS intent:

- Users cannot read risk events by default.
- Admins can read and update review state.
- Service role creates risk events.

## Views

### public_dare_feed

Purpose: safe feed read model.

Fields:

- dare id
- title
- category
- resolution type
- status
- stake amount
- currency
- created_at
- expires_at
- issuer username
- issuer trust score
- challenger username if public

Do not expose:

- internal risk data
- full constitution for private targeted DAREs
- participant private data

### wallet_summary

Purpose: user wallet dashboard.

Fields:

- wallet account id
- available balance
- escrowed balance
- pending withdrawal amount
- held amount
- currency

Implementation note:

- Build from `ledger_entries`, `escrow_holds`, and withdrawal/payment status.
- Keep as a view first; materialize later only if needed.

### active_court_public_state

Purpose: spectator-safe Court state.

Fields:

- dare id
- status/phase
- player display names
- score
- viewer count if stored
- timer metadata

Do not expose:

- answer correctness before allowed
- private participant signals
- hidden evidence

## Server Functions / RPC Boundaries

These functions should be `security definer` or implemented in a backend API with service-role DB access. The exact location depends on final backend choice.

### create_profile_after_auth

Creates:

- profile
- wallet account

Triggered after auth signup or called during onboarding.

### initialize_deposit

Creates payment transaction and calls provider from backend. This may live outside Postgres if provider call is in Node/Edge Function.

### process_payment_webhook

Responsibilities:

- verify provider event upstream before DB mutation
- ensure `(provider, provider_reference)` uniqueness
- create ledger entry once
- create notification
- write audit log

### create_dare

Responsibilities:

- validate profile status/KYC/risk
- validate stake limits
- calculate fee and payout
- insert DARE
- insert constitution
- create issuer escrow hold
- create ledger debit for escrow hold
- create audit log

### accept_dare

Responsibilities:

- lock DARE row
- validate DARE availability
- validate challenger status/KYC/risk
- create challenger escrow hold
- create ledger debit for escrow hold
- update DARE
- create Court session
- create notifications
- create audit log

### mark_player_ready

Responsibilities:

- validate participant
- update Court readiness
- if both ready, set server start time and active phase
- update DARE status
- broadcast realtime event

### submit_algorithmic_answer

Responsibilities:

- validate participant
- validate active Court
- validate deadline
- score answer using server-side correct option
- insert answer once
- broadcast score update

### complete_algorithmic_dare

Responsibilities:

- compute score
- decide winner/tie/void
- update DARE
- set dispute deadline or settle
- create audit log

### settle_dare

Responsibilities:

- enforce idempotency
- release escrow
- credit payout
- debit/credit platform fee as designed
- update trust score counters
- update DARE settled status
- create notifications
- create audit log

### file_dispute

Responsibilities:

- validate participant and deadline
- create jury case
- move DARE to dispute state
- hold settlement
- notify opponent/admins
- create audit log

### cast_jury_vote

Responsibilities:

- validate assignment
- validate case status
- insert immutable vote
- update assignment
- if threshold reached, calculate verdict
- trigger settlement or escalation

### admin_freeze_user

Responsibilities:

- set account/risk status
- optionally freeze wallet
- create audit log

## RLS Policy Matrix

| Table | User read | User insert | User update | User delete | Admin | Service |
|---|---|---|---|---|---|---|
| profiles | safe views / own full | no direct | own safe fields only | no | yes | yes |
| wallet_accounts | own | no | no | no | yes | yes |
| payment_transactions | own summary | no | no | no | yes | yes |
| ledger_entries | own | no | no | no | yes | yes |
| withdrawal_requests | own | no direct | no direct | no | yes | yes |
| dares | public/participant | no direct | no direct | no | yes | yes |
| dare_constitutions | same as DARE | no direct | no direct | no | yes | yes |
| escrow_holds | own/participant summary | no | no | no | yes | yes |
| dare_votes | own vote only | no direct | no | no | yes | yes |
| court_sessions | participant | no direct | no direct | no | yes | yes |
| quiz_questions | no direct MVP | no | no | no | yes | yes |
| dare_quiz_rounds | participant | no direct | no direct | no | yes | yes |
| dare_quiz_answers | own | no direct | no | no | yes | yes |
| court_chat_messages | visible public/participant | via API/RPC | no | no | yes | yes |
| notifications | own | no | own read status | no | yes | yes |
| evidence_objects | participant/assigned juror metadata | no direct | no | no | yes | yes |
| jury_cases | participant status / assigned juror packet | no direct | no direct | no | yes | yes |
| jury_assignments | own assignment | no direct | no direct | no | yes | yes |
| jury_votes | own after submit / case summary after close | no direct | no | no | yes | yes |
| jury_flags | own flags | no direct | no direct | no | yes | yes |
| audit_logs | no | no | no | no | yes | yes |
| risk_events | no | no | no | no | yes | yes |
| user_devices | no | no direct | no direct | no | yes | yes |
| kyc_verifications | own status | no direct | no direct | no | yes | yes |
| moderation_reports | own reports | no direct | no direct | no | yes | yes |
| trust_events | own trust history | no direct | no direct | no | yes | yes |
| responsible_gaming_settings | own | via server RPC | via server RPC | no | yes | yes |

## Triggers

### updated_at Trigger

Apply to mutable tables:

- profiles
- wallet_accounts
- payment_transactions
- dares
- court_sessions
- jury_cases
- jury_assignments
- risk_events

### Ledger Immutability Trigger

Reject update/delete on `ledger_entries` for all roles except a privileged maintenance role. Prefer no privileged updates in normal operations.

### Audit Trigger For Admin Tables

Admin actions should be explicit through API, but DB-level audit triggers can be added for defense-in-depth on:

- profiles account/risk changes
- wallet account status changes
- payment transaction status changes
- DARE status changes
- jury case status changes

## Seed Data

### Quiz Questions

Seed at least:

- 50 knowledge questions
- 25 sports questions
- 25 verbal/logic questions

Each question should have:

- category
- prompt
- four options
- correct option
- difficulty

### System Admin

Create admin manually through secure process. Do not seed a known password into migrations.

### Test Users

For local development only:

- issuer user
- challenger user
- spectator user
- juror user
- admin user

Never include production credentials in seed files.

## Migration Order

Implemented migration sequence:

1. `20260521225146_0001_extensions.sql` - extensions and helper functions.
2. `20260521225208_0002_profiles.sql` - categories, profiles, notifications.
3. `20260521225229_0003_wallet.sql` - wallet accounts, payment transactions, ledger entries.
4. `20260521225301_0004_dares.sql` - DAREs, constitutions, escrow holds, spectator votes.
5. `20260521225338_0005_court_and_quiz.sql` - Court sessions, chat, quiz questions, quiz rounds, quiz answers.
6. `20260521225406_0006_disputes_jury_evidence.sql` - evidence, jury cases, assignments, votes, jury flags.
7. `20260521225432_0007_audit_risk.sql` - audit logs, risk events, device records, KYC records, moderation reports.
8. `20260521225447_0008_responsible_gaming.sql` - trust events and responsible gaming settings.
9. `20260521225519_0009_withdrawal_requests.sql` - withdrawal request lifecycle.
10. `20260521225541_0010_views.sql` - wallet, feed, and Court read-model views.
11. `20260521225635_0011_rls.sql` - RLS policies for all tables.
12. `20260521225644_0012_reference_data.sql` - production-safe reference data.
13. `20260521225650_20260521223920_harden_existing_rls_auto_enable.sql` - remote project hardening for an existing dashboard-generated RLS helper function.
14. `20260521225742_20260521225726_harden_function_paths_and_extensions.sql` - function search path and extension schema hardening.
15. `20260521230705_optimize_rls_and_indexes.sql` - FK index coverage, RLS initPlan optimization, and consolidated read policies.
16. `20260521233000_request_withdrawal_rpc.sql` - atomic service-role withdrawal queue RPC.
17. `20260521234500_dare_action_rpcs.sql` - atomic service-role DARE create and accept RPCs.
18. `20260522000000_court_ready_rpc.sql` - atomic Court ready-up and quiz round assignment RPC.
19. `20260522001500_submit_answer_rpc.sql` - authoritative quiz answer submission and scoring RPC.
20. `20260522003000_complete_and_settle_rpcs.sql` - authoritative completion and escrow settlement RPCs.
21. `20260522004500_dispute_admin_rpcs.sql` - dispute filing and manual admin verdict RPCs.
22. `20260522010000_jury_assignment_vote_rpcs.sql` - jury assignment and immutable vote tally RPCs.
23. `20260522011500_cancel_dare_rpc.sql` - open DARE cancellation and issuer escrow refund RPC.
24. `20260522013000_forfeit_dare_rpc.sql` - active DARE forfeit RPC, superseded by `20260524000000_mobile_critical_gap_fixes.sql` for immediate settlement.
25. `20260522014500_court_heartbeat_rpc.sql` - active Court participant heartbeat RPC.
26. `20260522020000_notification_read_rpcs.sql` - notification read state RPCs.
27. `20260522021500_responsible_gaming_settings_rpc.sql` - responsible gaming limit updates with delayed increases.
28. `20260522023000_self_exclusion_rpc.sql` - responsible gaming self-exclusion and DARE cleanup RPC.
29. `20260522024500_evidence_upload_rpcs.sql` - evidence upload request and jury-case attachment RPCs.
30. `20260522030000_0013_idempotency.sql` - service-role idempotency store for state-changing actions.
31. `20260522030100_0014_deposit_totals_rpc.sql` - rolling deposit total RPC for cumulative responsible-gaming limits.
32. `20260522030200_0015_pg_cron_jobs.sql` - pg_cron maintenance and active Court expiry jobs.
33. `20260522031000_0016_kyc_submit_rpc.sql` - user KYC submission RPC.
34. `20260522032000_0017_kyc_decide_rpc.sql` - admin KYC decision and latest-status RPCs.
35. `20260522033000_0018_auto_settle_cron.sql` - scheduled auto-settlement for completed DAREs after dispute windows close.
36. `20260524000000_mobile_critical_gap_fixes.sql` - Paystack-ready settlement workflow fixes: immediate forfeit settlement, stale-heartbeat forfeits, jury quorum expiry, expanded auto-settlement, and trust event coverage.
37. `20260524010000_high_priority_gap_fixes.sql` - jury blind-packet randomization, user-device anti-collusion checks, Court ready-up KYC enforcement, and responsible-gaming cooling-off enforcement.
38. `20260524020000_wallet_storage_fee_fixes.sql` - signup wallet provisioning, `dare-evidence` storage bucket bootstrap, internal platform wallet setup, and platform-fee-aware DARE creation/settlement.
39. `20260524021000_fix_platform_wallet_select.sql` - local forward correction for the platform wallet lookup row shape in `settle_dare_action`.
40. `20260524030000_rate_limits_webhooks_cron_jury_guards.sql` - Postgres-backed action rate limits, idempotent required pg_cron scheduling with verification RPC, jury vote immutability and participant-assignment guards, and refreshed jury assignment filtering.
41. `20260524031000_withdrawal_pending_projection_fix.sql` - pending withdrawal balances now follow `withdrawal_requests` state so completed, failed, reversed, or cancelled transfers stop reserving funds.
42. `20260524032000_withdrawal_execution_rpc.sql` - atomic Paystack withdrawal claim RPC for execution workers.

Server functions/RPCs are now being implemented incrementally. The action layer currently covers profile reads/updates, automatic wallet provisioning, Postgres-backed rate limits for high-risk actions, jury opt-in preferences, notification read state, responsible gaming limit settings with delayed increases and cooling-off enforcement, cumulative deposit limit checks, self-exclusion with open/active DARE cleanup, Paystack deposit initialization and deposit/withdrawal webhook handling, withdrawal queue creation, Paystack withdrawal execution, and provider-state-aware pending balance projection, DARE create/accept/cancel with escrow and platform fee projection, active-match forfeit with immediate settlement, Court ready-up with KYC validation, quiz assignment, and heartbeat, authoritative answer scoring, escrow settlement after completion/forfeit with winner payout and platform fee ledgering, dispute filing, evidence upload/confirmation through the `dare-evidence` bucket, manual admin dispute resolution, jury assignment with blind-packet randomization, participant filtering, and device anti-collusion checks, immutable jury voting with quorum handling, KYC submit/status/admin decision, idempotency cleanup, verified scheduled active Court expiry, stale-heartbeat forfeit, jury quorum expiry, action-rate-limit cleanup, and scheduled post-dispute auto-settlement. Remaining functions should enforce deeper operational admin workflows.

## Database Test Requirements

### Constraints

Test:

- invalid username rejected
- negative stake rejected
- invalid DARE status rejected
- invalid resolution type rejected
- self challenge rejected
- invalid ledger direction rejected
- duplicate provider reference rejected
- duplicate jury vote rejected
- duplicate DARE acceptance prevented by API transaction

### RLS

Test:

- user cannot read another user's private wallet data
- user cannot insert ledger entry
- user cannot update trust score
- user cannot read unassigned jury packet
- participant can read own DARE
- public user can read public feed view only
- admin can read risk events

### Functions

Test:

- deposit webhook creates one ledger entry
- duplicate webhook creates no duplicate credit
- create DARE creates issuer escrow hold
- accept DARE creates challenger escrow hold
- insufficient funds blocks accept
- completed DARE settles once
- dispute blocks settlement
- jury verdict triggers correct settlement path

### Ledger Invariants

Test:

- escrow hold debit equals escrow hold amount
- escrow release plus payout plus platform fee reconcile with held escrow
- reversal entries reference original event in metadata
- no posted ledger row is updated or deleted

## Previously Open Schema Decisions

The initial schema decision set is now resolved by the migration series and summarized again in the resolved-decision table below.

1. `profiles.trust_score` is a cached projection; `trust_events` is the authoritative audit trail.
2. `trust_events` ships in the MVP schema.
3. Platform fees use an internal wallet account created during secure setup.
4. Settlement waits for the dispute window before final payout.
5. Public feed reads use `public_dare_feed`; sensitive mutations stay behind server functions.
6. Postgres enums are deferred; use text plus check constraints until values stabilize.
7. Evidence tables ship now because disputes need private evidence packets.
8. Court selected questions are stored in `dare_quiz_rounds`.

---

## Schema Gap Analysis And Resolution Status
### Cross-referenced against: prototype (index.html), docs/01–10, dare-master-strategy.md, deep-research-report.md

This section is retained as the audit trail behind the migration design. The Supabase migrations apply the recommended fixes for GAP-01 through GAP-23. GAP-24 is resolved by the implemented migration order above. The wording below describes the original gap, rationale, and fix, even where the fix is now present in `supabase/migrations/`.

---

### CRITICAL — Will block correct operation or data integrity

#### GAP-01: `dare_votes` table is missing

The `dares` table has no `votes_a` / `votes_b` score columns and there is no `dare_votes` table. Witnessed-resolution DAREs require individual spectator vote records to prevent double-voting, provide an audit trail, and compute the final tally. The prototype writes directly to `dare_votes` via `castVote()`.

**Resolution:** Add the following table:

```sql
create table dare_votes (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete restrict,
  vote text not null check (vote in ('A', 'B')),
  created_at timestamptz not null default now(),
  unique (dare_id, voter_id)
);
create index dare_votes_dare_idx on dare_votes (dare_id);
```

Also add denormalized counters to `court_sessions` for real-time display:

```sql
alter table court_sessions add column votes_a integer not null default 0;
alter table court_sessions add column votes_b integer not null default 0;
alter table court_sessions add column score_a integer not null default 0;
alter table court_sessions add column score_b integer not null default 0;
```

The counters are updated by server functions after each vote or answer. Individual records in `dare_votes` and `dare_quiz_answers` remain the authoritative source.

---

#### GAP-02: `dare_quiz_rounds` table is missing (Open Decision #8 — resolve YES)

`dare_quiz_answers` references `question_id` but there is no record of which questions were assigned to a given dare. Without this:

- Both players cannot be served identical questions simultaneously.
- Answer submission cannot be validated against the assigned question set.
- The match cannot be audited or reconstructed.
- A player could attempt to guess or probe the question bank before their match.

Open Decision #8 should be resolved in favour of the table. Add:

```sql
create table dare_quiz_rounds (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id) on delete cascade,
  question_id uuid not null references quiz_questions(id) on delete restrict,
  round_index smallint not null,
  assigned_at timestamptz not null default now(),
  unique (dare_id, round_index),
  unique (dare_id, question_id),
  constraint dare_quiz_rounds_index_valid check (round_index >= 0)
);
create index dare_quiz_rounds_dare_idx on dare_quiz_rounds (dare_id, round_index);
```

Also change `dare_quiz_answers.question_id` to require the question to have been assigned:

```sql
-- The unique constraint already prevents double-answers.
-- Application code must verify question_id is in dare_quiz_rounds for this dare.
```

---

#### GAP-03: `withdrawal_requests` table is missing

`ledger_entries` tracks `withdrawal_pending` and `withdrawal_completed` events but there is no table representing the withdrawal request lifecycle: bank details, processing batch, provider reference, failure reason, retry count. `doc/06-wallet` describes a queue-based withdrawal workflow that requires this:

```sql
create table withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete restrict,
  wallet_account_id uuid not null references wallet_accounts(id) on delete restrict,
  amount integer not null check (amount > 0),
  currency text not null default 'NGN' check (char_length(currency) = 3),
  bank_code text not null,
  account_number text not null,
  account_name text not null,
  provider text,
  provider_recipient_code text,
  provider_transfer_reference text,
  status text not null default 'pending'
    check (status in ('pending','processing','completed','failed','reversed','cancelled')),
  failure_reason text,
  ledger_entry_id uuid references ledger_entries(id) on delete restrict,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index withdrawal_requests_user_status_idx on withdrawal_requests (user_id, status);
create index withdrawal_requests_status_requested_idx on withdrawal_requests (status, requested_at)
  where status in ('pending', 'processing');
```

RLS intent: users can read their own withdrawal requests; only service role can insert or update.

---

#### GAP-04: `ledger_entries.dare_id` has no foreign key constraint

The column is declared as `dare_id uuid` with no `references dares(id)`. This allows ledger entries to reference non-existent dare IDs, breaking reconciliation and joins. Fix:

```sql
-- In the migration, replace the bare column with:
dare_id uuid references dares(id) on delete restrict,
```

---

#### GAP-05: `ledger_entries` missing `balance_snapshot`

`doc/04-core-domain-model` lists `balance_snapshot` as a key field on LedgerEntry. The schema omits it. Without a per-entry snapshot, ledger reconciliation and forensic debugging require replaying the entire ledger history. Add:

```sql
alter table ledger_entries
  add column balance_before integer,
  add column balance_after integer;
```

These are populated by the server function writing the entry, not computed later.

---

### SIGNIFICANT — Required for documented features or compliance

#### GAP-06: `trust_events` table missing (Open Decisions #1 and #2 — resolve YES for MVP)

`doc/07-disputes-jury-and-trust` lists ten distinct positive and negative trust signals. `doc/04` marks this as Open Decision #1 and #2 with no resolution. Without an event log:

- Trust scores cannot be audited when users challenge a score.
- Inflation or manipulation is invisible.
- Bugs in scoring logic cannot be corrected retroactively.

Resolve both decisions: store trust_score as a cached column on profiles (for fast reads and tier evaluation) AND write immutable events as the authoritative source.

```sql
create table trust_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete restrict,
  event_type text not null,
  delta integer not null,
  resulting_score integer not null,
  dare_id uuid references dares(id) on delete set null,
  jury_case_id uuid references jury_cases(id) on delete set null,
  admin_note text,
  created_at timestamptz not null default now(),
  constraint trust_events_type_valid check (event_type in (
    'dare_win', 'dare_loss', 'dare_forfeit', 'dare_no_show',
    'dispute_filed_upheld', 'dispute_filed_denied',
    'dispute_received_upheld', 'dispute_received_denied',
    'jury_vote_completed', 'jury_assignment_abandoned',
    'jury_opt_in_bonus',
    'payment_reversed', 'collusion_flag',
    'abuse_report_upheld', 'admin_adjustment'
  ))
);
create index trust_events_user_created_idx on trust_events (user_id, created_at desc);
create index trust_events_dare_idx on trust_events (dare_id) where dare_id is not null;
```

---

#### GAP-07: Platform fee wallet is resolved

`ledger_entries` has a `platform_fee` type and the migration set now creates an internal `dare_platform` profile with an active NGN wallet account to receive those entries. Without this account, revenue cannot be reconciled, juror reward pools cannot be funded from fee income, and financial reporting is incomplete.

The implemented setup creates the system user/profile/wallet during migration.

```sql
insert into profiles (id, username, display_name, kyc_tier, account_status, risk_status)
values (
  '00000000-0000-4000-8000-000000000001',
  'dare_platform',
  'DARE Platform',
  'kyc3',
  'active',
  'normal'
);
```

All `platform_fee` ledger entries credit this account. Juror rewards can later debit it. The system profile is internal-only and is not seeded with a known password.

---

#### GAP-08: `user_devices` table missing

`doc/07` requires juror assignment to avoid jurors from the same device cluster. `doc/08` lists multi-account abuse and device/session monitoring as required security controls. There is no table for device fingerprints.

```sql
create table user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  device_fingerprint text not null,
  platform text,
  os_version text,
  app_version text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_flagged boolean not null default false,
  unique (user_id, device_fingerprint)
);
create index user_devices_fingerprint_idx on user_devices (device_fingerprint);
create index user_devices_user_idx on user_devices (user_id);
```

RLS intent: service role only; users cannot read or write directly.

---

#### GAP-09: `kyc_verifications` table missing

`profiles.kyc_tier` tracks the current KYC level but provides no audit trail of verification attempts, documents, reviewer decisions, or timestamps. `doc/08` requires record retention for KYC/AML compliance. Without this table, there is no evidence that verification was performed.

```sql
create table kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete restrict,
  kyc_tier_requested text not null check (kyc_tier_requested in ('kyc1','kyc2','kyc3')),
  kyc_tier_granted text check (kyc_tier_granted in ('kyc1','kyc2','kyc3')),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','expired','cancelled')),
  provider text,
  provider_reference text,
  documents jsonb not null default '{}',
  reviewer_user_id uuid references profiles(id) on delete set null,
  reviewer_note text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index kyc_verifications_user_status_idx on kyc_verifications (user_id, status);
```

---

#### GAP-10: `responsible_gaming_settings` table missing

`doc/08` lists deposit limits, cooling-off periods, and self-exclusion as required for responsible play and Lagos LSLGA compliance. These are not optional pre-launch items.

```sql
create table responsible_gaming_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  daily_deposit_limit_kobo integer,
  weekly_deposit_limit_kobo integer,
  monthly_deposit_limit_kobo integer,
  max_stake_per_dare_kobo integer,
  self_excluded boolean not null default false,
  self_exclusion_until timestamptz,
  cooling_off_until timestamptz,
  updated_at timestamptz not null default now()
);
```

RLS intent: users can read their own settings. All changes go through server RPCs so limit raises, cooling-off periods, and self-exclusion removal cannot bypass server validation. Service role enforces limits at stake/deposit time.

---

#### GAP-11: `moderation_reports` table missing

`doc/08` requires block/report functionality and moderation queues. `court_chat_messages` has `moderation_status` but there is no table capturing who reported what and why.

```sql
create table moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete restrict,
  target_type text not null check (target_type in ('user','dare','chat_message','evidence')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 5 and 1000),
  status text not null default 'open'
    check (status in ('open','reviewing','resolved','dismissed')),
  reviewer_id uuid references profiles(id) on delete set null,
  reviewer_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index moderation_reports_status_created_idx on moderation_reports (status, created_at desc);
create index moderation_reports_target_idx on moderation_reports (target_type, target_id);
```

---

#### GAP-12: `jury_flags` table missing (present in prototype)

The prototype has `flagJuryCase()` and `submitFlag()` writing to a `jury_flags` table. This is distinct from `moderation_reports` — it is a juror flagging a case as unsuitable for jury resolution (e.g., missing evidence, constitutional ambiguity). Either add a dedicated table or explicitly route to `moderation_reports` with `target_type = 'jury_case'`.

If routing to `moderation_reports`, document this explicitly. If a separate table is preferred:

```sql
create table jury_flags (
  id uuid primary key default gen_random_uuid(),
  jury_case_id uuid not null references jury_cases(id) on delete cascade,
  flagged_by uuid not null references profiles(id) on delete restrict,
  reason text not null check (char_length(reason) between 10 and 2000),
  reviewed boolean not null default false,
  reviewed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index jury_flags_case_idx on jury_flags (jury_case_id);
```

---

### SCHEMA QUALITY — Constraints, naming, and referential integrity issues

#### GAP-13: `evidence_objects` has no link to `jury_cases`

A jury case reviews specific evidence objects. Currently the link is indirect: jury case → dare_id → evidence_objects. If both players submitted evidence, the server must know which is submission A and which is submission B for the blind packet. This mapping is not stored.

Add columns to `jury_cases`:

```sql
alter table jury_cases
  add column evidence_a_id uuid references evidence_objects(id) on delete restrict,
  add column evidence_b_id uuid references evidence_objects(id) on delete restrict;
```

These are set when the case is created by the server, establishing the blind mapping before jurors are assigned.

---

#### GAP-14: `dares` missing `constitution_id` back-reference

`doc/04-core-domain-model` explicitly lists `constitution_id` as a field on DARE. The schema has `dare_constitutions` pointing to `dares` via `dare_id`, but `dares` has no reverse reference. Without this, confirming that a dare has a constitution requires a join. Add:

```sql
alter table dares add column constitution_id uuid references dare_constitutions(id) on delete restrict;
```

This creates a nullable back-reference set after constitution creation. This is a circular reference that should be handled carefully in migrations (nullable initially, then set after constitution insert).

---

#### GAP-15: `notifications.type` has no check constraint

The `notifications` table accepts any value for `type`. This means invalid notification types can be inserted without error. Add:

```sql
alter table notifications add constraint notifications_type_valid check (
  type in (
    'dare_received', 'dare_accepted', 'dare_declined', 'dare_expired',
    'court_starting', 'match_result', 'payout_sent',
    'dispute_filed', 'jury_invite', 'jury_verdict',
    'wallet_deposit', 'withdrawal_complete', 'withdrawal_failed',
    'tier_change', 'trust_update', 'kyc_update',
    'admin_action', 'system'
  )
);
```

---

#### GAP-16: `profiles` missing `last_active_at`, `bio`, and `avatar_color`

`doc/04` domain model lists `last_active_at` on User. The prototype uses `avatar_color` for avatar rendering. `bio` appears in the profile page. None of these are in the schema.

```sql
alter table profiles
  add column last_active_at timestamptz,
  add column bio text check (bio is null or char_length(bio) <= 300),
  add column avatar_color text default 'ember';
```

`last_active_at` should be updated on every authenticated action (via application middleware, not a trigger, to avoid excessive writes).

---

#### GAP-17: `dare_quiz_answers.response_ms` is client-spoofable

The field captures how quickly a player answered. If the client sends this value, it can be manipulated. It should be computed server-side from the time the question was delivered to the time the answer was received.

To make this reliable, `dare_quiz_rounds` (GAP-02) should record `question_delivered_at` per player, and the server computes `response_ms = received_at - question_delivered_at`.

Either remove `response_ms` from client-submitted answer payloads and compute it server-side, or mark it as informational only (not used in scoring or trust decisions).

---

#### GAP-18: `court_sessions` / `dares` authority split is undocumented

`dares.status` has values like `ready_check`, `active`, and `awaiting_result`. `court_sessions.phase` has overlapping values: `ready_check`, `active`, `awaiting_result`. These two sources of truth can diverge.

The intended authority should be explicit:

- `dares.status` is the durable business record — updated by server functions at key transitions.
- `court_sessions.phase` is the ephemeral operational state — updated frequently during a live match.

Server functions should update both atomically. Document this in a comment or architecture note. Add:

```sql
comment on column court_sessions.phase is
  'Operational court phase. dares.status is the authoritative business record. Both are updated atomically by server functions.';
```

---

#### GAP-19: Escrow status does not distinguish active-dare vs dispute-frozen holds

`escrow_holds.status = ''held''` covers both a hold on an active dare AND a hold frozen due to a dispute. The wallet summary view cannot distinguish these without joining to `dares.status`. This affects the user-facing wallet display (the UI shows separate "escrowed" vs "held/frozen" balances per `doc/03-user-roles-and-journeys`, Journey 8).

Add a `reason` column or split statuses:

```sql
alter table escrow_holds add column hold_reason text not null default 'dare_active'
  check (hold_reason in ('dare_active', 'dispute_pending', 'risk_hold', 'admin_hold'));
```

Update `hold_reason` to `dispute_pending` when a jury case is filed.

---

#### GAP-20: `quiz_questions.options` jsonb lacks structural validation

The `options` column is `jsonb not null` with no shape constraint. A question with 1 option or 10 options would pass insertion. Add a check:

```sql
alter table quiz_questions add constraint quiz_questions_options_valid
  check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6);
```

Also validate that `correct_option` is within the options array bounds at the application layer (SQL check constraints cannot reference other columns in this way).

---

### MINOR — Lower priority but worth tracking

#### GAP-21: `profiles.trust_score` upper bound inconsistency

The earlier draft schema set `trust_score between 0 and 999`, but the prototype code and strategy document use a cap of 1000 (Legend tier threshold is 800–1000). This is now aligned in the main schema and `0002_profiles.sql`:

```sql
-- Change constraint to:
constraint profiles_trust_score_range check (trust_score between 0 and 1000)
```

---

#### GAP-22: No `dare_categories` reference table

`dares.category` is validated by a CHECK constraint against a hardcoded list. A reference table enables the app to fetch valid categories dynamically for the create form and allows new categories to be added without a migration:

```sql
create table dare_categories (
  id text primary key,  -- 'knowledge', 'physical', etc.
  label text not null,
  icon text,
  active boolean not null default true
);
```

Drop the inline CHECK on `dares.category` and enforce via FK when stable.

---

#### GAP-23: `audit_logs` missing index on `created_at`

The existing indexes cover `(actor_user_id, created_at)` and `(target_type, target_id, created_at)` but there is no index for time-range admin queries that scan across all action types:

```sql
create index audit_logs_created_idx on audit_logs (created_at desc);
```

---

#### GAP-24: Migration order did not include applied gap tables

`dare_quiz_rounds` (GAP-02) and `withdrawal_requests` (GAP-03) should appear in the migration order. The implemented sequence now includes them:

```text
0005_court_and_quiz.sql         -- add dare_quiz_rounds here
0006_disputes_jury_evidence.sql -- add jury_flags here
0007_audit_risk.sql             -- add user_devices, kyc_verifications, moderation_reports
0008_responsible_gaming.sql     -- add responsible_gaming_settings, trust_events
0009_withdrawal_requests.sql    -- add withdrawal_requests
```

---

## Resolved Open Decisions

The following Open Schema Decisions are now resolved:

| Decision | Resolution |
|---|---|
| #1 — trust_score storage | Cached column on profiles (fast reads) + `trust_events` table (authoritative audit). Both required. |
| #2 — trust_events in MVP | Yes. Required before launch for compliance audit trail. |
| #3 — platform fee wallet | Yes. A system wallet account with a well-known UUID is created during setup. |
| #4 — dispute window vs immediate settlement | Settlement waits for dispute window (`dispute_deadline_at` on dare). Settles automatically after window expires with no dispute filed. Server job polls for expired windows. |
| #5 — public feed view or API-only | View (`public_dare_feed`) is the right call for Supabase RLS-protected reads. Serve via Supabase direct client for the feed; use API for mutations. |
| #6 — Postgres enums | Defer. Use text + check constraints now. Migrate to enums after status values have been stable for one full sprint cycle. |
| #7 — evidence tables in MVP migration | Yes. Create the schema now even though evidence DAREs are excluded from MVP scope. Evidence tables will be referenced by disputes (juror evidence packets). |
| #8 — dare_quiz_rounds table | Yes. Required for question assignment integrity. See GAP-02. |

---

## Recommended Next Step

Validate the current migration set locally, then add the server function/RPC layer that performs all sensitive writes. The next database work should be:

1. Run a clean local Supabase reset against `supabase/migrations/`.
2. Add database tests for constraints, RLS, ledger immutability, and payment idempotency.
3. Implement service-role functions for DARE creation/acceptance, quiz scoring, settlement, withdrawals, disputes, and trust events.
4. Add storage bucket policies for private evidence and signed URL access.
5. Clean SQL comment encoding so migration comments render consistently across terminals.
