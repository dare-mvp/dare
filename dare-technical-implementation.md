# DARE Technical Implementation Plan

## Purpose

This document translates the DARE product, market, wallet, trust, and mobile app documentation into an implementation plan for the real mobile application and backend.

It is not a direct port of the prototype. The existing `index.html` is useful as a product reference, but the production system must be rebuilt around typed domain models, server-authoritative state transitions, append-only financial records, and testable service boundaries.

## Source Documents

This plan is grounded in:

- `docs/01-product-brief.md`
- `docs/02-market-and-positioning.md`
- `docs/03-user-roles-and-journeys.md`
- `docs/04-core-domain-model.md`
- `docs/05-mvp-scope.md`
- `docs/06-wallet-escrow-and-payments.md`
- `docs/07-disputes-jury-and-trust.md`
- `docs/08-security-risk-and-compliance.md`
- `docs/09-mobile-app-information-architecture.md`
- `docs/10-technical-architecture-principles.md`
- `docs/11-server-actions-and-rpc-contracts.md`
- `index.html` prototype
- `dare-master-strategy.md`
- `deep-research-report.md`

## Non-Negotiable Engineering Constraints

1. The mobile client is untrusted.
2. Money movement is never client-authoritative.
3. DARE outcomes are never client-authoritative.
4. Trust score is never directly mutated by the client.
5. DARE lifecycle must be modeled as explicit state transitions.
6. Wallet ledger must be append-only.
7. Payment webhooks must be verified and idempotent.
8. Evidence media must be private by default.
9. Admin actions must be audit-logged.
10. Core business logic must have automated tests before launch.

## MVP Technical Scope

The first production MVP implements creator-authored Court DAREs. The old platform-authored challenge path is legacy scaffolding and is not the production product direction. See `docs/16-dare-resolution-model.md`.

Included:

- Auth and profile
- Age gate and KYC status fields
- Wallet account
- Deposit initialization and verified crediting
- Withdrawal request queue
- Append-only ledger
- DARE creation
- DARE acceptance
- Escrow holds
- Court ready-up
- Server-authoritative match start
- creator-authored answer-key, witness, evidence, and result-claim flows
- Settlement
- Notifications
- Dispute filing
- Admin review foundation
- Risk flags and audit logs

Excluded from MVP:

- Physical DAREs
- High-risk physical evidence formats
- Unsupported handshake-only outcomes with real stakes
- Tournaments
- Replicate DARE
- USSD gateway
- AI voice-to-DARE
- Predictive matchmaking
- Creator monetization
- Multi-country launch

## Recommended System Architecture

```text
apps/
  mobile/
    React Native or Expo mobile app
  admin/
    secure internal admin console

packages/
  domain/
    shared TypeScript domain types, enums, schemas
  api-client/
    generated or typed API client
  ui/
    shared UI primitives, if using a monorepo
  config/
    lint, TypeScript, test config

services/
  api/
    application API and business actions
  workers/
    reconciliation, notifications, risk jobs

supabase/
  migrations/
  seed/
  policies/

docs/
  product and architecture documentation
```

The repository starts with `apps/mobile`, `apps/admin`, `packages/domain`, and `supabase/migrations` boundaries. It does not begin as another single-app prototype.

## Stack Recommendation

### Mobile App

Preferred: React Native with Expo.

Reasons:

- Fast iteration for mobile MVP.
- Good camera/media support for Evidence DAREs.
- Strong TypeScript ecosystem.
- Easier OTA/update workflows for beta.

Risks:

- Evidence capture, device attestation, and background behavior use Expo APIs for MVP; native modules are introduced only when an approved capture, attestation, or background requirement cannot be met by Expo.
- Realtime Court performance must be profiled on low-end Android devices.

### Backend

Preferred first implementation:

- Postgres/Supabase for data, auth, RLS, realtime, and storage.
- Server-side API layer for sensitive actions.
- Supabase Edge Functions or a dedicated Node/Nest/Fastify API service.

Decision rule:

