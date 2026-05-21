# MVP Scope

## MVP Objective

Build a production-safe mobile MVP that proves the DARE loop without taking on every product surface from the prototype.

The MVP should answer:

- Will users create and accept structured challenges?
- Can DARE safely hold and settle funds?
- Can the app produce trusted outcomes?
- Can disputes and fraud be controlled operationally?

## Recommended MVP DARE Type

Start with Algorithmic DAREs.

Reasons:

- Server-scored outcomes are easier to audit.
- No media upload required for the primary flow.
- Jury can be reserved for disputes instead of every match.
- Faster settlement.
- Lower operational burden than physical/evidence categories.

Evidence-based DAREs should follow after wallet, state machine, and dispute operations are stable.

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

- Create Algorithmic DARE
- Open DARE feed
- Accept DARE
- Escrow hold for both users
- Ready-up flow
- Server-authoritative match start
- Quiz/scored challenge
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
- Replicate Wager creator economy
- Physical DARE category
- what3words integration
- AI voice-to-DARE
- Predictive matchmaking
- Full spectator economy rewards
- USSD production gateway
- Multi-country launch
- Real-money Honour DAREs

## MVP User Stories

### Create

As a verified player, I can create a quiz-based DARE with rules, duration, stake, and payout preview.

### Accept

As a verified player, I can review another user's DARE constitution and accept it if I have enough balance and meet requirements.

### Play

As a player, I can enter the Court, ready up, answer questions, and see my score update.

### Settle

As a winner, I can see my payout after the server settles the DARE.

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
7. Court and algorithmic scoring.
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

