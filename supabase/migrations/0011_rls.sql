-- ============================================================
-- 0011_rls.sql
-- Row-Level Security policies for all tables.
--
-- Principal model:
--   auth.uid()         — the authenticated user's UUID
--   service_role       — Supabase service key (Edge Functions, webhooks)
--   is_admin column    — profiles.is_admin = true (checked via join)
--
-- Policy naming: <table>_<role>_<action>
-- ============================================================

-- ── Helper: private.is_admin() ────────────────────────────────
-- Inline function used in policies to avoid repeated joins.
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated, service_role;

-- ════════════════════════════════════════════════════════════
-- dare_categories
-- ════════════════════════════════════════════════════════════
alter table dare_categories enable row level security;

-- All authenticated users can read active categories
create policy "dare_categories_any_read"
  on dare_categories for select
  using (active = true);

-- ════════════════════════════════════════════════════════════
-- profiles
-- ════════════════════════════════════════════════════════════
alter table profiles enable row level security;

-- Do not expose the profiles base table as a public directory.
-- Public profile/feed data must be read through safe views such as
-- public_dare_feed, which selects only display-safe columns.

-- Users can read their own full profile regardless of status
create policy "profiles_own_read"
  on profiles for select
  using (id = auth.uid());

-- Users can update only their own safe profile fields
-- Sensitive fields (trust_score, tier, counters, kyc_tier, account_status,
-- risk_status, is_admin) must only be updated by service role via RPC.
create policy "profiles_own_update"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- RLS is row-level, not column-level. Restrict authenticated profile
-- updates to display/profile fields; server functions own sensitive columns.
revoke update on profiles from authenticated;
grant update (username, display_name, avatar_url, avatar_emoji, avatar_color, bio, country, city)
  on profiles to authenticated;

-- Admins can read and update all profiles
create policy "profiles_admin_all"
  on profiles for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- notifications
-- ════════════════════════════════════════════════════════════
alter table notifications enable row level security;

-- Users can read their own notifications
create policy "notifications_own_read"
  on notifications for select
  using (user_id = auth.uid());

-- Users can mark their own notifications as read
create policy "notifications_own_update"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users should only mutate read state. Notification content is server-owned.
revoke update on notifications from authenticated;
grant update (read_at) on notifications to authenticated;

-- ════════════════════════════════════════════════════════════
-- wallet_accounts
-- ════════════════════════════════════════════════════════════
alter table wallet_accounts enable row level security;

create policy "wallet_accounts_own_read"
  on wallet_accounts for select
  using (user_id = auth.uid());

create policy "wallet_accounts_admin_all"
  on wallet_accounts for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- payment_transactions
-- ════════════════════════════════════════════════════════════
alter table payment_transactions enable row level security;

create policy "payment_transactions_own_read"
  on payment_transactions for select
  using (user_id = auth.uid());

create policy "payment_transactions_admin_all"
  on payment_transactions for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- ledger_entries
-- ════════════════════════════════════════════════════════════
alter table ledger_entries enable row level security;

create policy "ledger_entries_own_read"
  on ledger_entries for select
  using (user_id = auth.uid());

create policy "ledger_entries_admin_all"
  on ledger_entries for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- withdrawal_requests
-- ════════════════════════════════════════════════════════════
alter table withdrawal_requests enable row level security;

create policy "withdrawal_requests_own_read"
  on withdrawal_requests for select
  using (user_id = auth.uid());

create policy "withdrawal_requests_admin_all"
  on withdrawal_requests for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- dares
-- ════════════════════════════════════════════════════════════
alter table dares enable row level security;

-- Public open/active/settled DAREs readable by anyone authenticated
create policy "dares_public_read"
  on dares for select
  using (status in ('open','active','completed','settled'));

-- Issuer and challenger can read their own DARE regardless of status
create policy "dares_participant_read"
  on dares for select
  using (issuer_id = auth.uid() or challenger_id = auth.uid());

-- Admins
create policy "dares_admin_all"
  on dares for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- dare_constitutions
-- ════════════════════════════════════════════════════════════
alter table dare_constitutions enable row level security;