- Use Supabase direct reads for low-risk query surfaces where RLS is strong.
- Use server actions/API endpoints for all sensitive mutations.

Sensitive operations that must be API-only:

- Create DARE with escrow hold
- Accept DARE with escrow hold
- Ready/start Court
- Submit answer
- Complete DARE
- Settle payout
- File dispute
- Upload/confirm dispute evidence
- Cast jury vote
- Initialize deposit
- Verify payment webhook
- Request withdrawal
- Update responsible gaming limits
- Activate self-exclusion
- Admin action

### Database

Postgres with committed migrations.

Requirements:

- No manual schema drift.
- Every table with `created_at`.
- Sensitive tables with RLS policies.
- Immutable ledger tables protected from normal update/delete.
- Check constraints for enum-like fields.
- Unique constraints for idempotency.

### Realtime

Supabase Realtime or equivalent.

Realtime is only a delivery layer. It broadcasts server-approved events and presence. It does not decide scores, balances, readiness, winners, or payouts.

### Payments

Provider abstraction with Paystack first only if approved.

Provider adapter interface:

```ts
interface PaymentProvider {
  initializeDeposit(input: InitializeDepositInput): Promise<InitializeDepositResult>;
  verifyTransaction(reference: string): Promise<VerifiedPayment>;
  createTransferRecipient(input: TransferRecipientInput): Promise<TransferRecipientResult>;
  initiateTransfer(input: TransferInput): Promise<TransferResult>;
  verifyWebhook(input: WebhookVerificationInput): Promise<WebhookEvent>;
}
```

Provider-specific details must not leak into wallet domain logic.

## Domain Modules

### Auth Module

Responsibilities:

- User session validation
- User identity lookup
- Account status checks
- Admin role checks

Out of scope:

- Wallet authorization decisions
- DARE lifecycle decisions

### Profile Module

Responsibilities:

- Public profile
- Username/display name validation
- Avatar metadata
- Trust/tier read model
- KYC status display

Sensitive fields such as risk status and KYC details are not exposed in public profile payloads.

### Wallet Module

Responsibilities:

- Wallet account creation
- Ledger writes
- Balance projections
- Escrow holds
- Escrow release
- Withdrawal requests
- Reconciliation hooks

The wallet module is the only module that writes financial ledger entries.

### Payments Module

Responsibilities:

- Deposit initialization
- Webhook verification
- Provider transaction verification
- Provider reference idempotency
- Withdrawal provider execution

The payments module talks to the wallet module after verification. It does not directly mutate balances.

### DARE Module

Responsibilities:

- DARE creation
- DARE acceptance
- DARE state transitions
- Constitution binding
- Stake and eligibility validation
- Expiration and cancellation

The DARE module calls wallet for escrow holds/releases. It must not write ledger entries directly.

### Court Module

Responsibilities:

- Ready-up
- Server-authoritative start time
- Heartbeats
- Live challenge session
- Answer/proof/result event submission
- Answer-key or witness/evidence result calculation
- Completion decision
- Forfeit handling

Court uses the DARE module for lifecycle transitions and the wallet module for final settlement.

### Jury Module

Responsibilities:

- Dispute case creation
- Juror eligibility
- Juror assignment
- Blind evidence packet construction
- Jury vote recording
- Verdict calculation
- Escalation

### Evidence Module

Responsibilities:

- Signed upload/session generation
- Evidence metadata
- Content hash
- Private signed access URLs
- Evidence access logs

Evidence and witness metadata are core to trustworthy creator-authored Court resolution and are designed before production Court branching.

### Notification Module

Responsibilities:

- Event-to-notification mapping
- In-app inbox
- Push notification dispatch
- Mark read

### Risk Module

Responsibilities:

- Velocity checks
- Collusion signals
- Device/IP relationship signals
- Stake and withdrawal holds
- Risk event creation
- Admin review queue

MVP risk can start as rules and audit logs. ML-based risk is later.

### Admin Module

Responsibilities:

- Dispute review
- User risk review
- Ledger inspection
- Freeze/unfreeze controls
- Manual settlement escalation
- Audit trail

