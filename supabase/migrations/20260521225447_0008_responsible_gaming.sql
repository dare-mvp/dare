-- ============================================================
-- 0008_responsible_gaming.sql
-- Trust score event log and responsible gaming controls.
-- Both are required before launch (doc/07, doc/08, LSLGA compliance).
--
-- Applied gaps:
--   GAP-06  trust_events — immutable audit trail for all trust score changes
--           (resolves Open Decisions #1 and #2)
--   GAP-10  responsible_gaming_settings — deposit limits, self-exclusion,
--           cooling-off periods
-- ============================================================

-- ── trust_events (GAP-06) ────────────────────────────────────
-- Append-only. profiles.trust_score is the cached read projection.
-- trust_events is the authoritative audit source.
-- When a score dispute is raised, this table proves the history.
create table trust_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete restrict,
  event_type       text not null,
  delta            integer not null,
  resulting_score  integer not null,
  dare_id          uuid references dares(id) on delete set null,
  jury_case_id     uuid references jury_cases(id) on delete set null,
  admin_note       text,
  created_at       timestamptz not null default now(),

  constraint trust_events_type_valid check (event_type in (
    'dare_win',
    'dare_loss',
    'dare_forfeit',
    'dare_no_show',
    'dispute_filed_upheld',
    'dispute_filed_denied',
    'dispute_received_upheld',
    'dispute_received_denied',
    'jury_vote_completed',
    'jury_assignment_abandoned',
    'jury_opt_in_bonus',
    'payment_reversed',
    'collusion_flag',
    'abuse_report_upheld',
    'admin_adjustment'
  )),
  constraint trust_events_resulting_score_range
    check (resulting_score between 0 and 1000)
);

create index trust_events_user_created_idx
  on trust_events (user_id, created_at desc);
create index trust_events_dare_idx
  on trust_events (dare_id) where dare_id is not null;
create index trust_events_jury_case_idx
  on trust_events (jury_case_id) where jury_case_id is not null;

-- ── responsible_gaming_settings (GAP-10) ─────────────────────
-- One row per user. All limits are in kobo (minor NGN units).
-- A null limit means no limit set (platform default applies).
-- Raising limits is subject to a cooling-off period enforced server-side,
-- not at the DB layer — the server checks cooling_off_until before
-- accepting a limit-raise request.
create table responsible_gaming_settings (
  user_id                     uuid primary key references profiles(id) on delete cascade,
  daily_deposit_limit_kobo    integer check (daily_deposit_limit_kobo is null or daily_deposit_limit_kobo > 0),
  weekly_deposit_limit_kobo   integer check (weekly_deposit_limit_kobo is null or weekly_deposit_limit_kobo > 0),
  monthly_deposit_limit_kobo  integer check (monthly_deposit_limit_kobo is null or monthly_deposit_limit_kobo > 0),
  max_stake_per_dare_kobo     integer check (max_stake_per_dare_kobo is null or max_stake_per_dare_kobo > 0),
  self_excluded               boolean not null default false,
  self_exclusion_until        timestamptz,
  cooling_off_until           timestamptz,
  updated_at                  timestamptz not null default now(),

  constraint responsible_gaming_self_exclusion_consistent
    check (
      (self_excluded = false and self_exclusion_until is null)
      or (self_excluded = true)
    )
);

create trigger trg_responsible_gaming_updated_at
  before update on responsible_gaming_settings
  for each row execute function set_updated_at();
