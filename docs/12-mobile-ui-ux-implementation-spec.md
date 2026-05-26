# Mobile UI/UX Implementation Spec

## Purpose

This document converts `UI_UX Research for Gamified P2P App.md` into a buildable mobile UI/UX plan for the first DARE mobile app.

The research document remains the product inspiration layer. This spec is the implementation layer: it defines what to build first, which screens exist, how they behave, which backend contracts they call, and which research ideas are deferred.

## Product Principle

DARE is a high-trust challenge economy. The mobile UI must make three things obvious at all times:

1. What action the user is taking.
2. What money or trust state changes when they take it.
3. What the server has confirmed versus what is still pending.

The app must never imply that a deposit, withdrawal, escrow lock, winner, payout, verdict, or trust change is complete until the backend confirms it.

## MVP Scope From The Research

### Build Now

- Mobile-first app shell with bottom tabs.
- Authentication, age gate, profile setup, and KYC status.
- Wallet with deposit, withdrawal request, balances, escrow, pending withdrawals, and transaction history.
- Feed for open and live DAREs.
- Create Algorithmic DARE flow.
- Accept DARE flow with escrow and fee transparency.
- Court ready-up, countdown, quiz play, heartbeat/reconnect, result, and settlement status.
- Notifications.
- Responsible gaming limits, cooling-off, and self-exclusion.
- Dispute filing and evidence upload.
- Juror assignment view and vote flow for assigned jurors.
- Empty, loading, error, offline, and restricted-account states.

### Defer Until After MVP

- Production USSD gateway.
- Physical DAREs and what3words challenge boundaries.
- Copy betting / replicate wager economy.
- Spectator prediction-market mechanics.
- Token-staked jury selection.
- Full public spectator economy.
- Multi-country localization.
- Admin console inside the consumer app.

## Information Architecture

Primary tabs:

1. Feed
2. Create
3. Court
4. Wallet
5. Profile

Secondary surfaces:

- Notifications
- DARE detail
- Accept confirmation
- KYC
- Responsible gaming
- Dispute filing
- Evidence upload
- Jury
- Settings
- Support

Admin and risk operations should remain outside the consumer app for MVP.

## Visual System

### Design Direction

The visual language should feel like a regulated fintech product with competitive game energy, not like a generic betting site.

Use:

- Dark-first interface.
- High contrast content surfaces.
- Clear money-state treatment.
- Compact but readable mobile layouts.
- Distinct status colors for pending, locked, won, lost, disputed, restricted, and settled.
- Motion only where it explains state, such as escrow lock, countdown, confirmation, or reconnect.

Avoid:

- Purple-gradient default app styling.
- Decorative cards that do not carry product state.
- Overly playful casino-like treatment.
- Hidden fees or vague wallet language.
- Confetti or celebratory motion on pending money events.

### Token Requirements

Define tokens before screen implementation:

- Colors: background, surface, elevated surface, border, primary action, danger, warning, success, info, muted text, money positive, money negative, escrow locked.
- Type: page title, section title, body, caption, numeric display, button label.
- Spacing: 4, 8, 12, 16, 20, 24, 32.
- Radius: default 8px max for cards and controls unless platform convention requires otherwise.
- Touch targets: minimum 44px.
- Motion: fast 120ms, standard 180ms, slow 300ms, with reduced-motion support.

### Core Components

Build these as reusable components before feature screens hard-code their own UI:

- `AppShell`
- `BottomTabs`
- `TopBar`
- `StatusBadge`
- `MoneyAmount`
- `EscrowBreakdown`
- `TrustBadge`
- `KycTierBadge`
- `ActionButton`
- `IconButton`
- `SegmentedControl`
- `FilterChip`
- `TextField`
- `AmountInput`
- `Stepper`
- `ProgressSteps`
- `CountdownTimer`
- `ConnectionBanner`
- `EmptyState`
- `ErrorState`
- `InlineAlert`
- `ConfirmSheet`
- `ReceiptSheet`
- `TransactionRow`
- `DareCard`
- `DareConstitutionSummary`
- `EvidenceUploader`
- `JuryEvidencePacket`

Every reusable component must support loading, disabled, error, and accessibility label states where applicable.

## Global App States

The app must handle these states consistently:

- `loading`: show skeletons for feed/wallet/profile and blocking loaders for irreversible actions.
- `refreshing`: allow existing data to remain visible while refetching.
- `offline`: show stale-data timestamp; disable money-moving actions.
- `server_error`: show typed error message and retry action where safe.
- `unauthenticated`: route to auth.
- `restricted`: show account restriction reason and support path.
- `kyc_required`: show required tier and action.
- `rate_limited`: show retry guidance.
- `idempotency_replay`: show the original receipt/result.
- `provider_pending`: do not show wallet success until webhook confirms.

## Data And Action Rules

The mobile app reads safe data through Supabase read models and calls the `actions` Edge Function for sensitive mutations.

The mobile app must not directly write:

- wallet balances
- ledger entries
- escrow holds
- DARE status
- Court score
- winner
- settlement
- jury verdict
- trust score
- risk status

Every state-changing action request must send:

```json
{
  "requestId": "uuid",
  "idempotencyKey": "client-generated-key",
  "payload": {}
}
```

Read models needed before feature work:

- `getMe`
- `getHomeFeed`
- `getDareDetail`
- `getCourtState`
- `getWallet`
- `getTransactionHistory`
- `getNotifications`
- `getKycStatus`
- `getResponsibleGamingSettings`
- `getJuryAssignment`
- `getCategories`

## Screen Specifications

### 1. Auth And Onboarding

Routes:

- `AuthWelcome`
- `SignIn`
- `SignUp`
- `AgeGate`
- `ProfileSetup`
- `KycIntro`
- `KycSubmit`
- `KycStatus`

Purpose:

- Get the user into a verified, low-limit account with minimal initial friction.

Required behavior:

- Age gate appears before account activation.
- Profile setup asks only for required display fields.
- KYC status is visible, but document-heavy KYC is only pushed when required by action limits.
- Failed KYC submission shows specific correction text.
- No raw ID images are stored in app state longer than required for upload.

Backend:

- `GET /me`
- `POST /kyc/submit`
- `GET /kyc/status`

States:

- unauthenticated
- profile incomplete
- kyc0 active with low limits
- kyc pending
- kyc approved
- kyc rejected
- account restricted

Acceptance criteria:

- User can register, pass age gate, land on Feed, and see KYC tier.
- User blocked by KYC sees the exact requirement and destination.
- KYC submit failure does not lose already entered local form data.

### 2. Feed

Route:

- `Feed`

Purpose:

- Help users find open DAREs, live DAREs, and their next action.

Components:

- category filter chips
- stake range filter
- open DARE cards
- live DARE cards
- empty state
- notification entry point

DARE card must show:

- title
- category
- stake
- expected winner payout when applicable
- issuer trust score
- status
- time remaining or created time
- primary action: Accept, Spectate, View Result, or Open Court

Backend:

- `public_dare_feed`
- `GET /me` for capability flags
- realtime `dare_updated` where available

States:

- loading
- empty
- filtered empty
- offline stale feed
- open DARE
- targeted DARE
- live DARE
- completed DARE

Acceptance criteria:

- No DARE card allows accepting without showing stake and fee implications.
- Feed does not show restricted users actions they cannot complete.
- Stale feed clearly says when data was last updated.

### 3. DARE Detail And Accept

Routes:

- `DareDetail`
- `AcceptDareSheet`
- `AcceptReceipt`

Purpose:

- Let the user understand rules, stake, escrow, fees, and risk before accepting.

Required sections:

- immutable constitution summary
- issuer profile/trust
- stake and currency
- platform fee
- amount to be locked
- expected winner payout
- dispute window summary
- accept button

Backend:

- `GET /dare detail` read model
- `POST /dares/{id}/accept`

States:

- acceptable
- insufficient funds
- KYC required
- responsible gaming limit exceeded
- issuer/self challenge blocked
- already accepted
- targeted to another user
- provider/server error

Acceptance criteria:

- User must see the exact escrow amount before accepting.
- Accept button is disabled until current capability checks are loaded.
- Replayed accept idempotency returns the original receipt.

### 4. Create DARE

Route:

- `CreateDare`

Flow:

1. Type and category
2. Challenge definition
3. Proof and duration
4. Stake and payout
5. Rules and edge cases
6. Review and create

MVP restriction:

- Algorithmic DARE only.
- Physical/evidence categories can appear as disabled future categories only if product wants to signal roadmap.

Required behavior:

- Validate each step before advancing.
- Keep a sticky escrow/payout preview from stake step onward.
- Preserve draft locally until submitted or discarded.
- Warn before abandoning a non-empty draft.
- Require idempotency key on final create.

Backend:

- `GET /categories`
- `GET /wallet`
- `POST /dares`

States:

