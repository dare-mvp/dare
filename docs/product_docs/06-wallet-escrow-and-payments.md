# Wallet, Escrow, And Payments

## Principle

The wallet is a financial system, not a UI feature. The mobile app must never be the authority for balances, escrow, payouts, withdrawals, or trust-affecting money events.

## Wallet Concepts

### Available Balance

Funds the user can spend or withdraw.

### Escrowed Balance

Funds locked against active DAREs.

### Pending Balance

Funds waiting for payment provider confirmation or withdrawal processing.

### Held Balance

Funds frozen due to dispute, risk review, chargeback, or compliance issue.

## Ledger Model

Use an append-only ledger. Avoid direct mutable balance updates as the source of truth.

Every financial event produces ledger entries:

- Deposit confirmed
- Escrow hold
- Escrow release
- Settlement payout
- Platform fee
- Withdrawal pending
- Withdrawal completed
- Reversal
- Manual adjustment

Balances are derived or reconciled from ledger entries.

## Escrow Flow

### Stake Models

DARE has two funding models:

- `two_sided_stake`: Skill-Based DARE. The Darer and Challenger both fund escrow.
- `darer_reward`: Task-Based DARE. Only the Darer funds escrow; the Performer does not stake money.

Both models use the same escrow, dispute, evidence, and settlement infrastructure.

### Create Skill-Based DARE

For open Skill-Based DAREs, the issuer stake is locked at creation.

Recommended for trust:

1. Issuer creates Skill-Based DARE.
2. Server validates available balance.
3. Issuer stake is locked immediately.
4. If DARE expires, escrow returns to issuer.

### Accept Skill-Based DARE

1. Challenger accepts.
2. Server verifies DARE is still open.
3. Server verifies challenger balance, KYC, limits, and risk status.
4. Challenger stake is locked.
5. DARE moves to ready_check.

### Create Task-Based DARE

1. Darer creates Task-Based DARE.
2. Server validates available balance.
3. Darer's reward is locked immediately.
4. If the task expires or is cancelled before acceptance, escrow returns to the Darer.

### Accept Task-Based DARE

1. Performer accepts or claims the task.
2. Server verifies DARE is still open.
3. Server verifies performer KYC, limits, and risk status.
4. No performer stake is locked.
5. DARE moves to ready_check or active according to the task constitution.

### Complete DARE

1. Server computes winner or validates task completion.
2. Server calculates platform fee.
3. Server releases escrow.
4. Skill-Based winner receives payout or Task-Based performer receives reward.
5. Platform receives fee.
6. DARE moves to settled.

### Disputed DARE

1. Dispute is filed within policy window.
2. Escrow remains held.
3. Jury/admin verdict determines settlement.
4. Final settlement is recorded with audit trail.

## Payment Provider Rules

Payment provider secret keys must never be present in the mobile app.

Required server-side operations:

- Initialize deposit transaction.
- Verify provider transaction status and amount.
- Validate webhook signatures.
- Store provider reference.
- Process each provider event idempotently.
- Queue withdrawals and payouts.

## Deposit Flow

1. User enters amount.
2. App calls backend: `POST /wallet/deposit/init`.
3. Backend creates provider transaction.
4. User completes provider checkout.
5. Provider sends webhook.
6. Backend verifies signature.
7. Backend verifies transaction reference, amount, and status.
8. Backend credits wallet ledger.
9. App receives wallet update.

Do not credit wallet from a client callback alone.

## Withdrawal Flow

1. User requests withdrawal.
2. Server checks available balance.
3. Server checks KYC tier and risk status.
4. Server creates withdrawal_pending ledger entry.
5. Operations or automated payout provider processes withdrawal.
6. Server marks completed or failed.
7. User receives notification.

## Fees

The product shows fees before commitment.

Fee components are:

- Platform rake
- Payment processing fee
- Juror reward allocation
- Tax or statutory withholding if applicable

The server must calculate canonical fees.

## Limits

Limits vary by KYC tier and risk status:

- Max stake per DARE
- Max daily stake volume
- Max weekly deposit
- Max withdrawal
- Max open escrow
- Cooldown after chargeback or suspicious activity

## Reconciliation

Required daily jobs:

- Compare provider transactions to internal ledger.
- Detect stuck pending deposits.
- Detect stuck pending withdrawals.
- Detect ledger imbalance.
- Detect duplicate provider references.
- Report unresolved anomalies to ops.

## Payment And Compliance Follow-Up

The documentation reviewed repeatedly flags payment provider and gaming/skill-competition classification risk. Before production money movement:

- Obtain written provider approval for the operating model.
- Confirm provider policy for skill-based competitions with entry fees and prizes.
- Confirm jurisdiction-specific licensing requirements.
- Confirm KYC/AML obligations.

## Useful Current Primary References

- Paystack transactions API: https://paystack.com/docs/api/transaction/
- Paystack webhooks: https://paystack.com/docs/payments/webhooks
- Paystack transfer recipients: https://paystack.com/docs/api/transfer-recipient/
- Paystack terms: https://paystack.com/terms
- Paystack ineligible businesses: https://support.paystack.com/en/articles/2127042