-- Constitution visibility follows the parent DARE
create policy "dare_constitutions_public_read"
  on dare_constitutions for select
  using (
    dare_id in (
      select id from dares
      where status in ('open','active','completed','settled')
        or issuer_id = auth.uid()
        or challenger_id = auth.uid()
    )
  );

create policy "dare_constitutions_admin_all"
  on dare_constitutions for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- escrow_holds
-- ════════════════════════════════════════════════════════════
alter table escrow_holds enable row level security;

-- Users can read their own escrow holds
create policy "escrow_holds_own_read"
  on escrow_holds for select
  using (user_id = auth.uid());

-- Dare participants can see the escrow summary for their DARE
create policy "escrow_holds_participant_read"
  on escrow_holds for select
  using (
    dare_id in (
      select id from dares
      where issuer_id = auth.uid() or challenger_id = auth.uid()
    )
  );

create policy "escrow_holds_admin_all"
  on escrow_holds for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- dare_votes
-- ════════════════════════════════════════════════════════════
alter table dare_votes enable row level security;

-- Voters can read their own vote
create policy "dare_votes_own_read"
  on dare_votes for select
  using (voter_id = auth.uid());

-- Aggregate vote counts are visible to all authenticated via the
-- public_dare_feed and active_court_public_state views.
-- Direct row reads are restricted to own rows only.

create policy "dare_votes_admin_all"
  on dare_votes for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- court_sessions
-- ════════════════════════════════════════════════════════════
alter table court_sessions enable row level security;

-- Dare participants can read their court session
create policy "court_sessions_participant_read"
  on court_sessions for select
  using (
    dare_id in (
      select id from dares
      where issuer_id = auth.uid() or challenger_id = auth.uid()
    )
  );

-- Spectators access court state through the active_court_public_state view
-- which does not require a direct policy on this table.

create policy "court_sessions_admin_all"
  on court_sessions for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- court_chat_messages
-- ════════════════════════════════════════════════════════════
alter table court_chat_messages enable row level security;

-- Visible messages for public dares are readable by all authenticated users
create policy "court_chat_messages_public_read"
  on court_chat_messages for select
  using (
    moderation_status = 'visible'
    and dare_id in (
      select id from dares
      where status in ('active','completed','settled')
    )
  );

-- Participants can read all (including hidden) messages for their dare
create policy "court_chat_messages_participant_read"
  on court_chat_messages for select
  using (
    dare_id in (
      select id from dares
      where issuer_id = auth.uid() or challenger_id = auth.uid()
    )
  );

create policy "court_chat_messages_admin_all"
  on court_chat_messages for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- quiz_questions
-- ════════════════════════════════════════════════════════════
alter table quiz_questions enable row level security;

-- No direct client read in MVP. Questions are served through API/RPC only.
-- Admins can manage the question bank.
create policy "quiz_questions_admin_all"
  on quiz_questions for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- dare_quiz_rounds
-- ════════════════════════════════════════════════════════════
alter table dare_quiz_rounds enable row level security;

-- Participants can read their dare's round assignments (not the question answers)
create policy "dare_quiz_rounds_participant_read"
  on dare_quiz_rounds for select
  using (
    dare_id in (
      select id from dares
      where issuer_id = auth.uid() or challenger_id = auth.uid()
    )
  );

create policy "dare_quiz_rounds_admin_all"
  on dare_quiz_rounds for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- dare_quiz_answers
-- ════════════════════════════════════════════════════════════
alter table dare_quiz_answers enable row level security;

-- Players can read their own answers
create policy "dare_quiz_answers_own_read"
  on dare_quiz_answers for select
  using (user_id = auth.uid());

create policy "dare_quiz_answers_admin_all"
  on dare_quiz_answers for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- evidence_objects
-- ════════════════════════════════════════════════════════════
alter table evidence_objects enable row level security;

-- Participants can read metadata for their own dare evidence
create policy "evidence_objects_participant_read"
  on evidence_objects for select
  using (
    dare_id in (
      select id from dares
      where issuer_id = auth.uid() or challenger_id = auth.uid()
    )
  );