- draft empty
- draft dirty
- validation errors
- insufficient funds
- KYC required
- responsible gaming limit exceeded
- submitting
- created receipt

Acceptance criteria:

- User cannot create with invalid category, zero stake, missing rules, or insufficient balance.
- Review screen repeats all money values and rules before submit.
- Server errors map to typed messages, not generic failure text.

### 5. Court

Routes:

- `CourtHome`
- `CourtReady`
- `CourtCountdown`
- `CourtPlay`
- `CourtResult`
- `CourtSettlementStatus`

Purpose:

- Provide the active challenge arena with server-authoritative timing and scoring.

Persistent elements:

- DARE title
- server timer
- player A/B score cards
- connection status
- constitution drawer
- current required action

Backend:

- `GET /court state`
- `POST /dares/{id}/ready`
- `POST /dares/{id}/answers`
- `POST /court/{dareId}/heartbeat`
- realtime `court_started`, `score_updated`, `court_completed`

States:

- no active DARE
- waiting for opponent
- ready check
- countdown
- active question
- answer submitted
- answer locked
- reconnecting
- heartbeat stale
- completed
- disputed
- settled
- forfeited

Interaction rules:

- Timer and answer controls must stay visible.
- Chat, spectator sentiment, and secondary content must never block the player action.
- Client may animate answer selection, but server result is final.
- If realtime disconnects, app falls back to polling and shows `Reconnecting`.
- If heartbeat fails repeatedly, show an explicit risk of forfeit.

Acceptance criteria:

- User can ready up, play rounds, and reach result without leaving the Court.
- App never computes or trusts final score locally.
- Reconnect banner appears within one failed heartbeat interval.

### 6. Wallet

Routes:

- `Wallet`
- `Deposit`
- `DepositPending`
- `Withdraw`
- `WithdrawalReceipt`
- `TransactionDetail`

Purpose:

- Make money state legible and trustworthy.

Required sections:

- available balance
- escrowed balance
- pending withdrawal balance
- pending payout/settlement
- deposit CTA
- withdraw CTA
- KYC and limit status
- transaction history

Backend:

- `wallet_summary`
- `wallet_balance_projection`
- `POST /wallet/deposits/init`
- `POST /wallet/withdrawals`
- Paystack checkout via provider URL/access code
- webhook-confirmed updates via notifications/realtime

States:

- no wallet
- loading balances
- deposit initialized
- deposit pending provider
- deposit confirmed
- deposit failed
- withdrawal requested
- withdrawal processing
- withdrawal succeeded
- withdrawal failed/reversed
- insufficient funds
- KYC required

Acceptance criteria:

- Deposit init never immediately increases balance.
- Withdrawal request shows pending reservation.
- User can distinguish available, locked, and pending amounts.
- Every transaction row has type, amount, direction, status, date, and reference.

### 7. Responsible Gaming

Routes:

- `ResponsibleGaming`
- `EditLimits`
- `SelfExclusion`
- `CoolOffReceipt`

Purpose:

- Provide user-owned safety controls and satisfy consumer protection requirements.

Required controls:

- daily deposit limit
- weekly deposit limit
- monthly deposit limit
- max stake per DARE
- session max minutes
- self-exclusion

Backend:

- `GET /responsible gaming settings`
- `PATCH /responsible-gaming/settings`
- `POST /responsible-gaming/self-exclude`

Rules:

- Limit decreases apply immediately.
- Limit increases show pending effective timestamp.
- Self-exclusion is irreversible by the user during the selected period.
- Self-exclusion blocks promotional CTAs.

Acceptance criteria:

- Increase flow displays 24-hour cooling-off clearly before submit.
- Self-exclusion requires confirmation with consequence summary.
- Restricted/self-excluded accounts cannot access money-moving or DARE actions.

### 8. Notifications

Routes:

- `Notifications`
- destination-specific deep links

Purpose:

- Route users to the next required action.

Notification types:

- DARE received
- DARE accepted
- Court starting
- answer/result ready
- settlement completed
- dispute filed
- jury invite
- wallet update
- withdrawal status
- KYC status
- trust score change
- account/risk action

Backend:

- `notifications`
- `PATCH /notifications/{id}/read`
- `POST /notifications/read-all`

Acceptance criteria:

- Every notification has a clear destination or explanation.
- Read state syncs across sessions.
- Critical notifications are visually distinct but not alarmist.

### 9. Dispute And Evidence

Routes:

- `FileDispute`
- `EvidenceUpload`
- `DisputeStatus`

Purpose:

- Let a participant challenge a result within the policy window and submit evidence.

Backend:

- `POST /dares/{id}/disputes`
- `POST /dares/{id}/evidence`
- `POST /dares/{id}/evidence/confirm`

Required behavior:

- Show dispute deadline.
- Show what happens to escrow during dispute.
- Require reason and summary.
- Evidence upload must show allowed file types and size.
- Evidence confirmation is separate from file selection.

States:

- dispute window open
- dispute window closed
- evidence pending upload
- evidence uploaded
- jury pending
- jury voting
- verdict pending settlement
- settled

Acceptance criteria:

- User cannot file after deadline.
- Upload failure does not create a false submitted state.
- Evidence object only appears submitted after confirm succeeds.

### 10. Jury

Routes:

- `JuryHome`
- `JuryAssignment`
- `JuryVote`
- `JuryReceipt`

Purpose:

- Allow assigned jurors to review blind evidence packets and vote.

MVP behavior:

- Jury is not a primary tab.
- Entry points are Profile and Notifications.
- Only assigned cases are shown.
- No token-staking UI in MVP.

Backend:

- assigned jury case read model
- `POST /jury-cases/{id}/votes`

Required UI:

- case status
- constitution summary
- blind packet A/B evidence
- vote options: A, B, Void
- rationale field
- confirmation sheet

Rules:

- Do not reveal participant identity when blind packet mode is active.
- Vote is final after submit.
- Rationale is required.

Acceptance criteria:

- Juror cannot vote twice.
- Juror sees immutable final receipt after submit.
- UI explains that votes are hidden until voting closes.

### 11. Profile And Settings

Routes:

- `Profile`
- `EditProfile`
- `JuryEligibility`
- `Settings`
- `Support`

Purpose:

- Show identity, trust, verification, history, and user controls.

Backend:

- `GET /me`
- `PATCH /profiles/me`
- `PATCH /profiles/me/jury`
- notification and history read models

Required sections:

- display name and username
- avatar
- KYC tier
- account status
- risk status when user-actionable
- trust score and tier
- completed DAREs
- wins/losses
- dispute summary
- jury eligibility
- settings links

Acceptance criteria:

- Trust score is explained as server-owned.
- User cannot edit restricted fields locally.
- Jury opt-in shows eligibility requirements before submit.

## Implementation Plan

### Phase 0: Product Alignment

Deliverables:

- Confirm MVP excludes USSD, what3words, copy betting, and physical DAREs.
- Confirm mobile platform stack.
- Confirm design token names and accessibility floor.
- Confirm first-market regulatory copy for KYC and responsible gaming.

Exit criteria:

- Product owner signs off on MVP screen list.
- Engineering signs off on action/read-model mapping.

### Phase 1: App Foundation

Deliverables:

- App shell and navigation.
- Theme tokens.
- Core components.
- Auth session plumbing.
- API client for `actions` Edge Function.
- Standard request/response envelope handling.
- Global error mapper.
- Local idempotency key helper.

Exit criteria:

- App can authenticate, call `GET /me`, and render typed errors.
- Components pass accessibility checks for labels, touch target size, contrast, and text scaling.

### Phase 2: Wallet And Compliance Foundation

Deliverables:

- Wallet screen.
- Deposit init and pending provider state.
- Withdrawal request.
- Transaction history.
- KYC status.
- Responsible gaming settings and self-exclusion.

Exit criteria:

- Deposit never credits before webhook confirmation.
- Withdrawal pending state reduces visible available funds.
- Limit increases show pending effective timestamp.
- Self-exclusion blocks gated actions.

### Phase 3: DARE Create And Accept

Deliverables:

- Feed.
- DARE detail.
- Create DARE flow.
- Accept confirmation and receipt.
- DARE capability gates.

Exit criteria:

- User can create an Algorithmic DARE with escrow preview.
- Another eligible user can accept after seeing exact escrow and payout terms.
- Insufficient funds, KYC, limit, and invalid-state errors are handled with clear UI.

### Phase 4: Court And Result Loop

Deliverables:

- Court active-state routing.
- Ready-up flow.
- Countdown.
- Quiz answer UI.
- Heartbeat and reconnect banner.
- Result and settlement status.

Exit criteria:

- Two participants can ready up and complete a server-scored DARE.
- Client never computes final score or winner.
- Reconnect and stale heartbeat states are visible.

### Phase 5: Disputes, Evidence, Jury, Notifications

Deliverables:

- Notifications.
- Dispute filing.
- Evidence upload and confirm.
- Dispute status.
- Jury assignment and vote.

