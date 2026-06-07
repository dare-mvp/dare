# User Roles And Journeys

## User Behaviour Context

DARE's primary users in Nigeria and Kenya are mobile-first and **act before reading**. They tap first, scroll fast, and make decisions based on what they see first — not what the supporting text says.

This is not a limitation; it is the design target. Every journey below must be implementable by a user who never reads a single instruction. Buttons guide the path. The system initiates transitions. Actions are pre-filled. There are no dead-end states.

See [`docs/13-directional-ux-principles.md`](13-directional-ux-principles.md) for the full design specification.

## Core Roles

### Guest

Unauthenticated user who can view limited public content, understand the product, and start registration.

### Player

Authenticated user who can create, accept, and participate in DAREs.

### Issuer

Player who creates a DARE. In the prototype this maps to Player A.

### Challenger

Player who accepts a DARE. In the prototype this maps to Player B.

### Spectator

User who watches live Court sessions, chats, reacts, and may vote when eligible.

### Juror

Eligible user who reviews evidence in disputed or evidence-based DAREs and casts a reasoned verdict.

### Admin / Risk Operator

Internal operator who reviews disputes, fraud flags, user reports, payment anomalies, and escalations.

### Payment Operator

Internal operations role responsible for withdrawals, provider failures, reconciliation, chargebacks, and payment support.

## Journey 1: Onboarding

1. User installs app.
2. User registers with phone/email.
3. User accepts terms, age gate, and privacy notices.
4. User creates profile.
5. User completes required KYC tier for the intended activity.
6. User lands on Feed with clear first action: create or accept a DARE.

Open decisions:

- Whether KYC is required before browsing.
- Whether KYC is required before deposit.
- Whether KYC is required before accepting a real-money DARE.

## Journey 2: Create A DARE

1. Issuer taps Create.
2. Selects DARE type and category.
3. Defines the test.
4. Sets duration.
5. Sets proof method.
6. Chooses open challenge or specific opponent.
7. Sets stake.
8. Reviews fee, payout, and escrow terms.
9. Writes rules and edge-case handling.
10. Reviews constitution.
11. Submits.
12. Server validates eligibility, balance, limits, and risk.
13. Server creates DARE and locks issuer stake when required.
14. DARE appears in Feed or targeted opponent inbox.

Required states:

- Draft
- Validation failed
- Awaiting deposit
- Created
- Awaiting opponent
- Expired

## Journey 3: Accept A DARE

1. Challenger opens DARE detail.
2. Reviews issuer profile and trust score.
3. Reviews constitution, stake, fee, and payout.
4. Reviews dispute and cancellation terms.
5. Accepts.
6. Server validates DARE is still available.
7. Server validates challenger eligibility, KYC, stake limits, and wallet balance.
8. Server locks challenger stake.
9. DARE moves into ready-up state.
10. Both users are routed to Court.

Failure states:

- DARE already accepted
- Insufficient balance
- KYC tier too low
- User is blocked or banned
- Risk engine holds transaction
- DARE expired

## Journey 4: Court Match

1. Both players enter Court.
2. Court loads constitution, player cards, stake summary, and timer.
3. Players mark ready.
4. Server starts match and broadcasts server time.
5. Match runs according to DARE type.
6. Spectators can watch, chat, and vote if eligible.
7. Result is computed by the server.
8. Result overlay is shown.
9. Escrow settles or is held for dispute window.

Court must support reconnects:

- User temporarily loses connection.
- User returns before timeout.
- User forfeits by leaving after grace period.
- Server remains authoritative.

## Journey 5: Evidence-Based DARE

1. Players enter Court.
2. App requests camera/microphone permission only when needed.
3. Recording session is server-stamped.
4. Evidence is captured in-app.
5. Upload shows progress and failure recovery.
6. Evidence object is stored privately.
7. Hash and metadata are stored.
8. Evidence packet is sent to jury when needed.
9. Users receive receipt and status.

Required evidence metadata:

- DARE ID
- User ID
- Capture start and end time
- Device metadata, within privacy limits
- Object storage path
- Content hash
- Upload status

## Journey 6: Dispute

1. Eligible user files dispute within allowed window.
2. User must provide structured reason.
3. Server validates eligibility.
4. Server freezes or maintains escrow hold.
5. Jury case is created.
6. Jurors are assigned.
7. Both players see case status.
8. Verdict is reached.
9. Settlement executes.
10. Trust score and dispute record update.

Dispute UI must explain:

- What happens to escrow.
- Expected resolution time.
- Evidence required.
- Penalty for bad-faith disputes.
- Whether result can be overturned.

## Journey 7: Juror Review

1. Eligible user opts into jury pool.
2. User receives case invitation or claims a slot.
3. User reviews constitution and blind evidence packet.
4. User writes rationale.
5. User votes A or B.
6. Vote is locked.
7. Juror receives reward or trust update after valid completion.

Juror exclusions:

- Participant in the DARE.
- Related account, device, or suspicious prior relationship.
- Under minimum trust score.
- Banned or limited account.
- Recently failed juror obligations.

## Journey 8: Wallet

1. User opens Wallet.
2. Sees available balance, escrowed amount, pending payout, and transaction history.
3. Initiates deposit or withdrawal.
4. Server handles payment provider interaction.
5. User sees verified result, not optimistic money movement.

Wallet must distinguish:

- Available balance
- Escrowed funds
- Pending deposits
- Pending withdrawals
- Held funds under review
- Bonuses or non-withdrawable credits

## Journey 9: Admin Review

1. Admin sees dispute queue, fraud flags, payment issues, and user reports.
2. Admin opens case with full audit trail.
3. Admin reviews evidence, ledger, device/risk signals, and prior history.
4. Admin can escalate, limit accounts, resolve cases, or request more information.
5. Every admin action is audit-logged.

