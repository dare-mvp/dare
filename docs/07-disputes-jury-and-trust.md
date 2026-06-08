# Disputes, Jury, And Trust

## Purpose

The dispute and jury system is DARE's fairness engine. It must make outcomes feel legitimate even when users disagree.

## Dispute Principles

- Disputes must be time-bounded.
- Escrow status must be clear.
- Evidence must be preserved.
- Juror selection must reduce bias.
- Verdicts must be auditable.
- Bad-faith disputes must have consequences.

## Dispute Eligibility

A participant can dispute when:

- The DARE is completed but still inside the dispute window.
- The participant is a party to the DARE.
- The DARE type allows disputes.
- The account is not banned from dispute filing.
- Required evidence or rationale is provided.

Recommended dispute window for MVP:

- 10 to 30 minutes for answer-key or mutually confirmed Court DAREs.
- Up to 24 hours for evidence-based DAREs.

## Dispute Case Lifecycle

```text
none
filed
accepted_for_review
jury_assignment
jury_voting
verdict_reached
settlement_pending
closed
escalated
voided
```

## Jury Eligibility

Recommended baseline:

- Account age above threshold.
- Trust score above threshold.
- Completed minimum number of DAREs.
- No active sanctions.
- Not a participant.
- No detected relationship to either participant.
- KYC tier sufficient for case value.

MVP juror eligibility requires `trust_score >= 500`, `completed_dares >= 10`, active KYC, no active self-exclusion, and no current account restriction.

## Juror Assignment

Assignments are server-side and random within eligibility constraints.

Constraints:

- Avoid repeated juror-player pairings.
- Avoid jurors from the same device cluster.
- Avoid jurors with strong social or transaction ties.
- Cap open assignments per juror.
- Set deadline for vote.

## Blind Evidence Packets

Jurors review A/B packets without unnecessary identity signals.

Packet contents:

- DARE constitution
- Relevant timestamps
- Evidence A
- Evidence B
- System-scored metadata if applicable
- Dispute reason

Do not show:

- Username if not required
- Trust score
- Current vote tally before juror votes

## Vote Requirements

Each juror vote includes:

- Vote: A, B, void, or escalate
- Written rationale
- Timestamp
- Juror ID
- Case ID

The prototype requires at least 10 words for juror reasoning. Keep a minimum rationale requirement in production, but validate quality rather than word count alone.

## Verdict Rules

Recommended MVP:

- 3 jurors for low-stake disputes.
- 5 jurors for higher-stake disputes.
- Majority wins.
- Tie escalates.
- Admin can void case only with audit reason.

Possible verdicts:

- Uphold original result.
- Overturn result.
- Void DARE and refund escrow according to the DARE type.
- Escalate to admin.
- Penalize bad-faith actor.

## Trust Score

Trust score reflects reliability, fairness, and platform safety.

Positive signals:

- Completed DARE
- Clean win or loss
- On-time evidence submission
- Valid jury participation
- Dispute upheld in user's favor
- Long-term low-risk behavior

Negative signals:

- Forfeit
- No-show
- Bad-faith dispute
- Dispute ruled against user
- Jury assignment abandoned
- Collusion flag
- Payment reversal
- Abuse report upheld

Trust score is not directly editable by the client.

## Tier Effects

Tiers control:

- Max stake
- Juror eligibility
- Informal mutual-confirmation DARE eligibility
- Tournament creation
- DARE Master status
- Withdrawal speed
- Visibility in leaderboards

## Abuse Cases

### Collusion

Two or more users repeatedly create predictable outcomes to farm trust or move money.

Mitigations:

- Repeated matchup detection
- Shared device/IP signals
- Abnormal win/loss patterns
- Payment source overlap
- Manual review

### Jury Capture

Users attempt to influence or coordinate jurors.

Mitigations:

- Random assignment
- Blind evidence
- Hidden vote tallies
- Juror relationship checks
- Post-case anomaly detection

### Bad-Faith Disputes

Users dispute every loss to delay payout.

Mitigations:

- Dispute rate monitoring
- Trust penalties
- Dispute fee for repeated abuse
- Temporary dispute filing limits

## Admin Requirements

Admins need:

- Dispute queue
- Case timeline
- Evidence viewer
- Ledger view
- User history
- Risk signals
- Juror vote breakdown
- Action audit log
- Freeze/unfreeze controls
- Settlement override with reason