## Database Schema Direction

The initial Supabase migration set now exists in `supabase/migrations/`. Treat the SQL migrations as the executable schema and this section as the conceptual table map for engineers.

The physical migrations extend the original core map with launch-critical support tables and views: `dare_categories`, `dare_votes`, legacy `dare_quiz_rounds`, `wallet_summary`, `withdrawal_requests`, `trust_events`, `responsible_gaming_settings`, `user_devices`, `kyc_verifications`, `moderation_reports`, and `jury_flags`. Server functions/RPCs remain the required enforcement layer for sensitive writes.

### users

Supabase Auth is the production auth provider. The auth user lives in `auth.users`; app-specific user state lives in `profiles` and supporting tables.

### profiles

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  username text unique not null,
  display_name text,
  avatar_url text,
  country text,
  city text,
  trust_score integer not null default 0,
  tier text not null default 'newcomer',
  wins integer not null default 0,
  losses integer not null default 0,
  disputes integer not null default 0,
  completed_dares integer not null default 0,
  kyc_tier text not null default 'kyc0',
  account_status text not null default 'active',
  risk_status text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### dares

```sql
create table dares (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references profiles(id),
  challenger_id uuid references profiles(id),
  title text not null,
  description text,
  category text not null,
  dare_type text not null,
  funding_model text not null,
  resolution_type text not null,
  status text not null,
  stake_amount integer not null,
  reward_amount integer,
  currency text not null default 'NGN',
  platform_fee integer not null default 0,
  winner_payout integer not null default 0,
  duration_seconds integer not null,
  winner_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  settled_at timestamptz,
  expires_at timestamptz
);
```

Recommended constraints:

- `stake_amount > 0`
- `reward_amount is null or reward_amount > 0`
- `dare_type in ('skill','task')`
- `funding_model in ('two_sided_stake','darer_reward')`
- `dare_type` and `funding_model` must match: `skill/two_sided_stake` or `task/darer_reward`
- `duration_seconds between 30 and 3600`
- `resolution_type in ('answer_key','witnessed','evidence')`
- `status in (...)`
- `winner_id` must be issuer or challenger when settled, unless voided.
- Task-Based DAREs use `reward_amount` as the Darer-funded escrow amount and do not require challenger escrow on accept.

### dare_constitutions

```sql
create table dare_constitutions (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id),
  version integer not null default 1,
  test text not null,
  rules text not null,
  proof_method text,
  edge_cases text,
  accepted_by_issuer_at timestamptz,
  accepted_by_challenger_at timestamptz,
  created_at timestamptz not null default now(),
  unique (dare_id, version)
);
```

### court_sessions

```sql
create table court_sessions (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null unique references dares(id),
  phase text not null default 'waiting',
  player_a_ready boolean not null default false,
  player_b_ready boolean not null default false,
  server_start_time timestamptz,
  server_end_time timestamptz,
  player_a_heartbeat_at timestamptz,
  player_b_heartbeat_at timestamptz,
  reconnect_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### quiz_questions

Legacy prototype table for platform-authored challenge questions. Do not expand this as the production MVP direction. Production work moves to creator-authored prompts, answer-key commitments, Court events, witness signals, and evidence packets.

```sql
create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  prompt text not null,
  options jsonb not null,
  correct_option integer not null,
  difficulty text not null default 'normal',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
```

### dare_quiz_answers

Legacy prototype table for platform-authored answers. Do not expand this as the production MVP direction; production answer-key resolution stores creator-authored commitments and participant submissions through the Court/result model.

```sql
create table dare_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id),
  user_id uuid not null references profiles(id),
  question_id uuid not null references quiz_questions(id),
  selected_option integer not null,
  correct boolean not null,
  response_ms integer,
  created_at timestamptz not null default now(),
  unique (dare_id, user_id, question_id)
);
```

### wallet_accounts

```sql
create table wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id),
  currency text not null default 'NGN',
  status text not null default 'active',
  created_at timestamptz not null default now()
);
```

### ledger_entries

```sql
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references wallet_accounts(id),
  dare_id uuid references dares(id),
  payment_transaction_id uuid,
  type text not null,
  direction text not null,
  amount integer not null,
  currency text not null default 'NGN',
  status text not null default 'posted',
  idempotency_key text unique,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

