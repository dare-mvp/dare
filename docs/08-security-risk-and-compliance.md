# Security, Risk, And Compliance

## Status

This is a product and engineering planning document, not legal advice. All regulatory conclusions must be validated with qualified counsel and payment provider approval before launch.

## Security Principles

- The client is untrusted.
- Money movement is server-authoritative.
- Payment webhooks are verified and idempotent.
- Evidence is private by default.
- Sensitive actions are audited.
- Every role has least-privilege access.
- Abuse controls are designed before growth features.

## Primary Trust Boundaries

### Mobile App

Can request actions and display state. Cannot decide wallet balance, escrow, payout, verdict, or trust score.

### Backend API

Owns validation, state transitions, settlement, risk checks, and integration with payment providers.

### Database

Stores immutable ledgers, DARE state, evidence metadata, profiles, jury cases, and audit logs.

### Payment Provider

Confirms deposits and executes withdrawals or payouts.

### Object Storage

Stores evidence media privately with signed access.

### LiveKit Cloud

Provides live Court WebRTC rooms, participant/audience media transport, and server-side recording/egress signals. LiveKit provider events are inputs to DARE's audit and evidence model; they do not directly decide winners, payouts, or settlements.

### Admin Console

High-risk interface that requires strong authentication, role controls, and complete audit logging.

## High-Risk Areas

### Wallet And Escrow

Risks:

- Client-side balance tampering
- Duplicate deposits
- Race conditions accepting DAREs
- Incorrect payouts
- Chargebacks after losses
- Manual adjustment abuse

Controls:

- Append-only ledger
- Unique provider references
- Idempotent webhooks
- Database transactions for escrow
- Reconciliation jobs
- Admin dual-control for large adjustments

### Authentication And Identity

Risks:

- Multi-account abuse
- Account takeover
- Underage users
- Fake juror identities

Controls:

- Strong auth
- Device/session monitoring
- KYC tiering
- Age verification
- Step-up verification for large stakes or withdrawals

### DARE State Machine

Risks:

- Users accepting expired DAREs
- Double acceptance
- Client-forged completion
- Timer manipulation
- False forfeits

Controls:

- Server-side state transitions
- Server time
- Optimistic concurrency or row locks
- Heartbeats with grace periods
- Immutable event log

### Evidence

Risks:

- Edited videos
- Replay attacks
- Upload substitution
- Unauthorized evidence access
- Metadata leakage
- Recording consent gaps
- Provider webhook spoofing or replay

Controls:

- In-app capture for high-trust evidence
- Server-stamped LiveKit Court sessions
- Backend-only LiveKit room/token generation
- Verified and idempotent LiveKit webhooks
- Recorded consent version and timestamp for participants
- Private buckets
- Signed URLs with short TTL
- Content hash
- Evidence access logs

### Jury

Risks:

- Juror bias
- Jury capture
- Vote buying
- Low-quality rationales
- Participant voting on own case

Controls:

- Eligibility rules
- Blind packets
- Relationship checks
- Hidden vote tallies
- Vote immutability
- Juror penalties for non-completion

### Chat And Social

Risks:

- Harassment
- Spam
- Brigading
- Personal data leakage

Controls:

- Rate limits
- Moderation queues
- Block/report
- Toxicity detection
- Spectator eligibility for high-impact actions

## Compliance Domains To Validate

### Payment Provider Policy

The support research flags that payment providers can restrict gambling, gaming, or games of skill with entry fees and prizes. DARE must obtain provider approval before real-money launch.

Validation required:

- Can DARE process deposits for skill-based peer challenges?
- Are prior approvals required?
- Are any categories restricted?
- Are payouts to users permitted?
- Are international transactions permitted?

### Gaming / Skill Competition Regulation

DARE must validate how each launch jurisdiction classifies:

- Skill competitions
- Prize competitions
- Paid peer-to-peer skill challenges and task rewards
- Platform rake
- Tournaments
- Promotions

Skill-based classification does not remove regulatory obligations.

### KYC / AML

Current phase decision:

- DARE can receive KYC document uploads into private storage and store only redacted document metadata plus a private storage reference.
- Internal/manual KYC review through the admin action is acceptable for this phase.
- Automated vendor verification through Dojah, Prembly, Smile Identity, or another KYC provider is deferred until the first-market provider is selected.
- Magic-byte validation, malware scanning, and orphan-upload cleanup are future hardening items, not current-phase blockers.

Required planning:

- KYC tiers
- Transaction monitoring
- Suspicious activity review
- Record retention
- Withdrawal limits
- High-risk user escalation

### Data Protection

Required planning:

- Privacy notice
- Lawful basis
- Data minimization
- Data retention
- Evidence media retention
- Breach response
- Cross-border transfer review
- Data subject rights workflow

### Age And Responsible Play

Required planning:

- 18+ gate or jurisdiction-specific age requirement
- Deposit limits
- Cooling-off period
- Self-exclusion
- Responsible play messaging
- Support escalation

## Required Security Tests

- Ledger transaction tests
- Webhook idempotency tests
- Escrow race-condition tests
- Authorization/RLS tests
- DARE state machine tests
- Evidence access tests
- LiveKit token authorization and webhook verification tests
- Juror eligibility tests
- Admin permission tests
- Rate limit tests

## Production Reviewer Account Control

DARE maintains one production-phase reviewer account for mobile UI/UX testing. Account metadata is documented in `13-mobile-backend-integration.md`.

Controls:

- Do not store the reviewer password in the repository, docs, issue tracker, or chat transcripts.
- Rotate reviewer credentials through Supabase Auth Admin or the app password-reset flow when access is lost.
- Send temporary credentials only through the verified `daregamesapp.com` email channel.
- Keep the reviewer account clearly labeled and use it only for app review, not real customer activity.
- Review and disable the account before public launch if it is no longer needed.

## Launch Blockers

Real-money launch is blocked until:

- Payment provider approval is written.
- Legal review is complete for launch jurisdiction.
- Wallet ledger is tested.
- Webhook verification is implemented.
- KYC tier policy is implemented.
- Admin freeze controls exist.
- Evidence access is private.
- Audit logging is implemented.
- Incident response plan exists.

## Reference Links For Verification

- Paystack terms: https://paystack.com/terms
- Paystack ineligible businesses: https://support.paystack.com/en/articles/2127042
- Paystack transactions API: https://paystack.com/docs/api/transaction/
- Paystack webhooks: https://paystack.com/docs/payments/webhooks
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Nigeria Data Protection Commission: https://ndpc.gov.ng/
- Nigeria Data Protection Act PDF: https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf
- Money Laundering (Prevention and Prohibition) Act 2022: https://placng.org/i/wp-content/uploads/2022/05/Money-Laundering-Prevention-and-Prohibition-Act-2022.pdf
- Lagos State Lotteries and Gaming Authority: https://lslga.org/
- PwC analysis of Supreme Court National Lottery Act verdict: https://www.pwc.com/ng/en/assets/pdf/supreme-court-verdict-on-the-national-lottery-act.pdf
