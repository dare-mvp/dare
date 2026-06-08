# Server Actions And RPC Contracts

## Purpose

This document defines the server-authoritative action layer for the DARE MVP.

It sits between the mobile app and the database schema. The mobile app can request actions, but it must not directly mutate money, escrow, results, trust, disputes, or admin-owned state.

This contract is grounded in:

- `05-mvp-scope.md`
- `06-wallet-escrow-and-payments.md`
- `07-disputes-jury-and-trust.md`
- `08-security-risk-and-compliance.md`
- `10-technical-architecture-principles.md`
- `dare-database-schema.md`
- `supabase/migrations/`

## Current Platform Decision

For the first build, use Supabase as the backend platform:

- Supabase Auth for identity.
- Postgres for authoritative state.
- RLS for direct read protection.
- Edge Functions for authenticated HTTP actions and provider webhooks.
- Postgres functions for short, transactional state changes that must lock rows and write multiple tables atomically.

The mobile app calls Edge Functions for sensitive workflows. Edge Functions call Postgres functions using a service-role client when the workflow needs privileged writes.

Useful current primary references:

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase JavaScript RPC calls](https://supabase.com/docs/reference/javascript/rpc)
- [Supabase RLS performance guidance](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)

## Boundary Rules

1. The mobile app never sends a trusted balance, score, payout, fee, winner, trust score, or verdict.
2. Every money-moving action uses an idempotency key or unique provider reference.
3. Every action checks account status, risk status, KYC tier, limits, and role.
4. Every state transition validates the current state before writing the next state.
5. Every action that touches money, results, disputes, risk, or admin state writes `audit_logs`.
6. Provider webhooks must verify signatures before database mutation.
7. Direct table inserts/updates from the mobile client are limited to safe profile fields and notification read state.
8. Edge Functions must require a valid JWT unless they are provider webhooks with their own signature verification.
9. Service-role keys and payment secrets are stored only as Supabase secrets.
10. Errors returned to the app are typed and safe; internal provider details stay in logs and audit tables.

## Product Resolution Boundary

DARE is a creator-authored skill challenge platform. The backend must not treat the platform as the owner or generator of primary challenge content.

Every production DARE has two independent classifications:

- `dareType`: `skill` or `task`
- `resolutionType`: `answer_key`, `witnessed`, or `evidence`

`dareType = skill` uses two-sided stake escrow: issuer stake plus challenger stake.

`dareType = task` uses Darer-funded reward escrow: issuer/Darer funds the reward and the performer does not stake money.

The old platform-authored challenge path is legacy scaffolding. Production work follows [`16-dare-resolution-model.md`](16-dare-resolution-model.md):

- Answer Key: issuer-authored prompts/answers committed before Court.
- Witnessed: live audience/witness signals captured during Court.
- Evidence: proof capture/upload with jury/admin review.

Settlement must follow a server-authoritative confirmed result, answer-key verification, jury/admin verdict, or void/refund policy. The client never decides the winner.

Settlement behavior by DARE type:

- Skill-Based: winner receives the eligible escrow payout after fees; void/tie policy refunds according to the constitution.
- Task-Based: performer receives the eligible reward after valid completion; expiry, cancellation before acceptance, or void policy refunds the Darer according to the constitution.

## Implementation Shape

### Edge Function Layout

Initial function shape:

```text
supabase/functions/
  actions/
    index.ts
    deno.json
    _shared/
      auth.ts
      cors.ts
      errors.ts
      idempotency.ts
      response.ts
      supabase.ts
      validation.ts
```

Use one `actions` function with internal routing for MVP speed and shared middleware. Split into separate functions only when deployment, ownership, or scaling needs justify it.

Provider webhooks are separate functions:

```text
supabase/functions/
  paystack-webhook/
    index.ts
    deno.json
```

### Edge Function Responsibilities

Edge Functions handle:

- JWT validation and user lookup.
- Request parsing and schema validation.
- Rate limiting and idempotency checks.
- Provider API calls.
- Provider webhook signature verification.
- Calling transactional Postgres functions.
- Mapping internal errors to safe API responses.

### Postgres Function Responsibilities

Postgres functions handle:

- Row locks.
- State transition validation.
- Ledger inserts.
- Escrow inserts and updates.
- Settlement writes.
- Audit log writes.
- Notification inserts when coupled to a transaction.

Do not use `SECURITY DEFINER` casually. When required, keep functions outside exposed schemas, set an explicit `search_path`, revoke public execution, and grant only to `service_role` or tightly scoped roles.

## Standard Request Envelope

All authenticated action requests include:

```json
{
  "requestId": "uuid",
  "idempotencyKey": "client-generated-key",
  "payload": {}
}
```

Rules:

- `requestId` is for tracing and logs.
- `idempotencyKey` is required for money-moving or state-changing commands.
- The server stores idempotency results for commands that cannot be safely repeated.
- Replays with the same key and same body return the first result.
- Replays with the same key and different body return `IDEMPOTENCY_CONFLICT`.

## Standard Response Envelope

Success:

```json
{
  "ok": true,
  "data": {},
  "requestId": "uuid"
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Available balance is too low for this action.",
    "retryable": false
  },
  "requestId": "uuid"
}
```

## Error Codes

Use stable app-level codes:

| Code | Meaning | Retryable |
| --- | --- | --- |
| `UNAUTHENTICATED` | Missing or invalid session. | no |
| `FORBIDDEN` | User lacks permission. | no |
| `ACCOUNT_RESTRICTED` | Account status blocks the action. | no |
| `KYC_REQUIRED` | KYC tier is too low. | no |
| `LIMIT_EXCEEDED` | Stake, deposit, withdrawal, or velocity limit failed. | no |
| `INSUFFICIENT_FUNDS` | Available wallet balance is too low. | no |
| `INVALID_STATE` | Resource is not in the required state. | no |
| `IDEMPOTENCY_CONFLICT` | Key reused with different input. | no |
| `ALREADY_PROCESSED` | The action has already been completed. | no |
| `PROVIDER_UNAVAILABLE` | Payment provider failed or timed out. | yes |
| `VALIDATION_FAILED` | Input shape or field rule failed. | no |
| `RATE_LIMITED` | Too many requests. | yes |
| `INTERNAL_ERROR` | Unexpected server failure. | yes |

## Authenticated Action Routes

The mobile app calls these through the routed `actions` Edge Function. The route names below are the canonical path-based routes.

### `GET /me`

Purpose: return the authenticated profile, wallet summary, capability flags, and app configuration needed after login.

Reads:

- `profiles`
- `wallet_summary`
- `responsible_gaming_settings`
- latest risk/account flags

Returns:

- profile display fields
- trust/tier/KYC/account status
- wallet projection
- capability flags

No privileged write.

### `PATCH /profiles/me`

Purpose: update safe profile fields.

Allowed fields:

- username
- display name
- avatar URL or avatar metadata
- bio
- country
- city

Blocked fields:

- trust score
- tier
- KYC tier
- account status
- risk status
- admin flag
- wallet fields
- jury opt-in and jury categories (use `PATCH /profiles/me/jury`)

Username changes:

- allowed but throttled: one change per 30 days per user
- uniqueness check must run inside a transaction to prevent race conditions
- previous username recorded in `audit_logs` for support reference

Implementation: direct Supabase update can be acceptable because column grants already restrict updates, but keeping it behind the action layer gives one validation path for mobile.

### `PATCH /profiles/me/jury`

Purpose: opt in or out of the jury pool and set preferred jury categories.

Input:

```json
{
  "juryOptIn": true,
  "juryCategories": ["knowledge", "sports"]
}
```

Validation:

- authenticated active account
- KYC tier meets minimum jury participation threshold
- trust score meets minimum threshold (policy-defined floor)
- categories are from the active `dare_categories` list
- not currently excluded or suspended from jury duty

Writes:

- `profiles.jury_opt_in`, `profiles.jury_categories`
- `audit_logs`

Kept separate from `PATCH /profiles/me` because jury eligibility re-evaluation is a distinct gate-checked path, not a simple profile field write.

Implemented Edge action: `PATCH /profiles/me/jury`. It requires an authenticated profile, validates jury opt-in categories, enforces the MVP juror eligibility floor (`kyc1+`, `trust_score >= 500`, `completed_dares >= 10`, active account, normal risk), updates only jury participation fields, and writes an audit log.

### `PATCH /responsible-gaming/settings`

Purpose: update deposit limits, session length limit, or stake limits.

Input:

```json
{
  "dailyDepositLimitNgn": 500000,
  "weeklyDepositLimitNgn": 2000000,
  "monthlyDepositLimitNgn": 5000000,
  "sessionMaxMinutes": 120,
  "maxStakeNgn": 20000
}
```

Validation:

- authenticated active account
- new limits can only be lower than current limits immediately; increases require a 24-hour cooling-off delay before taking effect
- limits must be positive integers
- idempotency key

Transactional behavior:

- update `responsible_gaming_settings`
- record effective_at timestamp for limit increases (not immediate)
- write audit log

Implemented Edge action: `PATCH /responsible-gaming/settings`.

Implemented Postgres function: `public.update_responsible_gaming_settings_action(...)`, executable only by `service_role`. The action accepts NGN values for deposit/stake limits and converts them to kobo before the RPC. Lower or equal limits apply immediately. Higher limits are written to pending columns with `pending_limits_effective_at = now() + 24 hours`, and matured pending limits are applied before processing a new update. The route requires an idempotency key and writes `responsible_gaming.settings_updated` to `audit_logs`.

### `POST /responsible-gaming/self-exclude`

Purpose: activate a self-exclusion period.

Input:

```json
{
  "durationDays": 30,
  "reason": "optional user note"
}
```

Validation:

- authenticated user; restricted accounts can self-exclude
- duration within allowed range (minimum 1 day; maximum platform-defined)
- account not already self-excluded

Transactional behavior:

- update `responsible_gaming_settings.self_exclusion_until`
- set account status to reflect self-exclusion
- cancel any open DAREs or move to forfeit per policy
- write audit log
- send notification/email confirmation

Self-exclusion cannot be shortened by the user. Only an admin process can lift it early with documented justification.

Implemented Edge action: `POST /responsible-gaming/self-exclude`.

Implemented Postgres function: `public.self_exclude_action(...)`, executable only by `service_role`. It accepts a 1-365 day duration and optional reason, creates/locks the user's responsible gaming settings, rejects already-active self-exclusion, marks the account `limited`, disables jury opt-in, clears pending limit increases, cancels issuer open/targeted-pending DAREs with escrow refunds, declines targeted pending DAREs addressed to the user, applies the relevant Skill-Based or Task-Based forfeit/refund rule to accepted/ready/active/awaiting-result DAREs, writes notifications, and returns cleanup counts. The Edge action requires idempotency and writes `responsible_gaming.self_excluded` to `audit_logs`.

### `POST /wallet/deposits/init`

Purpose: initialize a deposit with the payment provider.

Input:

```json
{
  "amount": 500000,
  "currency": "NGN",
  "provider": "paystack"
}
```

Validation:

- authenticated active account
- minimum and maximum deposit
- currency support
- KYC tier and responsible gaming limits
- risk status
- idempotency key

Writes:

- `payment_transactions` with `initialized` or provider pending status
- `audit_logs`

External call:

- provider transaction initialization

Returns:

- provider checkout URL or authorization payload
- internal payment transaction id

Never credit wallet here.

### `POST /wallet/withdrawals`

Purpose: request a withdrawal.

Input:

```json
{
  "amount": 250000,
  "currency": "NGN",
  "destination": {
    "type": "bank_account",
    "bankCode": "058",
    "accountNumberToken": "tokenized-reference",
    "accountName": "Ada Lovelace"
  }
}
```

Validation:

- active account
- KYC tier
- available balance
- responsible gaming and velocity limits
- risk status
- destination token validity
- idempotency key

Transactional writes:

- `withdrawal_requests`
- `ledger_entries` with `withdrawal_pending`
- `notifications`
- `audit_logs`

Provider payout runs through an operations queue or a separate payout action, not directly from the mobile request.

### `POST /dares`

Purpose: create an open or targeted creator-authored DARE.

Input:

```json
{
  "title": "Answer 10 Nigerian fintech questions live",
  "category": "knowledge",
  "dareType": "skill",
  "resolutionType": "answer_key",
  "stakeAmount": 50000,
  "currency": "NGN",
  "durationSeconds": 600,
  "targetUsername": null,
  "constitution": {
    "test": "Issuer asks 10 live questions. Challenger wins with 7 or more correct answers.",
    "rules": "No external help. Each answer has 15 seconds. The issuer commits answers before Court.",
    "proofMethod": "Committed answer key plus Court recording and witness signals.",
    "edgeCases": "Tie or contested answer enters dispute review."
  }
}
```

Validation:

- active account
- KYC and risk checks
- age/responsible gaming eligibility
- `dareType` is `skill` or `task`
- category active
- stake limits
- available balance for issuer stake or Darer reward
- constitution field lengths
- target user eligibility when targeted
- idempotency key

Transactional writes:

- `dares`
- `dare_constitutions`
- issuer/Darer `escrow_holds`
- issuer `ledger_entries` with `escrow_hold`
- `audit_logs`
- targeted DARE `notifications` when a challenger is specified

Skill-Based create behavior:

- lock the issuer stake immediately
- calculate projected settlement payout from both expected stakes

Task-Based create behavior:

- lock the Darer reward immediately
- calculate performer reward payout from the funded reward
- store that no performer stake is required

Implemented Postgres function: `public.create_dare_action(...)`, executable only by `service_role`.

Implementation note: `resolutionType = answer_key` is the canonical value for creator-authored objective challenges. Answer Key creation stores issuer-authored prompt instructions and a committed answer key before Court starts; clients never receive the answer key.

### `POST /dares/{id}/accept`

Purpose: accept an open or targeted DARE.

Validation:

- active account
- DARE exists and is acceptable
- user is not issuer
- targeted DARE is addressed to user when applicable
- challenger/performer KYC/risk/limits
- challenger available balance for Skill-Based DAREs
- idempotency key

Transactional behavior:

- lock the DARE row
- re-check status under lock
- create challenger escrow hold and ledger entry for Skill-Based DAREs
- create no performer escrow hold for Task-Based DAREs
- update DARE challenger/status
- create `court_sessions`
- create notifications
- write audit log

Implemented Postgres function: `public.accept_dare_action(...)`, executable only by `service_role`.

### `POST /dares/{id}/cancel`

Purpose: cancel an open (not yet accepted) DARE and release issuer escrow.

Caller:

- issuer (before acceptance)
- admin repair action

Validation:

- DARE exists and status is `open`
- caller is issuer or admin
- no active dispute or hold blocking cancellation
- idempotency key

Transactional behavior:

- update DARE status to `cancelled`
- release issuer `escrow_holds`
- insert compensating `ledger_entries` to return escrowed funds
- create notification
- write audit log

Implemented Postgres function: `public.cancel_dare_action(...)`, executable only by `service_role`. It allows the issuer or an admin to cancel an open/targeted-pending DARE, inserts a compensating `escrow_release` ledger entry, marks the issuer escrow hold as refunded, moves the DARE to `cancelled`, sends a notification, writes an audit log, and is idempotent through the action envelope.

### `POST /dares/{id}/forfeit`

Purpose: record a voluntary forfeit by a participant during an active DARE.

Caller:

- participant (during active Court session)
- timer expiry handler (involuntary forfeit for missing required actions)

Validation:

- DARE is in `active` status
- caller is a participant (or is the system timer handler)
- no completed or pending settlement
- idempotency key

Transactional behavior:

- update DARE status to `forfeited`
- record forfeiting party
- call settlement path; Skill-Based forfeit pays the non-forfeiting participant, Task-Based forfeit refunds or pays according to the task constitution and whether valid completion evidence exists
- apply trust penalty for forfeiting participant
- create notifications
- write audit log

Implemented Postgres function: `public.forfeit_dare_action(...)`, executable only by `service_role`. It validates an active participant, marks the DARE as `forfeited`, sets the non-forfeiting participant as winner, moves the Court phase to `forfeited`, applies a `dare_forfeit` trust penalty, sends participant notifications, writes an audit log, and leaves escrow payout to `POST /dares/{id}/settle`, which now accepts forfeited DAREs.

### `POST /dares/{id}/ready`

Purpose: mark participant ready and start Court when all required participants are ready.

Validation:

- user is participant
- Court exists
- DARE is in ready state
- no active dispute/risk hold

Transactional behavior:

- update participant readiness
- when both ready, set server start time
- update court phase
- update DARE status to active
- create notification and realtime event records for participant-visible phase changes
- write audit log

The client displays countdown from server timestamps; the server timestamp is canonical.

Implemented Postgres function: `public.ready_dare_action(...)`, executable only by `service_role`. It marks the caller ready and starts the Court with server-owned timestamps. It does not assign platform-authored challenge rounds; Answer Key prompts come from creator-authored `dare_prompts`.

### `POST /dares/{id}/answers`

Purpose: submit an answer for a creator-authored Answer Key DARE.

Input:

```json
{
  "questionId": "uuid",
  "answerText": "Flutterwave"
}
```

Validation:

- user is participant
- Court is active
- prompt belongs to this DARE
- answer window is open
- answer not already submitted for this user/prompt
- answer key or review rule was committed before Court

Transactional behavior:

- normalize and hash the submitted answer
- compare against the committed answer key when exact matching is allowed
- insert append-only answer and Court event records
- update result counters/read model if used
- write audit log only for unusual or terminal events

Never trust a client-provided `isCorrect`, score, or response time.

### `POST /court/{dareId}/witness-votes`

Purpose: capture eligible audience/witness signals during or immediately after a live Court session.

Validation:

- authenticated eligible witness
- Court is active or within witness window
- witness is not a participant
- anti-sybil/device/risk checks
- one vote per eligible witness per DARE

Transactional behavior:

- insert immutable witness vote/event
- update witness tally read model if used
- include witness signal in dispute packet
- never settle money directly from an unaudited witness vote without policy checks

### `POST /court/{dareId}/result-claims`

Purpose: allow participants to submit or confirm the result after a live Court DARE.

Validation:

- caller is participant
- Court is completed or awaiting result
- claim shape matches resolution mode
- no already-final verdict or settlement

Transactional behavior:

- insert participant result claim
- if both participants agree, move to completed/dispute-window state
- if claims conflict, open dispute review
- write audit log

### `POST /dares/{id}/complete`

Purpose: complete a DARE after the server determines the Court has ended and a result path is available.

Caller:

- internal server action triggered by Supabase pg_cron job or Edge Function scheduled task
- last answer submission (when all rounds are complete and a winner can be determined immediately)
- admin repair action

Timer trigger: a `pg_cron` job runs every minute, selects DAREs where `court_sessions.started_at + dare.duration_seconds < now()` and status is `active`, and calls this action for each. This is the server-authoritative completion mechanism; clients never call this route directly.

Validation:

- DARE is active or awaiting result
- Court timer has ended, both participants confirmed, answer-key verification completed, or jury/admin verdict exists
- no existing terminal settlement

Transactional behavior:

- compute result from authoritative answer-key submissions, witnessed/evidence verdicts, jury/admin decision, or forfeit policy
- determine winner/tie/void/forfeit
- update `dares`
- update `court_sessions`
- set dispute deadline when policy requires a window
- call settlement immediately only for forfeits and no-dispute-window void/refund policy; otherwise wait for dispute-window expiry or jury/admin verdict
- write audit log

Implementation note: `public.complete_dare_action(...)` computes Answer Key outcomes from `dare_answer_submissions`, while witnessed and evidence paths complete through result claims, dispute review, jury/admin verdicts, or void/refund policy.

### `POST /dares/{id}/settle`

Purpose: settle a completed, forfeited, jury-closed, or voided DARE.

Caller:

- internal server action
- admin repair action
- jury verdict action

Validation:

- DARE is in a settleable state
- all escrow holds reconcile to expected amount
- settlement idempotency key or deterministic settlement key
- no previous successful settlement

Transactional behavior:

- update escrow hold statuses
- create ledger entries for payout, refund, platform fee, or forfeiture
- update DARE status to settled
- insert trust events
- update profile trust projection/counters
- create notifications
- write audit log

Settlement must be all-or-nothing.

Settlement must branch on `dareType`:

- `skill`: reconcile issuer and challenger escrow holds.
- `task`: reconcile only Darer reward escrow unless admin policy added a separate hold.

Implemented Postgres function: `public.settle_dare_action(...)`, executable only by `service_role`. It settles after the dispute window, releases escrow to the winner net of the platform fee or refunds tied matches, records payout/refund/platform-fee ledger entries, updates profile counters/trust events, and returns safely on already-settled DAREs.

### `POST /dares/{id}/disputes`

Purpose: file a dispute during the dispute window.

Input:

```json
{
  "reason": "score_issue",
  "summary": "My final answer was submitted before the timer ended.",
  "evidenceObjectIds": []
}
```

Validation:

- user is participant
- DARE status allows dispute
- dispute window is open
- no duplicate open case
- reason is allowed

Transactional behavior:

- create `jury_cases`
- link evidence if provided
- move DARE to dispute state
- update Court phase to `dispute`
- keep escrow held
- notify counterparty/admins
- write audit log

Implemented Postgres function: `public.file_dispute_action(...)`, executable only by `service_role`. It allows one active dispute per completed DARE during the dispute window, creates the `jury_cases` record, links at most one MVP evidence object for the filing side, moves the DARE/Court to dispute state, freezes escrow with `hold_reason = 'dispute_pending'`, increments the filer's dispute counter, notifies the counterparty, and writes an audit log through the Edge action.

### `POST /dares/{id}/evidence`

Purpose: request a pre-signed upload URL for evidence (screenshot, video clip, etc.).

Input:

```json
{
  "fileName": "screenshot.png",
  "mimeType": "image/png",
  "fileSizeBytes": 204800
}
```

Validation:

- user is a participant in the DARE
- DARE is in dispute or awaiting-dispute state
- mime type is on allowlist (image/png, image/jpeg, video/mp4, etc.)
- file size within limit (e.g. 10 MB)
- evidence count per participant per case is within limit

Writes:

- `evidence_objects` with `pending` status
- returns Supabase Storage pre-signed upload URL

The file is not linked to the jury case until the confirm step below.

Implemented Edge action: `POST /dares/{id}/evidence`.

Implemented Postgres function: `public.create_evidence_upload_action(...)`, executable only by `service_role`. It validates participant ownership, DARE state, allowed media types (`image/png`, `image/jpeg`, `video/mp4`), a 10 MB maximum file size, and a five-evidence-object per user/DARE cap. The action creates a `pending` evidence object in the private `dare-evidence` bucket path and returns a Supabase Storage signed upload URL. The Edge action requires idempotency and writes `evidence.upload_requested` to `audit_logs`.

### `POST /dares/{id}/evidence/confirm`

Purpose: confirm an evidence upload is complete and attach it to the jury case.

Input:

```json
{
  "evidenceObjectId": "uuid"
}
```

Validation:

- evidence object belongs to this user
- file exists in Storage (verify via Storage API)
- jury case is still open

Transactional behavior:

- update `evidence_objects` status to `uploaded`
- link to `jury_cases.evidence_a_id` or `evidence_b_id` based on participant role
- write audit log

Implemented Edge action: `POST /dares/{id}/evidence/confirm`.

Implemented Postgres function: `public.confirm_evidence_upload_action(...)`, executable only by `service_role`. The Edge action verifies the private Storage object exists before confirmation. The RPC validates participant ownership, evidence ownership, pending/uploaded evidence state, active jury case state, and one evidence slot per side. It marks the evidence object uploaded, optionally stores a content hash, attaches it to `evidence_a_id` for issuer-side evidence or `evidence_b_id` for challenger-side evidence, and writes `evidence.upload_confirmed` to `audit_logs`.

### `POST /jury-cases/{id}/votes`

Purpose: submit a juror vote.

Validation:

- user has active assignment
- case is open
- vote not already submitted
- rationale meets minimum length
- juror is not participant or conflicted

Transactional behavior:

- insert immutable `jury_votes`
- update `jury_assignments`
- check threshold/quorum
- update case verdict when threshold reached
- call settlement or escalation path
- write audit log

Implemented Postgres function: `public.cast_jury_vote_action(...)`, executable only by `service_role`. It validates an active juror assignment, inserts one immutable vote, marks the assignment completed, tallies votes once quorum is reached, escalates tied/escalation outcomes, or moves the case to `settlement_pending` and returns the DARE to the settlement path with the resolved winner.

### `POST /court/{dareId}/messages`

Purpose: send a Court chat message.

Validation:

- authenticated user
- user is participant or allowed spectator
- Court allows chat
- message length and content rules
- rate limit

Transactional behavior:

- insert `court_chat_messages`
- mark moderation status
- create risk/moderation event if flagged

### `POST /court/{dareId}/heartbeat`

Purpose: record that a participant is still active in Court, used for detecting abandonment or forced forfeit.

Validation:

- user is participant
- Court is active
- rate limited tightly (e.g. once every 10 seconds per user)

Writes:

- update Court participant presence columns or a dedicated presence event with `last_seen_at`
- no audit log required for normal heartbeats; log only on abandonment detection

Abandonment logic: if a participant's last heartbeat is older than the configured policy threshold, the timer handler marks that participant's round as `timed_out` and triggers the configured forfeit path.

Implemented Postgres function: `public.record_court_heartbeat_action(...)`, executable only by `service_role`. It validates an active participant/Court, enforces a 10-second per-player heartbeat limit, updates the participant heartbeat column and `reconnect_deadline`, and intentionally skips audit logs for normal presence pings.

### `PATCH /notifications/{id}/read`

Purpose: mark a single notification as read.

Validation:

- notification belongs to authenticated user

Writes:

- update `notifications.read_at`

Implemented Postgres function: `public.mark_notification_read_action(...)`, executable only by `service_role`. It validates ownership, sets `is_read = true`, preserves an existing `read_at`, and is exposed through `PATCH /notifications/{id}/read`.

### `POST /notifications/read-all`

Purpose: mark all unread notifications for the user as read.

Validation:

- authenticated user

Writes:

- bulk update `notifications.read_at` where `user_id = auth.uid()` and `read_at is null`

Implemented Postgres function: `public.mark_all_notifications_read_action(...)`, executable only by `service_role`. It marks all unread notifications for the authenticated user as read and returns the affected row count.

## Provider Webhook Routes

### `POST /webhooks/paystack`

Purpose: process Paystack events.

Auth:

- Do not require Supabase JWT.
- Require valid Paystack signature.
- Reject unsigned or invalid events before parsing business data.

Validation:

- event signature
- event type allowlist
- provider reference exists or can be matched
- amount/currency matches internal transaction
- provider status verified for every money-moving event

Transactional behavior:

- idempotently update `payment_transactions`
- insert `ledger_entries` only once for confirmed deposits
- update `withdrawal_requests` for provider payout status
- create notifications
- write audit log

Provider webhook handlers must be replay-safe.

## KYC Routes

Phase decision: the current KYC implementation is accepted for this phase as private document intake plus internal/manual review. The app can receive KYC documents, upload them to private Supabase Storage, store a redacted storage reference in `kyc_verifications`, return user status through the safe KYC status route, and let an admin approve or reject the submission. Automated third-party verification through Dojah, Prembly, Smile Identity, or another provider is deferred until the first-market provider is selected.

Deferred future work:

- third-party KYC API initiation and callback/webhook handling
- provider-specific liveness, BVN/NIN/passport checks, sanctions/PEP checks, and provider risk flags
- file magic-byte validation, malware scanning, and orphan-upload cleanup jobs

These deferred items must be revisited before treating KYC as fully automated identity verification. They are not blockers for the current phase, where the required capability is secure document receipt and storage for review.

### `POST /kyc/submit`

Purpose: submit a KYC verification request for internal/manual review.

Input:

```json
{
  "kycTierRequested": "kyc1",
  "documents": {
    "contract": "private_storage_v1",
    "documentType": "nin",
    "documentNumberLast4": "1234",
    "legalName": {
      "firstInitial": "A",
      "lastInitial": "O"
    },
    "documentImage": {
      "storageBucket": "kyc-documents",
      "storagePath": "<auth-user-id>/<upload-id>.jpg",
      "mimeType": "image/jpeg",
      "byteSize": 120000,
      "originalFileName": "identity.jpg"
    }
  }
}
```

Validation:

- authenticated active account
- requested tier is `kyc1`, `kyc2`, or `kyc3`
- documents payload follows `private_storage_v1` or future `provider_reference_v1`
- raw identity numbers, legal names, base64 images, and raw ID images must not be stored in the database
- private-storage payload references the authenticated user's own `kyc-documents` object path
- no duplicate pending submission for the same tier
- idempotency key

Returns:

- internal `kyc_verifications` record id
- `pending` status

Implemented Edge action: `POST /kyc/submit`.

Implemented Postgres function: `public.submit_kyc_action(...)`, executable only by `service_role`. It validates the account, tier, and document payload, prevents duplicate pending submissions for the same tier, creates a `kyc_verifications` row, and writes `kyc.verification_submitted` to `audit_logs`. Direct `anon` and `authenticated` table access to `kyc_verifications` is revoked; client status reads go through `GET /kyc/status`.

### `GET /kyc/status`

Purpose: return the current KYC verification status for the authenticated user.

Returns:

- current `kyc_tier`
- verification status and last updated date
- any pending submissions

Implemented Edge action: `GET /kyc/status`.

Implemented Postgres function: `public.get_latest_kyc_verification(...)`, executable only by `service_role`. It returns the authenticated user's latest KYC verification row or `null`.

### `POST /admin/kyc/{id}/decide`

Purpose: approve or reject a pending KYC verification.

Input:

```json
{
  "verdict": "approved",
  "kycTierGranted": "kyc1",
  "adminNote": "Document matched account details."
}
```

Validation:

- authenticated admin account
- KYC verification exists and is pending
- verdict is `approved` or `rejected`
- approved decisions include `kycTierGranted`
- granted tier is `kyc1`, `kyc2`, or `kyc3`
- idempotency key

Transactional behavior:

- update `kyc_verifications`
- upgrade `profiles.kyc_tier` only when the granted tier is higher than the current tier
- write admin audit log
- notify the user

Implemented Edge action: `POST /admin/kyc/{id}/decide`.

Implemented Postgres function: `public.decide_kyc_action(...)`, executable only by `service_role`. The Edge action and the RPC both enforce admin authority, decisions are idempotent at the action layer, and the database never downgrades a user's current KYC tier.

### `POST /webhooks/kyc-provider`

Purpose: receive verification result from the identity provider (structure depends on provider choice).

Auth:

- no Supabase JWT; verify provider signature or shared secret

Transactional behavior:

- update `kyc_verifications` status
- update `profiles.kyc_tier` when verified
- write audit log
- notify user

Provider webhooks are added only after the first KYC provider is chosen.

## Admin Routes

Admin routes require:

- authenticated user
- `profiles.is_admin = true`
- step-up auth before high-risk operations when available
- required reason string
- audit log on every action

Initial admin actions:

| Route | Purpose |
| --- | --- |
| `POST /admin/users/{id}/freeze` | Freeze or restrict a user. |
| `POST /admin/dares/{id}/freeze` | Freeze a DARE and escrow while reviewed. |
| `POST /admin/withdrawals/{id}/approve` | Approve withdrawal and trigger Paystack transfer API call; idempotent if transfer already initiated. |
| `POST /admin/withdrawals/{id}/reject` | Reject and reverse pending withdrawal. |
| `POST /admin/jury-cases/{id}/assign` | Assign eligible jurors to a filed dispute. |
| `POST /admin/jury-cases/{id}/resolve` | Manual dispute resolution. |
| `POST /admin/risk-events/{id}/review` | Mark risk event reviewed/escalated. |

Implemented Postgres function: `public.assign_jury_case_action(...)`, executable only by `service_role`. It requires an admin actor, selects eligible opted-in jurors outside the DARE participants, caps open assignments per juror, creates `jury_assignments`, sends `jury_invite` notifications, moves the case to `jury_voting`, and moves the DARE to `jury_open`.

Implemented Postgres function: `public.resolve_jury_case_admin_action(...)`, executable only by `service_role`. It requires an authenticated `profiles.is_admin = true` actor, records a manual verdict (`A`, `B`, `void`, `uphold`, or `overturn`), moves the jury case to `settlement_pending`, returns the DARE to `completed`, sets the resolved winner, expires the dispute window, writes an admin audit log through the Edge action, and leaves payout/refund execution to `POST /dares/{id}/settle`.

## Read Model Strategy

Direct Supabase reads are acceptable for:

- own profile
- wallet summary/projection
- public DARE feed
- own notifications
- own transaction history
- participant Court state
- assigned jury cases

The app does not directly write sensitive tables.

Before mobile implementation, define typed read queries for:

- `getHomeFeed`
- `getDareDetail`
- `getCourtState`
- `getWallet`
- `getTransactionHistory`
- `getNotifications`
- `getJuryAssignment`
- `getCategories` — reads active `dare_categories` rows; safe for public anon read

These start as Supabase direct reads protected by RLS. They move behind API endpoints only when a specific read model requires privileged joins or sensitive filtering.

## Realtime Events

Realtime events are delivery signals only.

Required MVP events:

| Event | Channel | Source |
| --- | --- | --- |
| `wallet_updated` | `user:{userId}` | server action/webhook |
| `dare_updated` | `user:{userId}` and feed | DARE action |
| `court_started` | `court:{dareId}` | ready action |
| `court_event_created` | `court:{dareId}` | answer/proof/witness action |
| `witness_vote_cast` | `court:{dareId}` | witness action |
| `court_completed` | `court:{dareId}` | complete action |
| `settlement_completed` | `user:{issuerId}` and `user:{challengerId}` | settlement action |
| `notification_created` | `user:{userId}` | any server action |
| `jury_assigned` | `user:{userId}` | dispute/jury action |

The client can optimistically animate local state, but it must reconcile to server state.

## Rate Limits

Minimum MVP limits:

| Action | Limit |
| --- | --- |
| create DARE | 5 per user per minute; 20 per user per day |
| accept DARE | 10 per user per minute |
| answer submission | 1 per user per prompt (unique); 30 per user per minute burst |
| witness vote | 1 per eligible witness per DARE |
| Court chat | 20 messages per user per Court per minute |
| deposit init | 5 per user per hour; 10 per user per day |
| withdrawal request | 3 per user per day |
| dispute filing | 3 per user per day |
| jury vote | 1 per assignment (enforced by uniqueness constraint) |
| KYC session init | 3 per user per 24 hours |
| self-exclusion | 1 per user per session (no undo) |

Implementation uses the Postgres-backed limiter for MVP. High-risk money actions keep database checks even if an external limiter is added later.

Implemented Postgres-backed limiter: `public.consume_action_rate_limit(...)` stores per-user action counters in `action_rate_limits`. The action handler enforces the MVP limits for DARE creation, DARE acceptance, answer submission, deposit init, withdrawal requests, dispute filing, and KYC submission before dispatching the mutation route. Heartbeat keeps its tighter RPC-level limiter.

## Observability And Audit

Every action logs:

- request id
- authenticated user id when available
- action name
- target type and id
- success/failure
- safe failure code
- latency
- provider reference when applicable
- idempotency key hash, not the raw key if sensitive

Never log:

- service-role key
- payment secret
- full bank account number
- raw provider signature secret
- access token
- refresh token

## Test Requirements

Before mobile depends on these actions, write tests for:

- DARE creation with insufficient funds.
- DARE creation with enough funds creates one escrow hold and one ledger entry.
- Duplicate create request with same idempotency key returns same result.
- Accept locks DARE and prevents two challengers.
- Ready-up starts only when both participants are ready.
- Answer-key verification ignores client-provided correctness.
- Witness voting enforces one eligible vote per user/device policy.
- Settlement reconciles total escrow to payout/refund/fee entries.
- Settlement cannot run twice.
- Paystack webhook replay does not double-credit.
- Withdrawal request lowers available balance through pending ledger entry.
- User cannot request withdrawal above available balance.
- Dispute filing holds settlement.
- Jury vote is immutable and one per assignment.
- Admin freeze writes audit log.

## Build Order

Status: items 1 through 20 are implemented under `supabase/functions/`.

- Item 1: shared envelope, error, response, CORS, idempotency, and validation utilities plus Deno tests.
- Item 2: `GET /me` and `PATCH /profiles/me` routes using an authenticated, RLS-scoped Supabase client. Profile updates accept only safe display/profile fields.
- Item 3: `POST /wallet/deposits/init` initializes a real Paystack transaction from the configured secret key without crediting the wallet. `paystack-webhook` verifies `x-paystack-signature`, confirms matching successful charges, and writes one `deposit_confirmed` ledger entry per provider reference.
- Item 4: `POST /wallet/withdrawals` queues a pending withdrawal through `request_withdrawal`, an atomic service-role RPC that locks the wallet account, checks withdrawable balance, inserts `withdrawal_pending` ledger state, and creates the operational queue row. `withdrawal-processor` claims pending requests through `claim_paystack_withdrawals`, creates Paystack transfer recipients, and initiates Paystack transfers. Paystack transfer webhooks process `transfer.success`, `transfer.failed`, and `transfer.reversed` for queued provider payouts; pending balance projections only reserve withdrawals whose request status is still `pending` or `processing`.
- Item 5: `POST /dares` and `POST /dares/{id}/accept` are backed by service-role RPCs that atomically create DARE rows, constitutions, escrow holds, posted `escrow_hold` ledger entries, and the initial `ready_check` Court session on acceptance.
- Item 6: `POST /dares/{id}/ready` marks participant readiness and moves the Court/DARE to `active` with server timestamps. Answer Key prompts are creator-authored records, not platform-assigned rounds.
- Item 7: `POST /dares/{id}/answers` submits creator-authored Answer Key responses and scores them against committed answer-key records; witnessed/evidence paths use result-claim and review events.
- Item 8: `POST /dares/{id}/complete` computes answer-key/witness/evidence result completion from authoritative records. `POST /dares/{id}/settle` reconciles escrow after the dispute window with idempotent payout/refund ledger entries.
- Item 9: `POST /dares/{id}/disputes` files a dispute and freezes settlement; `POST /admin/jury-cases/{id}/resolve` records an admin verdict and returns the DARE to the normal settlement path.
- Item 10: `POST /admin/jury-cases/{id}/assign` assigns eligible jurors while excluding participants and colluding device clusters, and `POST /jury-cases/{id}/votes` records DB-immutable juror votes, tallies quorum, and returns resolved verdicts to the settlement path.
- Item 11: `PATCH /profiles/me/jury` lets eligible users opt into the jury pool and set preferred jury categories through the action layer.
- Item 12: `POST /dares/{id}/cancel` cancels open or targeted-pending DAREs and refunds the issuer escrow with a compensating ledger entry.
- Item 13: `POST /dares/{id}/forfeit` records active-match forfeits, applies trust events, and settles escrow according to the DARE type and constitution.
- Item 14: `POST /court/{dareId}/heartbeat` records active participant presence with server-side rate limiting and reconnect deadline updates.
- Item 15: `PATCH /notifications/{id}/read` and `POST /notifications/read-all` update notification read state through ownership-checked RPCs.
- Item 16: `PATCH /responsible-gaming/settings` applies stricter user limits immediately and stages limit increases behind a 24-hour effective timestamp.
- Item 17: `POST /responsible-gaming/self-exclude` activates self-exclusion, limits the account, cancels open issuer DAREs with refunds, and applies the relevant Skill-Based or Task-Based forfeit/refund rule to active participant DAREs.
- Item 18: `POST /dares/{id}/evidence` creates signed upload targets and `POST /dares/{id}/evidence/confirm` attaches uploaded evidence to the active jury case.
- Item 19: `POST /kyc/submit`, `GET /kyc/status`, and `POST /admin/kyc/{id}/decide` implement the internal/manual KYC review flow.
- Item 20: `pg_cron` maintenance jobs are explicitly rescheduled by migration and can be verified with `verify_required_cron_jobs()`. They purge expired idempotency/rate-limit records, expire active Court sessions, forfeit stale heartbeat sessions, expire no-quorum jury cases, and auto-settle completed/forfeited DAREs after the dispute window or jury verdict.

1. Create shared action envelope, error types, and validation utilities.
2. Implement `GET /me` and profile update.
3. Implement wallet deposit initialization through Paystack and webhook-backed wallet crediting.
4. Implement withdrawal request queue, Paystack transfer execution, and transfer webhook reconciliation.
5. Implement `create_dare` and `accept_dare` transactional functions.
6. Implement Court ready-up and creator-authored resolution setup.
7. Implement answer-key, witness, evidence, and result-claim event submission.
8. Implement completion and settlement.
9. Implement dispute filing and manual admin resolution.
10. Implement jury assignment/voting after manual dispute path is stable.
11. Implement jury profile opt-in and category preferences.
12. Implement open DARE cancellation and issuer escrow refund.
13. Implement active DARE forfeit with immediate settlement.
14. Implement active Court heartbeat.
15. Implement notification read state actions.
16. Implement responsible gaming limit settings with delayed increases.
17. Implement responsible gaming self-exclusion.
18. Implement evidence upload request and confirmation.
19. Implement KYC submit/status/admin decision flow.
20. Implement maintenance and settlement cron jobs.

## Fixed Decisions

1. MVP actions use one routed Edge Function named `actions`. Provider webhooks remain separate functions.
2. Settlement waits for the configured dispute window except forfeits, no-dispute-window void/refund policy, or final jury/admin verdict.
3. Paystack is the implemented NGN payment provider for deposits and withdrawals.
4. Withdrawals require admin approval before payout processor claim.
5. `public_dare_feed` is the current mobile feed read model; a dedicated profile-card read model is added only if a measured query or privacy issue requires it.