Recommended constraints:

- `amount > 0`
- `direction in ('credit','debit')`
- No updates or deletes except by privileged maintenance role.

### payment_transactions

```sql
create table payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  provider text not null,
  provider_reference text not null,
  type text not null,
  amount integer not null,
  currency text not null default 'NGN',
  status text not null,
  raw_provider_payload jsonb,
  initialized_at timestamptz not null default now(),
  verified_at timestamptz,
  unique (provider, provider_reference)
);
```

### escrow_holds

```sql
create table escrow_holds (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id),
  user_id uuid not null references profiles(id),
  amount integer not null,
  currency text not null default 'NGN',
  status text not null default 'held',
  held_at timestamptz not null default now(),
  released_at timestamptz,
  unique (dare_id, user_id)
);
```

### jury_cases

```sql
create table jury_cases (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id),
  opened_by_user_id uuid not null references profiles(id),
  status text not null default 'filed',
  reason text not null,
  votes_needed integer not null default 3,
  verdict text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  escalated_at timestamptz
);
```

### jury_assignments

```sql
create table jury_assignments (
  id uuid primary key default gen_random_uuid(),
  jury_case_id uuid not null references jury_cases(id),
  juror_id uuid not null references profiles(id),
  status text not null default 'assigned',
  blind_side_mapping jsonb not null default '{}',
  assigned_at timestamptz not null default now(),
  claimed_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  unique (jury_case_id, juror_id)
);
```

### jury_votes

```sql
create table jury_votes (
  id uuid primary key default gen_random_uuid(),
  jury_case_id uuid not null references jury_cases(id),
  juror_id uuid not null references profiles(id),
  vote text not null,
  rationale text not null,
  created_at timestamptz not null default now(),
  unique (jury_case_id, juror_id)
);
```

### notifications

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  type text not null,
  title text not null,
  body text not null,
  action jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
```

### audit_logs

```sql
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references profiles(id),
  actor_type text not null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

### risk_events

```sql
create table risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  dare_id uuid references dares(id),
  type text not null,
  severity text not null,
  status text not null default 'open',
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
```

## API Contract Direction

Use action endpoints for sensitive workflows. The canonical action/RPC contract now lives in `docs/11-server-actions-and-rpc-contracts.md`; the examples below remain a high-level summary.

For the first implementation, prefer Supabase Edge Functions for authenticated HTTP actions and provider webhooks, with private Postgres functions for transactional state changes that need row locks, ledger writes, escrow writes, and audit logs.

### Auth / Profile

#### `GET /me`

Returns the authenticated user's app profile and capability flags.

Response:

```json
{
  "user": {
    "id": "uuid",
    "username": "ada",
    "displayName": "Ada",
    "trustScore": 120,
    "tier": "newcomer",
    "kycTier": "kyc1",
    "accountStatus": "active"
  },
  "capabilities": {
    "canCreateDare": true,
    "canAcceptDare": true,
    "canWithdraw": true,
    "canJury": false
  }
}
```

#### `PATCH /profiles/me`

Updates non-sensitive profile fields.

Sensitive fields blocked:

- trust_score
- tier
- kyc_tier
- account_status
- risk_status
- wallet fields

### Wallet

#### `GET /wallet`

Returns wallet projection.

```json
{
  "currency": "NGN",
  "available": 250000,
  "escrowed": 100000,
  "pending": 0,
  "held": 0,
  "limits": {
    "maxStakePerDare": 100000,
    "dailyDepositRemaining": 500000
  }
}
```

#### `POST /wallet/deposits/init`

Input:

```json
{
  "amount": 500000,
  "currency": "NGN",
  "provider": "paystack"
}
```

Server behavior:

1. Validate amount and limits.
2. Create payment transaction.
3. Initialize provider transaction.
4. Return provider checkout payload.

