# Mobile App Information Architecture

## Product Navigation Model

The prototype uses a desktop-style sidebar. The mobile app should use a native mobile information architecture.

Recommended primary tabs:

1. Feed
2. Create
3. Court
4. Wallet
5. Profile

Secondary surfaces:

- Notifications
- Jury
- Admin/Risk
- Settings
- Support

## Tab 1: Feed

Purpose:

- Discover open and live DAREs.
- Show social proof and liquidity.
- Route users into accept, spectate, or create actions.

Key components:

- Filter chips
- Open DARE cards
- Live DARE cards
- Category filters
- Stake range filters
- Near me filter, later phase
- Top players
- Empty state

Card must show:

- Title
- Category
- Stake
- Resolution type
- Issuer trust score
- Time remaining
- Accept/spectate/result state

## Tab 2: Create

Purpose:

- Build a DARE constitution.

Recommended mobile flow:

1. Type and category
2. Define challenge
3. Proof and duration
4. Stake and payout
5. Rules
6. Review

Mobile requirements:

- Save draft.
- Validate per step.
- Show sticky payout/escrow preview.
- Warn before abandoning draft.
- Keep inputs short and structured.

## Tab 3: Court

Purpose:

- Live DARE experience.

States:

- No active DARE
- Waiting for opponent
- Ready check
- Countdown
- Active match
- Uploading evidence
- Awaiting result
- Result
- Disputed

Core UI:

- Timer
- Player A/B cards
- Score
- Current prompt/question
- Answer controls
- Stake summary
- Chat
- Spectator count
- Constitution drawer
- Connection status

Mobile constraints:

- Timer and current action must stay visible.
- Chat should not block play.
- Reconnect state must be explicit.
- Avoid dense desktop sidebars.

## Tab 4: Wallet

Purpose:

- Make money state transparent.

Required sections:

- Available balance
- Escrowed balance
- Pending payout
- Deposit
- Withdraw
- Limits and KYC tier
- Transaction history
- Dispute holds

Transaction row should show:

- Type
- Amount
- Direction
- Status
- DARE reference, if applicable
- Provider reference, when relevant
- Timestamp

## Tab 5: Profile

Purpose:

- Show identity, trust, history, and settings.

Required sections:

- Username/display name
- Trust score and tier
- Win/loss record
- Completed DAREs
- Dispute history summary
- Recent DAREs
- Jury eligibility
- Verification status
- Settings

## Notifications

Notification types:

- DARE accepted
- Targeted DARE received
- Match starting
- Result ready
- Dispute filed
- Jury invite
- Wallet update
- Withdrawal status
- Trust score change
- Admin/risk action

Each notification should have a clear destination.

## Jury

Jury should not be a primary tab for all users initially. It can live under Profile or Notifications until the juror economy is active.

Jury screens:

- Jury eligibility
- Available cases
- Assigned cases
- Case detail
- Evidence review
- Vote confirmation
- Completion receipt

## Admin / Risk

Not part of the consumer app for MVP unless required for internal mobile operations. Prefer a separate secure web console.

## Empty States

Important empty states:

- No open DAREs
- No active Court
- No wallet transactions
- No jury cases
- No notifications
- KYC required
- Deposit required
- Network offline

Empty states should offer a next action, not generic text.

## Accessibility

Mobile UI must support:

- Screen reader labels
- Large touch targets
- High contrast
- Text scaling
- Visible focus states where applicable
- Reduced motion
- Clear error messages

## Offline And Poor Network Behavior

Required:

- Show stale data indicators.
- Cache DARE constitution after accept.
- Retry failed non-sensitive requests.
- Never fake wallet success offline.
- Clearly show when Court is reconnecting.
- Preserve draft creation inputs locally.

