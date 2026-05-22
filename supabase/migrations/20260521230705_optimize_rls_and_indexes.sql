-- ============================================================
-- optimize_rls_and_indexes.sql
-- Performance cleanup after the initial remote deployment.
--
-- Goals:
--   1. Add covering indexes for foreign keys reported by advisors.
--   2. Avoid per-row auth.uid() evaluation in RLS policies.
--   3. Collapse overlapping permissive SELECT policies.
--
-- Privileged writes remain server-owned through service_role / Edge
-- Functions. Authenticated admin users keep broad read visibility, but
-- app clients should not mutate sensitive server-owned tables directly.
-- ============================================================

-- FK coverage surfaced by Supabase performance advisors.
create index if not exists dare_quiz_answers_user_id_idx
  on public.dare_quiz_answers (user_id);

create index if not exists dare_quiz_rounds_question_id_idx
  on public.dare_quiz_rounds (question_id);

create index if not exists dares_constitution_id_idx
  on public.dares (constitution_id)
  where constitution_id is not null;

create index if not exists escrow_holds_held_ledger_entry_id_idx
  on public.escrow_holds (held_ledger_entry_id)
  where held_ledger_entry_id is not null;

create index if not exists escrow_holds_release_ledger_entry_id_idx
  on public.escrow_holds (release_ledger_entry_id)
  where release_ledger_entry_id is not null;

create index if not exists jury_cases_evidence_a_id_idx
  on public.jury_cases (evidence_a_id)
  where evidence_a_id is not null;

create index if not exists jury_cases_evidence_b_id_idx
  on public.jury_cases (evidence_b_id)
  where evidence_b_id is not null;

create index if not exists jury_flags_flagged_by_idx
  on public.jury_flags (flagged_by);

create index if not exists jury_flags_reviewed_by_idx
  on public.jury_flags (reviewed_by)
  where reviewed_by is not null;

create index if not exists kyc_verifications_reviewer_user_id_idx
  on public.kyc_verifications (reviewer_user_id)
  where reviewer_user_id is not null;

create index if not exists moderation_reports_reviewer_id_idx
  on public.moderation_reports (reviewer_id)
  where reviewer_id is not null;

create index if not exists risk_events_reviewed_by_user_id_idx
  on public.risk_events (reviewed_by_user_id)
  where reviewed_by_user_id is not null;

create index if not exists withdrawal_requests_ledger_entry_id_idx
  on public.withdrawal_requests (ledger_entry_id)
  where ledger_entry_id is not null;

create index if not exists withdrawal_requests_wallet_account_id_idx
  on public.withdrawal_requests (wallet_account_id);

-- Keep the SECURITY DEFINER helper non-public and make auth.uid() an
-- initPlan value instead of a per-row function call.
create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = (select auth.uid())),
    false
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated, service_role;

-- dare_categories: public-safe reference data.
alter policy "dare_categories_any_read"
  on public.dare_categories
  to anon, authenticated
  using (active = true);

-- profiles
drop policy if exists "profiles_admin_all" on public.profiles;
alter policy "profiles_own_read"
  on public.profiles
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
alter policy "profiles_own_update"
  on public.profiles
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- notifications
alter policy "notifications_own_read"
  on public.notifications
  to authenticated
  using (user_id = (select auth.uid()));
alter policy "notifications_own_update"
  on public.notifications
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- wallet_accounts
drop policy if exists "wallet_accounts_admin_all" on public.wallet_accounts;
alter policy "wallet_accounts_own_read"
  on public.wallet_accounts
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- payment_transactions
drop policy if exists "payment_transactions_admin_all" on public.payment_transactions;
alter policy "payment_transactions_own_read"
  on public.payment_transactions
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- ledger_entries
drop policy if exists "ledger_entries_admin_all" on public.ledger_entries;
alter policy "ledger_entries_own_read"
  on public.ledger_entries
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- withdrawal_requests
drop policy if exists "withdrawal_requests_admin_all" on public.withdrawal_requests;
alter policy "withdrawal_requests_own_read"
  on public.withdrawal_requests
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- dares
drop policy if exists "dares_public_read" on public.dares;
drop policy if exists "dares_participant_read" on public.dares;
drop policy if exists "dares_admin_all" on public.dares;
create policy "dares_read"
  on public.dares
  for select
  to authenticated
  using (
    status in ('open','active','completed','settled')
    or issuer_id = (select auth.uid())
    or challenger_id = (select auth.uid())
    or (select private.is_admin())
  );

-- dare_constitutions
drop policy if exists "dare_constitutions_public_read" on public.dare_constitutions;
drop policy if exists "dare_constitutions_admin_all" on public.dare_constitutions;
create policy "dare_constitutions_read"
  on public.dare_constitutions
  for select
  to authenticated
  using (
    (select private.is_admin())
    or dare_id in (
      select id from public.dares
      where status in ('open','active','completed','settled')
        or issuer_id = (select auth.uid())
        or challenger_id = (select auth.uid())
    )
  );

-- escrow_holds
drop policy if exists "escrow_holds_own_read" on public.escrow_holds;
drop policy if exists "escrow_holds_participant_read" on public.escrow_holds;
drop policy if exists "escrow_holds_admin_all" on public.escrow_holds;
create policy "escrow_holds_read"
  on public.escrow_holds
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
    or dare_id in (
      select id from public.dares
      where issuer_id = (select auth.uid())
         or challenger_id = (select auth.uid())
    )
  );