#### `POST /webhooks/paystack`

Server behavior:

1. Verify signature.
2. Parse event.
3. Verify transaction with provider where required.
4. Enforce idempotency by provider reference.
5. Credit ledger only after verified success.
6. Emit notification and wallet update event.

### DARE

#### `POST /dares`

Input:

```json
{
  "title": "Answer 10 Nigerian fintech questions live",
  "category": "knowledge",
  "dareType": "skill",
  "resolutionType": "answer_key",
  "durationSeconds": 600,
  "stakeAmount": 50000,
  "currency": "NGN",
  "constitution": {
    "test": "Issuer asks 10 live questions. Challenger wins with 7 or more correct answers.",
    "rules": "Answers must be typed before the timer ends.",
    "proofMethod": "Committed answer key",
    "edgeCases": "Tie refunds both Skill-Based participants with no platform fee."
  },
  "targetUsername": null
}
```

Server behavior:

1. Validate auth and account status.
2. Validate KYC and stake limits.
3. Validate challenge fields.
4. Calculate fee and payout.
5. Create DARE.
6. Create immutable constitution.
7. Hold issuer stake or Darer reward in escrow.
8. Return DARE detail.

#### `POST /dares/{id}/accept`

Server behavior:

1. Lock DARE row or use serializable transaction.
2. Confirm status is open or targeted to user.
3. Confirm user is not issuer.
4. Confirm wallet availability for Skill-Based DAREs.
5. Hold challenger stake for Skill-Based DAREs; hold no performer stake for Task-Based DAREs.
6. Update DARE to accepted/ready_check.
7. Create Court session.
8. Notify issuer.

#### `POST /dares/{id}/ready`

Server behavior:

1. Confirm user is participant.
2. Mark player ready.
3. If all required participants are ready, set server start time.
4. Broadcast `court_started`.

#### `POST /dares/{id}/answers`

Legacy implementation note: this shape still reflects the old platform-authored quiz path. Production answer submission must use creator-authored answer-key, witness, evidence, and result-claim events.

Input:

```json
{
  "questionId": "uuid",
  "selectedOption": 2,
  "responseMs": 3400
}
```

Server behavior:

1. Confirm active Court session.
2. Confirm user is participant.
3. Confirm answer is within time.
4. Score answer.
5. Store answer once.
6. Broadcast score update.

#### `POST /dares/{id}/complete`

Server-only or privileged internal endpoint.

Server behavior:

1. Confirm match ended.
2. Compute winner.
3. Write DARE completed status.
4. Set dispute deadline or settle immediately, depending on policy.
5. If settling, call wallet settlement.

### Disputes / Jury

#### `POST /dares/{id}/disputes`

Server behavior:

1. Confirm user is participant.
2. Confirm dispute window.
3. Confirm DARE status allows dispute.
4. Create jury case.
5. Move DARE to dispute_pending or jury_open.
6. Hold escrow.
7. Notify the counterparty and admins/jurors.

#### `POST /admin/jury-cases/{id}/resolve`

Server behavior:

1. Confirm actor is an admin.
2. Confirm jury case is still unresolved.
3. Record manual verdict and admin rationale.
4. Move jury case to settlement pending.
5. Return DARE to completed state with resolved winner or void outcome.
6. Expire dispute window so the settlement endpoint can release or refund escrow.

#### `POST /admin/jury-cases/{id}/assign`

Server behavior:

1. Confirm actor is an admin.
2. Confirm case is filed or already in assignment/voting state.
3. Select eligible opted-in jurors outside the DARE participants.
4. Create assignments with deadlines and blind side mapping.
5. Notify assigned jurors.
6. Move case to jury voting and DARE to jury open.

#### `POST /jury-cases/{id}/votes`

Server behavior:

1. Confirm juror assignment.
2. Confirm case open.
3. Confirm rationale present.
4. Store immutable vote.
5. If vote threshold reached, calculate verdict.
6. Trigger settlement workflow.

## State Machines

### DARE State Machine

