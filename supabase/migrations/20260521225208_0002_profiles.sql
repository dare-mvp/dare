-- ============================================================
-- 0002_profiles.sql
-- User profiles, dare category reference table, and notifications.
--
-- Applied gaps:
--   GAP-16  profiles.last_active_at, bio, avatar_color
--   GAP-21  trust_score upper bound corrected to 1000
--   GAP-22  dare_categories reference table
--   GAP-15  notifications.type check constraint
-- ============================================================

-- ── dare_categories (GAP-22) ─────────────────────────────────
-- Reference table for valid DARE categories.
-- Seeded in 0012_reference_data.sql.
-- Enables dynamic category fetch from the mobile app create form.
create table dare_categories (
  id      text primary key,             -- 'knowledge', 'physical', etc.
  label   text not null,
  icon    text,
  active  boolean not null default true,
  sort_order smallint not null default 0
);

-- ── profiles ─────────────────────────────────────────────────
-- App-level user profile. auth.users is the authentication source of truth.
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        citext unique not null,
  display_name    text,
  avatar_url      text,
  avatar_emoji    text,
  avatar_color    text not null default 'ember',        -- GAP-16
  bio             text,                                  -- GAP-16
  country         text,
  city            text,
  trust_score     integer not null default 0,
  tier            text not null default 'newcomer',
  wins            integer not null default 0,
  losses          integer not null default 0,
  disputes        integer not null default 0,
  completed_dares integer not null default 0,
  jury_opt_in     boolean not null default false,
  jury_categories text[] not null default '{}',
  kyc_tier        text not null default 'kyc0',
  account_status  text not null default 'active',
  risk_status     text not null default 'normal',
  is_admin        boolean not null default false,
  last_active_at  timestamptz,                           -- GAP-16
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint profiles_username_len
    check (char_length(username::text) between 3 and 30),
  constraint profiles_username_format
    check (username::text ~ '^[a-zA-Z0-9_]+$'),
  -- GAP-21: upper bound 1000 (prototype/strategy doc cap; original schema had 999)
  constraint profiles_trust_score_range
    check (trust_score between 0 and 1000),
  constraint profiles_counts_nonnegative
    check (wins >= 0 and losses >= 0 and disputes >= 0 and completed_dares >= 0),
  constraint profiles_bio_len
    check (bio is null or char_length(bio) <= 300),
  constraint profiles_kyc_tier_valid
    check (kyc_tier in ('kyc0','kyc1','kyc2','kyc3')),
  constraint profiles_account_status_valid
    check (account_status in ('active','limited','frozen','banned','closed')),
  constraint profiles_risk_status_valid
    check (risk_status in ('normal','watch','review','hold','blocked')),
  constraint profiles_tier_valid
    check (tier in ('newcomer','contender','challenger','champion','legend'))
);

create index profiles_trust_score_idx    on profiles (trust_score desc);
create index profiles_account_status_idx on profiles (account_status);
create index profiles_risk_status_idx    on profiles (risk_status);
create index profiles_jury_opt_in_idx    on profiles (jury_opt_in) where jury_opt_in = true;
create index profiles_last_active_idx    on profiles (last_active_at desc nulls last);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ── notifications ────────────────────────────────────────────
-- User inbox. Placed here because it only references profiles.
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text not null,
  action      jsonb,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,

  constraint notifications_title_len
    check (char_length(title) between 1 and 160),
  constraint notifications_body_len
    check (char_length(body) between 1 and 1000),
  -- GAP-15: prevent insertion of unknown notification types
  constraint notifications_type_valid check (type in (
    'dare_received', 'dare_accepted', 'dare_declined', 'dare_expired',
    'court_starting', 'match_result', 'payout_sent',
    'dispute_filed', 'jury_invite', 'jury_verdict',
    'wallet_deposit', 'withdrawal_complete', 'withdrawal_failed',
    'tier_change', 'trust_update', 'kyc_update',
    'admin_action', 'system'
  ))
);

create index notifications_user_created_idx on notifications (user_id, created_at desc);
create index notifications_user_unread_idx  on notifications (user_id, is_read) where is_read = false;