-- dare_votes
drop policy if exists "dare_votes_admin_all" on public.dare_votes;
alter policy "dare_votes_own_read"
  on public.dare_votes
  to authenticated
  using (voter_id = (select auth.uid()) or (select private.is_admin()));

-- court_sessions
drop policy if exists "court_sessions_participant_read" on public.court_sessions;
drop policy if exists "court_sessions_admin_all" on public.court_sessions;
create policy "court_sessions_read"
  on public.court_sessions
  for select
  to authenticated
  using (
    (select private.is_admin())
    or dare_id in (
      select id from public.dares
      where issuer_id = (select auth.uid())
         or challenger_id = (select auth.uid())
    )
  );

-- court_chat_messages
drop policy if exists "court_chat_messages_public_read" on public.court_chat_messages;
drop policy if exists "court_chat_messages_participant_read" on public.court_chat_messages;
drop policy if exists "court_chat_messages_admin_all" on public.court_chat_messages;
create policy "court_chat_messages_read"
  on public.court_chat_messages
  for select
  to authenticated
  using (
    (select private.is_admin())
    or (
      moderation_status = 'visible'
      and dare_id in (
        select id from public.dares
        where status in ('active','completed','settled')
      )
    )
    or dare_id in (
      select id from public.dares
      where issuer_id = (select auth.uid())
         or challenger_id = (select auth.uid())
    )
  );

-- quiz_questions
alter policy "quiz_questions_admin_all"
  on public.quiz_questions
  to authenticated
  using ((select private.is_admin()));

-- dare_quiz_rounds
drop policy if exists "dare_quiz_rounds_participant_read" on public.dare_quiz_rounds;
drop policy if exists "dare_quiz_rounds_admin_all" on public.dare_quiz_rounds;
create policy "dare_quiz_rounds_read"
  on public.dare_quiz_rounds
  for select
  to authenticated
  using (
    (select private.is_admin())
    or dare_id in (
      select id from public.dares
      where issuer_id = (select auth.uid())
         or challenger_id = (select auth.uid())
    )
  );

-- dare_quiz_answers
drop policy if exists "dare_quiz_answers_admin_all" on public.dare_quiz_answers;
alter policy "dare_quiz_answers_own_read"
  on public.dare_quiz_answers
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- evidence_objects
drop policy if exists "evidence_objects_participant_read" on public.evidence_objects;
drop policy if exists "evidence_objects_juror_read" on public.evidence_objects;
drop policy if exists "evidence_objects_admin_all" on public.evidence_objects;
create policy "evidence_objects_read"
  on public.evidence_objects
  for select
  to authenticated
  using (
    (select private.is_admin())
    or dare_id in (
      select id from public.dares
      where issuer_id = (select auth.uid())
         or challenger_id = (select auth.uid())
    )
    or dare_id in (
      select d.id
      from public.dares d
      join public.jury_cases jc on jc.dare_id = d.id
      join public.jury_assignments ja on ja.jury_case_id = jc.id
      where ja.juror_id = (select auth.uid())
        and ja.status in ('claimed','completed')
    )
  );

-- jury_cases
drop policy if exists "jury_cases_participant_read" on public.jury_cases;
drop policy if exists "jury_cases_juror_read" on public.jury_cases;
drop policy if exists "jury_cases_admin_all" on public.jury_cases;
create policy "jury_cases_read"
  on public.jury_cases
  for select
  to authenticated
  using (
    (select private.is_admin())
    or dare_id in (
      select id from public.dares
      where issuer_id = (select auth.uid())
         or challenger_id = (select auth.uid())
    )
    or id in (
      select jury_case_id from public.jury_assignments
      where juror_id = (select auth.uid())
        and status in ('assigned','claimed','completed')
    )
  );

-- jury_assignments
drop policy if exists "jury_assignments_admin_all" on public.jury_assignments;
alter policy "jury_assignments_own_read"
  on public.jury_assignments
  to authenticated
  using (juror_id = (select auth.uid()) or (select private.is_admin()));

-- jury_votes
drop policy if exists "jury_votes_admin_all" on public.jury_votes;
alter policy "jury_votes_own_read"
  on public.jury_votes
  to authenticated
  using (juror_id = (select auth.uid()) or (select private.is_admin()));

-- jury_flags
drop policy if exists "jury_flags_admin_all" on public.jury_flags;
alter policy "jury_flags_own_read"
  on public.jury_flags
  to authenticated
  using (flagged_by = (select auth.uid()) or (select private.is_admin()));

-- Admin-only operational tables.
alter policy "audit_logs_admin_all"
  on public.audit_logs
  to authenticated
  using ((select private.is_admin()));
alter policy "risk_events_admin_all"
  on public.risk_events
  to authenticated
  using ((select private.is_admin()));
alter policy "user_devices_admin_all"
  on public.user_devices
  to authenticated
  using ((select private.is_admin()));

-- kyc_verifications
drop policy if exists "kyc_verifications_admin_all" on public.kyc_verifications;
alter policy "kyc_verifications_own_read"
  on public.kyc_verifications
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- moderation_reports
drop policy if exists "moderation_reports_admin_all" on public.moderation_reports;
alter policy "moderation_reports_own_read"
  on public.moderation_reports
  to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));

-- trust_events
drop policy if exists "trust_events_admin_all" on public.trust_events;
alter policy "trust_events_own_read"
  on public.trust_events
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- responsible_gaming_settings
drop policy if exists "responsible_gaming_admin_all" on public.responsible_gaming_settings;
alter policy "responsible_gaming_own_read"
  on public.responsible_gaming_settings
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