```text
draft
  -> open
  -> targeted_pending

open
  -> accepted
  -> expired
  -> cancelled

targeted_pending
  -> accepted
  -> open
  -> declined
  -> expired

Cancellation of `open` and `targeted_pending` DAREs is implemented through `POST /dares/{id}/cancel`, which writes a compensating escrow-release ledger entry and refunds the issuer hold.

accepted
  -> ready_check
  -> cancelled

ready_check
  -> active
  -> forfeited

active
  -> awaiting_result
  -> forfeited

Active-match forfeits are implemented through `POST /dares/{id}/forfeit`. The action records the forfeiting participant, applies a trust penalty, and leaves escrow release to the settlement endpoint. Skill-Based forfeits can award the non-forfeiting participant; Task-Based forfeits refund or pay according to the task constitution and available completion evidence.

awaiting_result
  -> completed
  -> dispute_pending

completed
  -> settled
  -> dispute_pending

dispute_pending
  -> jury_open
  -> voided

jury_open
  -> jury_closed
  -> escalated

jury_closed
  -> settled

forfeited
  -> settled

voided
  -> settled
```

### Wallet Entry Lifecycle

```text
pending -> posted -> reversed
pending -> failed
```

Ledger entries are created as `posted` only after the domain action is confirmed. Provider-facing payment records carry longer pending states.

### Payment Transaction Lifecycle

```text
initialized
  -> provider_pending
  -> verified_success
  -> verified_failed
  -> expired
  -> reversed
```

### Court Phase Lifecycle

```text
waiting
  -> ready_check
  -> countdown
  -> active
  -> awaiting_result
  -> completed
  -> disputed
  -> forfeited
```

## Realtime Channels

### `court:{dareId}`

Events:

- `court_started`
- `timer_sync`
- `score_update`
- `question_revealed`
- `answer_recorded`
- `chat_message`
- `state_transition`
- `court_completed`

### `presence:court:{dareId}`

Presence:

- participant online status
- spectator count
- reconnect state

Presence is informational. The server still owns heartbeats and forfeits.

Active Court heartbeat is implemented through `POST /court/{dareId}/heartbeat`. It updates participant heartbeat columns and a reconnect deadline under server-side participant, Court phase, and rate-limit checks.

Responsible gaming limit settings are implemented through `PATCH /responsible-gaming/settings`. Stricter limits apply immediately. Limit increases are stored as pending values with a 24-hour effective timestamp and are only promoted by server-side logic, keeping the mobile client out of limit enforcement decisions.

Self-exclusion is implemented through `POST /responsible-gaming/self-exclude`. It marks the responsible gaming settings as excluded, limits the account, disables jury opt-in, cancels open issuer DAREs with escrow refunds, and applies the relevant Skill-Based or Task-Based forfeit/refund rule to active participant DAREs so settlement can follow the standard escrow path.

Dispute evidence is implemented through `POST /dares/{id}/evidence` and `POST /dares/{id}/evidence/confirm`. The request action creates a pending evidence object and signed private Storage upload URL. The confirm action marks the evidence uploaded and attaches it to the issuer or challenger side of the active jury case.

KYC review is implemented through `POST /kyc/submit`, `GET /kyc/status`, and `POST /admin/kyc/{id}/decide`. The current flow supports internal/manual review and preserves provider optionality; raw identity documents stay with the chosen KYC provider or private storage, not in Postgres JSON.

Scheduled backend maintenance is implemented with `pg_cron` for expired idempotency cleanup, active Court expiry, and automatic settlement of completed DAREs after the dispute window closes.

### `user:{userId}`

Events:

- `notification_created`
- `wallet_updated`
- `dare_updated`
- `jury_assigned`
- `risk_hold_created`

## Mobile App Implementation

### Feature Modules

```text
src/
  app/
    navigation/
    providers/
  features/
    auth/
    feed/
    create-dare/
    court/
    wallet/
    profile/
    notifications/
    jury/
  shared/
    api/
    domain/
    ui/
    storage/
    telemetry/
    validation/
```