-- Assigned jurors can read evidence metadata for their case
create policy "evidence_objects_juror_read"
  on evidence_objects for select
  using (
    dare_id in (
      select d.id from dares d
      join jury_cases jc on jc.dare_id = d.id
      join jury_assignments ja on ja.jury_case_id = jc.id
      where ja.juror_id = auth.uid()
        and ja.status in ('claimed','completed')
    )
  );

create policy "evidence_objects_admin_all"
  on evidence_objects for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- jury_cases
-- ════════════════════════════════════════════════════════════
alter table jury_cases enable row level security;

-- Participants can read status and verdict for their own DARE's case
create policy "jury_cases_participant_read"
  on jury_cases for select
  using (
    dare_id in (
      select id from dares
      where issuer_id = auth.uid() or challenger_id = auth.uid()
    )
  );

-- Assigned jurors can read the case packet for their assignment
create policy "jury_cases_juror_read"
  on jury_cases for select
  using (
    id in (
      select jury_case_id from jury_assignments
      where juror_id = auth.uid()
        and status in ('assigned','claimed','completed')
    )
  );

create policy "jury_cases_admin_all"
  on jury_cases for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- jury_assignments
-- ════════════════════════════════════════════════════════════
alter table jury_assignments enable row level security;

-- Jurors can read their own assignments
create policy "jury_assignments_own_read"
  on jury_assignments for select
  using (juror_id = auth.uid());

create policy "jury_assignments_admin_all"
  on jury_assignments for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- jury_votes
-- ════════════════════════════════════════════════════════════
alter table jury_votes enable row level security;

-- Jurors can read their own submitted vote
create policy "jury_votes_own_read"
  on jury_votes for select
  using (juror_id = auth.uid());

-- Participants can read the final verdict summary after case closes
-- (individual votes remain hidden; the verdict on jury_cases is the summary)
create policy "jury_votes_admin_all"
  on jury_votes for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- jury_flags
-- ════════════════════════════════════════════════════════════
alter table jury_flags enable row level security;

-- Flaggers can read their own flags
create policy "jury_flags_own_read"
  on jury_flags for select
  using (flagged_by = auth.uid());

create policy "jury_flags_admin_all"
  on jury_flags for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- audit_logs
-- ════════════════════════════════════════════════════════════
alter table audit_logs enable row level security;

-- No user read. Admins only.
create policy "audit_logs_admin_all"
  on audit_logs for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- risk_events
-- ════════════════════════════════════════════════════════════
alter table risk_events enable row level security;

create policy "risk_events_admin_all"
  on risk_events for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- user_devices
-- ════════════════════════════════════════════════════════════
alter table user_devices enable row level security;

-- Service role and admin only. No user-facing read.
create policy "user_devices_admin_all"
  on user_devices for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- kyc_verifications
-- ════════════════════════════════════════════════════════════
alter table kyc_verifications enable row level security;

-- Users can read their own KYC verification status
create policy "kyc_verifications_own_read"
  on kyc_verifications for select
  using (user_id = auth.uid());

create policy "kyc_verifications_admin_all"
  on kyc_verifications for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- moderation_reports
-- ════════════════════════════════════════════════════════════
alter table moderation_reports enable row level security;

-- Reporters can read their own reports
create policy "moderation_reports_own_read"
  on moderation_reports for select
  using (reporter_id = auth.uid());

create policy "moderation_reports_admin_all"
  on moderation_reports for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- trust_events
-- ════════════════════════════════════════════════════════════
alter table trust_events enable row level security;

-- Users can read their own trust history
create policy "trust_events_own_read"
  on trust_events for select
  using (user_id = auth.uid());

create policy "trust_events_admin_all"
  on trust_events for all
  using (private.is_admin());

-- ════════════════════════════════════════════════════════════
-- responsible_gaming_settings
-- ════════════════════════════════════════════════════════════
alter table responsible_gaming_settings enable row level security;

-- Users can read their own settings
create policy "responsible_gaming_own_read"
  on responsible_gaming_settings for select
  using (user_id = auth.uid());

-- Direct client updates are intentionally disabled. Limit changes,
-- cooling-off changes, and self-exclusion changes must go through server
-- functions so raises cannot bypass cooling-off and exclusions cannot be
-- removed client-side.

create policy "responsible_gaming_admin_all"
  on responsible_gaming_settings for all
  using (private.is_admin());
