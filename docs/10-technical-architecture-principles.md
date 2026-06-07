# Technical Architecture Principles

## Architecture Goal

Build the mobile app and backend as a secure, testable product system rather than a direct port of the single-file prototype.

## Core Principles

### 1. Server Authority

The server owns:

- Wallet balances
- Escrow holds
- DARE state transitions
- Match start and end times
- Results
- Payouts
- Trust score
- Jury eligibility
- Admin actions

The mobile app requests actions and renders responses.

### 2. Typed Domain Model

Use TypeScript types or generated API types for:

- DARE
- Constitution
- Court session
- Wallet ledger
- Payment transaction
- Jury case
- Evidence
- Notification
- Risk event

Avoid anonymous loosely shaped objects in core flows.

### 3. Modular Boundaries

Recommended backend modules:

- auth
- profiles
- dares
- court
- wallet
- payments
- jury
- evidence
- notifications
- risk
- admin

Recommended mobile modules:

- features/auth
- features/feed
- features/create-dare
- features/court
- features/wallet
- features/profile
- features/jury
- features/notifications
- shared/ui
- shared/api
- shared/domain

### 4. State Machines Over Flags

DARE lifecycle, Court lifecycle, payment lifecycle, and dispute lifecycle should be explicit state machines.

Avoid scattered boolean flags such as `is_live`, `is_ready`, `is_disputed` without a canonical state.

### 5. Append-Only Financial Records

Financial systems should use immutable ledger entries and reconciliation. Direct balance mutation can exist as a cached projection, not the source of truth.

### 6. Idempotency Everywhere Money Moves

Every payment and payout operation needs an idempotency key or unique provider reference.

Examples:

- Deposit webhook
- Withdrawal retry
- Escrow release
- Payout retry
- Manual adjustment

### 7. Private Evidence By Default

Evidence media should be stored in private buckets. Access should be granted through short-lived signed URLs and logged.

### 8. Realtime Is A Delivery Mechanism

Realtime channels should not become the authority for business logic. They broadcast server-approved events.

Examples:

- score_update
- vote_tally
- court_started
- court_ended
- wallet_updated
- jury_case_assigned

### 9. Risk And Compliance Are Product Requirements

KYC, AML, age gating, limits, responsible play controls, and audit logs should be included in product architecture, not added after launch.

### 10. Test Core Logic First

Core test coverage must include:

- DARE state transitions
- Escrow creation and release
- Fee calculation
- Payment webhook verification
- Idempotency
- Jury assignment
- Verdict settlement
- Trust score updates
- Permission checks

### 11. Directional UX Design

DARE's primary markets (Nigeria, Kenya) are mobile-first populations who **act before reading**. The UI must never rely on users reading text to know what to do. Every screen must have one clear, prominent action that moves the user forward.

Architecture requirements:

- Every success state must define a next action — auto-scroll, redirect, or button reveal.
- Every error state must include a recovery action, not just a message.
- Deep links must be resolved server-side and embedded in buttons, not shown as copyable text.
- Share/action flows must pre-fill content — the user should never need to compose, copy, or remember anything.
- Server actions must return next-step context alongside success/error states.

See [`docs/13-directional-ux-principles.md`](13-directional-ux-principles.md) for the full principle specification.

## Recommended Stack Direction

The final stack decision is still open, but the prototype points toward:

- Mobile: React Native / Expo or native app, depending on performance and camera needs.
- Backend: Supabase plus server functions, or a dedicated API service with Supabase/Postgres.
- Database: Postgres with migrations committed.
- Realtime: Supabase Realtime or equivalent broadcast/presence layer.
- Storage: private object storage for evidence.
- Payments: provider abstraction layer with Paystack first if approved.

## Repository Expectations

The rebuild repo should include:

- `apps/mobile`
- `apps/admin` or `apps/web`
- `packages/domain`
- `packages/api-client`
- `packages/ui`
- `supabase/migrations` or database migrations
- `docs`
- test suites
- CI
- linting and formatting
- security checks

## API Surface Principles

APIs should be action-oriented for sensitive workflows.

Examples:

- `POST /dares`
- `POST /dares/{id}/accept`
- `POST /dares/{id}/ready`
- `POST /dares/{id}/answers`
- `POST /dares/{id}/disputes`
- `POST /jury-cases/{id}/votes`
- `POST /wallet/deposits/init`
- `POST /wallet/withdrawals`
- `POST /webhooks/paystack`

Avoid letting the client directly update sensitive database rows.

## Observability

Required logs and metrics:

- Payment webhook latency
- Ledger imbalance
- DARE state transition failures
- Court reconnects
- Evidence upload failures
- Jury assignment completion
- Dispute resolution time
- Fraud flag counts
- Admin actions

## Migration From Prototype

Keep:

- Product flows
- Terminology
- Constitution concept
- Court concept
- Jury concept
- Wallet transparency
- Trust score direction

Do not keep:

- Single-file architecture
- Inline event handlers
- Client-side wallet updates
- Client-side outcome settlement
- Direct browser control over sensitive DB writes
- `innerHTML`-heavy rendering patterns