Exit criteria:

- Participant can file a dispute inside the window.
- Evidence upload has pending, uploaded, failed, and confirmed states.
- Assigned juror can submit one final vote with rationale.
- Notification deep links land on the correct screen.

### Phase 6: Hardening

Deliverables:

- E2E flow tests for core user journeys.
- Offline and slow-network tests.
- Accessibility pass.
- Copy review for money, KYC, limits, and disputes.
- Analytics events.
- Crash/error reporting.

Exit criteria:

- No real-money launch blocker remains in wallet, escrow, settlement, withdrawal, or dispute UX.
- All irreversible actions have confirmation and receipt states.
- All sensitive actions use server-confirmed results.

## UX Copy Rules

Use explicit money verbs:

- "Locked in escrow"
- "Available to withdraw"
- "Pending provider confirmation"
- "Pending withdrawal"
- "Settlement pending"
- "Paid out"
- "Refunded"

Avoid vague money verbs:

- "Processing" without a status detail.
- "Done" for provider-pending states.
- "Won" before settlement if payout is not complete.
- "Balance updated" before webhook confirmation.

Use typed error messages:

- `INSUFFICIENT_FUNDS`: "Your available balance is too low for this action."
- `KYC_REQUIRED`: "You need {tier} verification to continue."
- `LIMIT_EXCEEDED`: "This action exceeds your current limit."
- `INVALID_STATE`: "This DARE has changed. Refresh to see the latest state."
- `RATE_LIMITED`: "Too many attempts. Try again in {time}."
- `ACCOUNT_RESTRICTED`: "Your account is restricted for this action."

## Analytics Events

Track these product events without logging secrets or sensitive document data:

- `auth_signup_started`
- `auth_signup_completed`
- `kyc_submit_started`
- `kyc_submit_completed`
- `deposit_init_started`
- `deposit_init_completed`
- `deposit_confirmed_seen`
- `withdrawal_requested`
- `dare_create_started`
- `dare_created`
- `dare_accept_started`
- `dare_accepted`
- `court_ready_submitted`
- `court_answer_submitted`
- `court_reconnect_shown`
- `court_completed_seen`
- `settlement_seen`
- `dispute_filed`
- `evidence_upload_requested`
- `evidence_upload_confirmed`
- `jury_vote_submitted`
- `responsible_limit_updated`
- `self_exclusion_started`
- `self_exclusion_confirmed`

Never include:

- raw idempotency key
- bank account number
- payment provider secret
- access token
- raw evidence file content
- raw KYC document data

## Testing Requirements

### Unit Tests

- Money formatting.
- Escrow breakdown calculations for display only.
- Error mapping.
- Idempotency key generation.
- DARE create validation.
- Responsible gaming limit copy.

### Component Tests

- `EscrowBreakdown`
- `DareCard`
- `AmountInput`
- `CountdownTimer`
- `ConnectionBanner`
- `EvidenceUploader`
- `JuryEvidencePacket`
- `ConfirmSheet`

### E2E Tests

- Signup -> profile -> feed.
- Deposit init -> pending state.
- Create DARE with enough balance.
- Accept DARE with escrow confirmation.
- Ready-up -> answer -> result.
- Completed DARE -> dispute.
- Evidence upload failure and retry.
- Jury vote submission.
- Withdrawal request.
- Self-exclusion blocks DARE creation.

### Accessibility Tests

- Screen reader labels on all icon-only buttons.
- Touch targets at least 44px.
- Text scaling does not overlap.
- Color is not the only status indicator.
- Reduced motion removes nonessential animation.
- Forms expose inline error messages.

## Open Design Decisions

1. Final mobile stack and navigation library.
2. Whether the MVP Feed shows live spectator chat or only active DARE state.
3. Whether the Court tab opens the current active DARE directly or shows a queue first.
4. Whether KYC document capture is native camera, provider web view, or provider SDK.
5. Exact copy for legal age gate and responsible gaming by launch jurisdiction.
6. Whether transaction history is paginated by date or grouped by DARE.
7. Whether notifications are in-app only for beta or include push dispatch.

## Implementation Definition Of Done

A screen is done only when:

- It is reachable through navigation.
- It handles loading, empty, error, offline, and restricted states.
- It calls the correct read model or action route.
- It never trusts client-computed sensitive values.
- It has accessible labels for controls.
- It works at small mobile widths.
- It has tests for core interaction logic.
- It has reviewed copy for money, KYC, and irreversible actions.