### Navigation

Primary tabs:

- Feed
- Create
- Court
- Wallet
- Profile

Secondary:

- Notifications
- Jury
- Settings
- Support

Admin is a separate app or locked-down admin web console, not a consumer tab.

### Client State Management

Use server state tooling for remote data and a small local state layer for UI state.

Recommended split:

- Remote/server state: TanStack Query or equivalent.
- Local UI state: Zustand, Redux Toolkit, or React context for small scopes.
- Form state: React Hook Form plus schema validation.

Do not keep canonical DARE, wallet, or score state only in local memory.

### Offline Strategy

Allowed offline/local persistence:

- Draft DARE forms
- Last known profile
- Last known feed cache with stale indicator
- DARE constitution after acceptance

Not allowed offline:

- Wallet success
- Escrow state mutation
- DARE acceptance
- Score submission after deadline without server validation
- Settlement

### Court Reconnect

Court screen must handle:

- reconnecting
- server time resync
- heartbeat failure
- grace period warning
- forfeit confirmation if server marks forfeit

## Security Implementation Requirements

### RLS / Authorization

RLS policies enforce:

- Users can read their own wallet records.
- Users cannot update ledger entries.
- Users can read DAREs that are public or involve them.
- Participants can read their Court session.
- Jurors can read only assigned jury cases.
- Admin tables require admin role.

Sensitive writes go through functions/API, not client table updates.

### Rate Limits

Rate limit:

- login attempts
- DARE creation
- DARE acceptance
- answer submission
- chat messages
- dispute filing
- jury voting
- deposit initialization
- withdrawal requests

### Audit Logging

Audit:

- admin actions
- wallet adjustments
- escrow release
- DARE settlement
- dispute verdicts
- account freezes
- payout retries
- webhook processing anomalies

### Secrets

Never ship:

- payment secret keys
- service role keys
- admin tokens
- storage signing secrets

Mobile app contains public anon keys only. RLS/policies protect reads, and all sensitive mutations go through server actions.

## Testing Strategy

### Unit Tests

Required:

- fee calculation
- tier calculation
- DARE state transition rules
- wallet balance projection
- ledger entry construction
- webhook idempotency logic
- trust score changes
- juror eligibility
- dispute window validation

### Integration Tests

Required:

- create DARE with escrow
- accept DARE with escrow
- insufficient balance
- double accept race
- answer submission
- completion and settlement
- dispute creates jury case and freezes settlement
- webhook credits wallet once
- withdrawal request creates pending ledger entry

### Database Tests

Required:

- RLS policies
- constraints
- unique idempotency keys
- no update/delete on ledger by normal role
- participant visibility
- juror visibility

### End-To-End Tests

MVP flows:

1. Register -> deposit -> create DARE.
2. Second user accepts -> both ready -> answer -> result -> settlement.
3. User files dispute -> admin reviews.
4. Payment webhook duplicate does not double-credit.
5. User loses connection during Court and reconnects.

## Observability

### Metrics

- deposit initialization count
- deposit success rate
- webhook verification failures
- ledger imbalance count
- DARE creation rate
- DARE acceptance rate
- open-to-accepted time
- court reconnect count
- settlement duration
- dispute rate
- admin action count
- risk hold count

### Logs

Structured logs include:

- request id
- user id when available
- DARE id when available
- wallet account id when available
- payment provider reference when available
- state transition from/to
- error code

### Alerts

Alert on:

- ledger imbalance
- webhook failures above threshold
- duplicate provider reference attempts
- payout failure spike
- settlement job failures
- high dispute spike
- suspicious repeated matchup spike

## Implementation Phases

### Phase 0: Compliance And Architecture Readiness

Deliverables:

- final jurisdiction decision
- payment provider approval path
- KYC/AML operating assumptions
- database migration framework
- monorepo scaffold
- CI baseline
- lint/test/format setup

Exit criteria:

- sensitive money flows are approved at the architecture level
- no code paths planned for client-side settlement

### Phase 1: Domain, Database, And Auth

Deliverables:

- domain package
- enums and validation schemas
- auth integration
- profiles
- wallet accounts
- initial RLS
- audit logs

Exit criteria:

- user can register and read own profile/wallet projection
- tests cover auth/profile/wallet visibility

### Phase 2: Wallet And Payments Sandbox

Deliverables:

- payment provider abstraction
- deposit init
- webhook verification
- ledger credit
- wallet projection
- withdrawal request queue
- reconciliation job skeleton

Exit criteria:

- duplicate webhook cannot double credit
- ledger projection tests pass

### Phase 3: DARE Create And Accept

Deliverables:

- DARE schema
- constitution schema
- create endpoint
- accept endpoint
- escrow hold
- feed read model
- notifications

Exit criteria:

- users can create and accept Skill-Based and Task-Based DAREs in sandbox with the correct escrow holds
- double acceptance race is tested

### Phase 4: Court And Creator-Authored Resolution

Deliverables:

- Court session
- ready-up endpoint
- server start time
- creator-authored prompt/answer-key setup where applicable
- witness/evidence/result-claim endpoints
- server-authoritative result path
- result calculation
- realtime Court updates

Exit criteria:

- MVP DARE can complete end-to-end without manual DB edits
- server computes winner

### Phase 5: Settlement

Deliverables:

- escrow release
- payout ledger
- platform fee ledger
- trust score updates
- result notification
- settlement audit logs

Exit criteria:

- settlement is idempotent
- ledger remains balanced
- result cannot be forged from client

### Phase 6: Dispute And Admin Foundation

Deliverables:

- dispute filing
- jury case creation
- escrow hold during dispute
- admin dispute queue
- admin case detail
- manual verdict/settlement path with audit log

Exit criteria:

- disputed DARE cannot settle accidentally
- admin action is auditable

### Phase 7: Closed Beta Hardening

Deliverables:

- rate limits
- risk events
- support runbooks
- production monitoring
- error budgets
- privacy and terms screens
- responsible play controls

Exit criteria:

- launch gates in `docs/05-mvp-scope.md` and `docs/08-security-risk-and-compliance.md` are satisfied

## Prototype Migration Map

### Keep

- DARE Feed concept
- five-step constitution builder
- Court concept
- timer and ready-up concept
- stake preview
- wallet transparency
- result overlay concept
- jury room concept
- notification concept
- admin risk view concept

### Replace

- inline `onclick` handlers with typed mobile components
- browser direct Supabase writes with API actions
- mutable client balance updates with ledger projection
- client-side payout settlement with server settlement
- client-side result calculation with server-authoritative verification
- `innerHTML` rendering with typed UI components
- monolithic global state with feature modules

## Engineering Definition Of Done

A feature is not done until:

- domain types are updated
- API contract is documented
- migration is committed if schema changes
- RLS/authorization is implemented when data is sensitive
- unit tests cover core logic
- integration tests cover critical path
- telemetry is emitted
- error states are handled
- mobile UI handles loading, empty, failure, and retry states
- security review checklist passes for sensitive workflows

## Open Technical Decisions

1. Supabase Edge Functions vs dedicated API service.
2. Expo managed workflow vs bare React Native.
3. Payment provider for first approved launch.
4. Initial KYC vendor and identity flow.
5. Issuer/Darer escrow locks at DARE creation for both funding models; challenger escrow locks on accept only for Skill-Based DAREs.
6. Whether MVP settlement waits for a dispute window or settles instantly with reversible hold.
7. Admin console stack.
8. Realtime provider and fallback behavior.
9. Evidence storage provider and media-retention policy for production Evidence DAREs.
10. Exact trust score formula.

## Recommended Immediate Next Steps

1. Decide stack shape: Expo + Supabase Edge Functions, or Expo + dedicated API.
2. Draft actual SQL migrations for Phase 1 and Phase 2.
3. Define TypeScript domain enums and schemas.
4. Build wallet ledger tests before wallet UI.
5. Build DARE state machine tests before DARE UI.
6. Create admin console requirements before real-money beta.
