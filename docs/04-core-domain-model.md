# Core Domain Model

## Domain Principles

- Money movement must be server-authoritative.
- Challenge outcomes must be auditable.
- DAREs are user-authored; the platform does not generate the primary challenge content.
- User trust must be earned through behavior.
- The client requests actions, but the server decides sensitive state transitions.
- The domain model is independent of the UI framework.

## Core Entities

### User

Represents an authenticated account.

Key fields:

- id
- phone/email
- status
- created_at
- last_active_at
- risk_status
- kyc_tier

### Profile

Public or semi-public identity shown in the app.

Key fields:

- user_id
- username
- display_name
- avatar
- country
- city
- trust_score
- tier
- wins
- losses
- disputes
- completed_dares

### DARE

The central challenge object.

Key fields:

- id
- issuer_id
- challenger_id
- dare_type
- funding_model
- title
- description
- category
- resolution_type
- status
- stake_amount
- reward_amount
- platform_fee
- winner_payout
- duration_seconds
- constitution_id
- created_at
- accepted_at
- started_at
- completed_at
- settled_at
- expires_at

### Constitution

The binding rule set for a DARE.

Key fields:

- id
- dare_id
- test
- rules
- proof_method
- edge_cases
- version
- accepted_by_issuer_at
- accepted_by_challenger_at

The constitution is immutable after acceptance. Amendments require a new version and explicit acceptance by all required participants.

### DARE Type

Defines who funds escrow.

Allowed values:

- `skill`: two participants compete; issuer and challenger both fund escrow.
- `task`: Darer funds a reward; performer accepts or claims the task without staking their own money.

`dare_type` is independent of `resolution_type`.

### Funding Model

Derived from `dare_type`:

- `two_sided_stake`: used by Skill-Based DAREs.
- `darer_reward`: used by Task-Based DAREs.

Skill-Based settlement pays the eligible escrow pool to the winner. Task-Based settlement pays the eligible reward to the performer after valid completion or refunds the Darer when the task expires, is cancelled before acceptance, or is voided.

### Court Session

Runtime state for a live DARE.

Key fields:

- id
- dare_id
- server_start_time
- server_end_time
- phase
- player_a_ready
- player_b_ready
- player_a_heartbeat_at
- player_b_heartbeat_at
- reconnect_deadline

### Evidence

Proof submitted for evidence-based or disputed DAREs.

Key fields:

- id
- dare_id
- user_id
- storage_bucket
- storage_path
- content_hash
- media_type
- capture_started_at
- capture_ended_at
- uploaded_at
- status

### Jury Case

Dispute or evidence review case.

Key fields:

- id
- dare_id
- opened_by_user_id
- status
- reason
- votes_needed
- verdict
- opened_at
- closed_at
- escalated_at

### Jury Assignment

Links juror to case.

Key fields:

- id
- jury_case_id
- juror_id
- status
- assigned_at
- claimed_at
- due_at
- completed_at
- blind_side_mapping

### Jury Vote

A juror decision.

Key fields:

- id
- jury_case_id
- juror_id
- vote
- rationale
- created_at

Votes are immutable after submission.

### Wallet Account

A user's internal wallet.

Key fields:

- id
- user_id
- currency
- status
- created_at

### Ledger Entry

Append-only financial record.

Key fields:

- id
- wallet_account_id
- dare_id
- provider_reference
- type
- direction
- amount
- currency
- balance_snapshot
- status
- created_at

Recommended ledger types:

- deposit_pending
- deposit_confirmed
- escrow_hold
- escrow_release
- payout
- platform_fee
- withdrawal_pending
- withdrawal_completed
- reversal
- adjustment

### Payment Transaction

External payment provider interaction.

Key fields:

- id
- user_id
- provider
- provider_reference
- type
- amount
- currency
- status
- initialized_at
- verified_at
- raw_provider_payload

### Notification

User-facing event.

Key fields:

- id
- user_id
- type
- title
- body
- action
- is_read
- created_at

### Risk Event

Fraud, abuse, or compliance signal.

Key fields:

- id
- user_id
- dare_id
- type
- severity
- status
- evidence
- created_at
- reviewed_at

## DARE Status Model

Recommended production state machine:

```text
draft
open
targeted_pending
accepted
ready_check
active
awaiting_result
completed
dispute_pending
jury_open
jury_closed
settled
cancelled
expired
forfeited
voided
```

Sensitive transitions must happen on the server.

Examples:

- `open -> accepted`: server verifies acceptor, balance requirements where applicable, KYC, limits.
- `accepted -> active`: server verifies all required participants are ready.
- `active -> completed`: server computes outcome.
- `completed -> settled`: server releases escrow.
- `completed -> dispute_pending`: server validates dispute window and freezes settlement if required.

## Resolution Types

See [`docs/16-dare-resolution-model.md`](16-dare-resolution-model.md) for the canonical product direction.

### Answer Key

Objective creator-authored challenge with a pre-committed answer key or answer rules.

Use for knowledge, trivia, spelling, calculation, or deterministic response challenges.

The platform verifies answers against committed data, but the platform does not author the challenge.

### Witnessed

Live audience or eligible witnesses provide result signals. Requires voter eligibility, anti-sybil controls, and dispute review safeguards.

### Evidence

Players submit proof. Jury or admin decides.

## Trust Score Model

Trust score is a server-calculated derived value, not directly mutable by clients.

Positive signals:

- Completed DAREs
- Clean wins
- Clean losses
- Valid jury participation
- On-time evidence submission
- Low dispute rate

Negative signals:

- Forfeits
- Bad-faith disputes
- Jury non-completion
- Collusion flags
- Reversed payments
- Abuse reports upheld

## Relationships

```text
User 1--1 Profile
User 1--1 Wallet Account
User 1--many DARE as issuer
User 1--many DARE as challenger
DARE 1--1 Constitution
DARE 1--1 Court Session
DARE 1--many Evidence
DARE 1--many Jury Case
Jury Case 1--many Jury Assignment
Jury Case 1--many Jury Vote
Wallet Account 1--many Ledger Entry
User 1--many Notification
User 1--many Risk Event
```
