# MVP Scope

## MVP Objective

Build a production-safe mobile MVP that proves the DARE loop without taking on every product surface from the prototype.

The MVP answers:

- Will users create and accept structured challenges?
- Can DARE safely hold and settle funds?
- Can the app produce trusted outcomes?
- Can disputes and fraud be controlled operationally?

## Recommended MVP DARE Type

Start with creator-authored Court DAREs using two stake models and the same Answer Key or Witnessed/Evidence review paths:

- Skill-Based DARE: two participants both stake.
- Task-Based DARE: only the Darer funds the reward.

Reasons:

- Users, not the platform, define the challenge.
- Skill-Based and Task-Based DAREs share the same public, social, witnessed, evidence-based, and dispute-resolvable pattern.
- The Court proves presence, timing, and performance.
- Objective knowledge-style challenges can use a pre-committed answer key.
- Subjective or real-world challenges can use witnesses, evidence, and jury/admin review.
- The platform stays focused on escrow, proof, dispute integrity, and settlement.

The old platform-authored challenge model is not the product direction. See [`16-dare-resolution-model.md`](16-dare-resolution-model.md).

## MVP Included

### Account And Profile

- Register/login
- Age gate
- Basic profile
- Trust score display
- KYC status display

### Wallet

- Deposit initiation
- Deposit verification through provider webhook
- Available balance
- Escrow balance
- Transaction history
- Withdrawal request queue

### DARE Core

- Create creator-authored DARE
- Select Skill-Based or Task-Based funding model
- Open DARE feed
- Accept DARE
- Escrow hold for both participants on Skill-Based DAREs
- Escrow hold for the Darer's reward on Task-Based DAREs
- Ready-up flow
- Server-authoritative match start
- Live Court with LiveKit Cloud video, timer, presence, proof, recording, and result capture
- Result screen
- Settlement
- Notifications

### Dispute Foundation

- File dispute within policy window
- Admin-visible dispute queue
- Basic jury/admin review workflow
- Escrow hold while dispute is active

### Risk Foundation

- Stake limits by KYC tier
- Account status controls
- Basic velocity checks
- Audit logs
- Manual admin review

## MVP Excluded

- Tournaments / Arena
- Replicate DARE creator economy
- Physical DARE category
- what3words integration
- AI voice-to-DARE
- Predictive matchmaking
- Full spectator economy rewards
- USSD production gateway
- Multi-country launch
- Real-money Informal mutual-confirmation DAREs

## MVP User Stories

### Create

As a verified player, I can create a Skill-Based DARE with rules, duration, proof requirements, stake, and payout preview.

As a verified Darer, I can create a Task-Based DARE with rules, duration, proof requirements, reward, and payout/refund preview.

### Accept

As a verified player, I can review another user's DARE constitution and accept it if I have enough balance and meet requirements.

As a verified performer, I can accept a Task-Based DARE without staking my own funds when I meet the eligibility requirements.

### Play

As a player, I can enter the LiveKit-powered Court, ready up, perform or answer according to the creator-authored constitution, and see the server-confirmed result path.

As an eligible spectator, I can watch a live Court without being able to alter escrow, settlement, or participant-only result claims.

### Settle

As a winner or task performer, I can see my payout after the server settles the DARE.

### Dispute

As a participant, I can dispute an outcome within the allowed window and see the dispute status.

### Review

As an admin, I can inspect disputed DAREs, ledger events, and user history.

## MVP Success Metrics

### Activation

- Registration to first deposit conversion
- Deposit to first DARE conversion
- First DARE completion rate

### Liquidity

- Number of open DAREs per active user
- Time from open to accepted
- Challenge acceptance rate

### Trust

- Dispute rate
- Dispute upheld rate
- Settlement error rate
- Support tickets per 100 completed DAREs

### Wallet

- Deposit success rate
- Webhook verification success rate
- Withdrawal request completion time
- Ledger imbalance incidents

### Retention

- D1 retention
- D7 retention
- Repeat DARE rate

## MVP Milestones

1. Product, compliance, and architecture documentation.
2. Payment provider and legal validation.
3. Backend state machine and ledger.
4. Mobile app shell and auth.
5. Wallet deposit and transaction history.
6. DARE create/accept/escrow.
7. LiveKit Cloud Court video, presence, proof, answer-key/witnessed result capture.
8. Settlement and notifications.
9. Dispute queue and admin review.
10. Closed beta with capped stakes.

## Launch Gates

Do not launch real-money MVP until:

- Payment provider approval is documented.
- Legal classification is reviewed.
- KYC/AML policy exists.
- Ledger has automated tests.
- Webhook handlers are idempotent.
- Escrow settlement is server-only.
- Admin can freeze users, DAREs, and withdrawals.
- Support and dispute playbooks exist.
