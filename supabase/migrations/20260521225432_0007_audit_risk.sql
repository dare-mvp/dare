-- ============================================================
-- 0007_audit_risk.sql
-- Audit logs, risk events, and compliance/security tables.
--
-- Applied gaps:
--   GAP-08  user_devices for multi-account detection and juror clustering
--   GAP-09  kyc_verifications for KYC/AML audit trail
--   GAP-11  moderation_reports for user content reports
--   GAP-23  audit_logs additional created_at index for time-range admin queries
-- ============================================================

-- ── audit_logs ───────────────────────────────────────────────
-- Append-only. Written by Edge Functions and server RPCs.
-- Users cannot read; admins can read; service role writes.
create table audit_logs (
  id               uuid primary key default gen_random_uuid(),
  actor_user_id    uuid references profiles(id) on delete set null,
  actor_type       text not null,
  action           text not null,
  target_type      text not null,
  target_id        uuid,
  metadata         jsonb not null default '{}',
  ip_address       inet,
  user_agent       text,
  created_at       timestamptz not null default now(),

  constraint audit_logs_actor_type_valid
    check (actor_type in ('user','admin','system','provider')),
  constraint audit_logs_action_len
    check (char_length(action) between 3 and 120),
  constraint audit_logs_target_type_len
    check (char_length(target_type) between 3 and 120)
);

create index audit_logs_actor_created_idx
  on audit_logs (actor_user_id, created_at desc);
create index audit_logs_target_idx
  on audit_logs (target_type, target_id, created_at desc);
create index audit_logs_action_created_idx
  on audit_logs (action, created_at desc);
-- GAP-23: time-range admin queries across all action types
create index audit_logs_created_idx
  on audit_logs (created_at desc);

-- ── risk_events ──────────────────────────────────────────────
-- Fraud flags, suspicious patterns, and manual risk reviews.
create table risk_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references profiles(id) on delete set null,
  dare_id             uuid references dares(id) on delete set null,
  type                text not null,
  severity            text not null,
  status              text not null default 'open',
  evidence            jsonb not null default '{}',
  reviewed_by_user_id uuid references profiles(id) on delete set null,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint risk_events_severity_valid
    check (severity in ('low','medium','high','critical')),
  constraint risk_events_status_valid
    check (status in ('open','reviewing','resolved','dismissed','escalated'))
);

create index risk_events_user_status_idx
  on risk_events (user_id, status);
create index risk_events_dare_status_idx
  on risk_events (dare_id, status);
create index risk_events_severity_created_idx
  on risk_events (severity, created_at desc);

create trigger trg_risk_events_updated_at
  before update on risk_events
  for each row execute function set_updated_at();

-- ── user_devices (GAP-08) ────────────────────────────────────
-- Device fingerprints for multi-account detection and
-- juror assignment clustering prevention (doc/07).
-- Service role only — users cannot read or write directly.
create table user_devices (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  device_fingerprint  text not null,
  platform            text,
  os_version          text,
  app_version         text,
  first_seen_at       timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  is_flagged          boolean not null default false,

  unique (user_id, device_fingerprint)
);

-- Cross-user fingerprint lookup for multi-account detection
create index user_devices_fingerprint_idx on user_devices (device_fingerprint);
create index user_devices_user_idx        on user_devices (user_id);
create index user_devices_flagged_idx     on user_devices (is_flagged) where is_flagged = true;

-- ── kyc_verifications (GAP-09) ───────────────────────────────
-- KYC audit trail required for KYC/AML compliance (doc/08).
-- profiles.kyc_tier is the current status;
-- this table is the immutable record of how it was reached.
create table kyc_verifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete restrict,
  kyc_tier_requested  text not null,
  kyc_tier_granted    text,
  status              text not null default 'pending',
  provider            text,
  provider_reference  text,
  documents           jsonb not null default '{}',
  reviewer_user_id    uuid references profiles(id) on delete set null,
  reviewer_note       text,
  submitted_at        timestamptz not null default now(),
  decided_at          timestamptz,
  created_at          timestamptz not null default now(),

  constraint kyc_verifications_tier_requested_valid
    check (kyc_tier_requested in ('kyc1','kyc2','kyc3')),
  constraint kyc_verifications_tier_granted_valid
    check (kyc_tier_granted is null or kyc_tier_granted in ('kyc1','kyc2','kyc3')),
  constraint kyc_verifications_status_valid
    check (status in ('pending','approved','rejected','expired','cancelled'))
);

create index kyc_verifications_user_status_idx
  on kyc_verifications (user_id, status);
create index kyc_verifications_status_submitted_idx
  on kyc_verifications (status, submitted_at desc);

-- ── moderation_reports (GAP-11) ──────────────────────────────
-- User content reports (user, dare, chat message, evidence).
-- Feeds moderation queue; distinct from jury_flags which handles
-- juror-level case suitability flags.
create table moderation_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references profiles(id) on delete restrict,
  target_type   text not null,
  target_id     uuid not null,
  reason        text not null,
  status        text not null default 'open',
  reviewer_id   uuid references profiles(id) on delete set null,
  reviewer_note text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,

  constraint moderation_reports_target_type_valid
    check (target_type in ('user','dare','chat_message','evidence')),
  constraint moderation_reports_reason_len
    check (char_length(reason) between 5 and 1000),
  constraint moderation_reports_status_valid
    check (status in ('open','reviewing','resolved','dismissed'))
);

create index moderation_reports_status_created_idx
  on moderation_reports (status, created_at desc);
create index moderation_reports_target_idx
  on moderation_reports (target_type, target_id);
create index moderation_reports_reporter_idx
  on moderation_reports (reporter_id, created_at desc);
