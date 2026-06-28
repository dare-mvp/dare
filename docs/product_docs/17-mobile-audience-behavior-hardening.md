# Mobile Audience Behavior Hardening

## Purpose

This document captures product and implementation requirements learned from DARE's target audience behavior before engineering work begins.

It is not a plan to bring the web promotional challenge into the mobile app. The web challenge is a marketing and waitlist campaign. The requirements below apply to the core DARE mobile product: users creating, accepting, proving, watching, disputing, and settling Skill-Based or Task-Based DAREs.

The central product lesson is that the target audience is mobile-first, social, fast-tapping, trust-sensitive, and often operating with unstable or expensive data. The mobile app must guide users into safe, specific, verifiable DAREs without asking them to read long instructions or compose rules from scratch.

## Product Principle

DARE should feel like:

> Pick a clear DARE format. Adjust the details. Share or accept it. Prove it. Get a receipt.

It should not feel like:

> Fill out a legal document, understand escrow mechanics, manually explain proof requirements, and hope the other person interprets the challenge the same way.

The platform remains user-authored. Templates, validation, and guidance do not make DARE platform-authored. They provide safe starting structures for user-created DAREs.

## Behavioral Assumptions

The mobile app should assume:

- Users tap before reading.
- Users understand named examples faster than abstract categories.
- Users trust flows that look like familiar fintech and WhatsApp behaviors.
- Users are more likely to share a DARE through WhatsApp than through a generic social channel.
- Users need visible proof that money, identity, disputes, and evidence actions were received.
- Users may lose network during Court, upload, payment, KYC, or dispute flows.
- Users may create vague, unsafe, or hard-to-judge DAREs if the app allows blank free-form setup.
- Users may accept quickly based on reward, opponent, and first-visible trust signals.

## Scope

### In Scope

- DARE creation templates.
- Constitution health checks before publish.
- Friend-to-friend DARE invites and targeted DARE sharing.
- First-session guided path into the core product loop.
- Simpler create and accept money previews.
- Low-data Court behavior.
- Evidence capture guidance.
- Actionable notification rows.
- Accept-time trust and risk warnings.
- Local receipts and support-ready reference trails.
- Phone-first authentication evaluation.
- WhatsApp-native DARE sharing.
- In-app video capture for proof-based DAREs.
- Social proof in the discovery feed.
- Offline resilience and pending action handling.

### Out Of Scope

- Moving web promotional challenge tiers into the mobile app.
- Showing web waitlist campaign progress inside the mobile app.
- Claiming promotional rewards inside the mobile app.
- Turning referrals into the primary DARE product loop.
- Replacing user-authored DAREs with platform-authored challenges.
- Launching broad creator-economy or spectator-economy mechanics before the core loop is safe.

## 1. DARE Templates

### Problem

Categories such as Knowledge, Physical, Verbal, Sports, Creative, and Other help users filter and tag DAREs, but they do not reduce the cognitive load of creating a valid constitution.

A blank constitution builder asks users to define challenge text, proof method, duration, rules, tie handling, resolution path, stake/reward, and edge cases. Many users will skip or under-specify important fields, creating disputes later.

### Product Decision

Add templates as pre-filled starting points on top of categories.

Templates are not platform-authored DAREs. A template provides default structure. The user still owns the final title, stake/reward, opponent, rules, and submitted constitution.

### Example Templates

#### Fastest Answer Wins

Use for quick knowledge or verbal DAREs.

Defaults:

- Category: Knowledge or Verbal
- DARE type: Skill-Based
- Resolution: Answer Key
- Duration: 60 to 180 seconds
- Win condition: higher number of correct answers before timer ends
- Tie handling: sudden-death question or void/refund
- Proof: Court answer events, timer, recording metadata
- Dispute path: answer key plus Court event review

#### Proof Upload Task

Use for task completion where a performer submits proof.

Defaults:

- Category: Creative, Physical, Other, or local task category
- DARE type: Task-Based
- Resolution: Evidence
- Duration: configurable deadline
- Win condition: performer completes the task exactly as described
- Tie handling: not applicable; evidence is accepted, rejected, or voided
- Proof: in-app photo/video/upload with timestamp and metadata
- Dispute path: jury/admin evidence review

#### Live Witnessed Task

Use for physical, verbal, sports, or real-time skill challenges.

Defaults:

- Category: Physical, Sports, Verbal, or Creative
- DARE type: Skill-Based or Task-Based
- Resolution: Witnessed
- Duration: short live Court window
- Win condition: witnessed performance meets constitution
- Tie handling: replay, extension, or void
- Proof: LiveKit room, recording metadata, witness signals
- Dispute path: witness packet plus jury/admin review

#### Friend Challenge

Use when the creator has a specific opponent or performer in mind.

Defaults:

- Visibility: targeted invite
- DARE type: Skill-Based by default, Task-Based optional
- Resolution: selected by creator from recommended options
- Duration: short acceptance expiry plus Court deadline
- Sharing: one-tap WhatsApp/contact invite
- Dispute path: based on selected resolution mode

#### Open Reward Task

Use when a Darer funds a reward for any eligible performer.

Defaults:

- DARE type: Task-Based
- Funding model: Darer-funded reward
- Visibility: public open task
- Resolution: Evidence or Witnessed
- Performer stake: zero
- Expiry: clear deadline
- Refund rule: reward returns to Darer if expired or voided according to policy

### Template Requirements

Each template must define:

- `id`
- display name
- short description
- recommended categories
- allowed DARE types
- default DARE type
- allowed resolution modes
- default resolution mode
- default duration or deadline
- default proof requirements
- default win condition
- default tie handling
- default dispute path
- recommended stake or reward range
- safety warnings
- unavailable fields, if any

Templates should be versioned. A DARE created from a template should store the template ID and version for analytics, dispute review, and future migration.

### UX Requirements

- Template selection appears before blank constitution fields.
- Users can choose "Start from scratch", but it should not be the most prominent path for first-time users.
- Each template card uses one primary action: "Use template".
- After selecting a template, the app pre-fills the draft and routes directly to the next missing decision.
- The review screen must still show the full final constitution.

### Backend And Data Implications

Recommended data model:

- `dare_templates`
  - `id`
  - `version`
  - `name`
  - `description`
  - `category`
  - `default_dare_type`
  - `default_resolution_type`
  - `default_duration_seconds`
  - `default_rules`
  - `default_win_condition`
  - `default_tie_handling`
  - `default_proof_requirements`
  - `recommended_min_amount`
  - `recommended_max_amount`
  - `is_active`
  - `created_at`
  - `updated_at`
- `dares`
  - add nullable `template_id`
  - add nullable `template_version`

Templates can ship as app constants for the first iteration if backend delivery is not ready, but server validation must not trust template defaults from the client. Final DARE validation still runs server-side.

### Acceptance Criteria

- A first-time user can create a complete template-based DARE without typing long rules.
- A template-created DARE still produces a full immutable constitution.
- The creator can edit pre-filled values before submission.
- The server rejects invalid final DAREs even if a template was selected.
- Analytics can distinguish template-created DAREs from blank-start DAREs.

## 2. Constitution Health Checks

### Problem

Vague DAREs create disputes, support load, and settlement risk.

Examples:

- "Who wins is unclear."
- "No proof method selected."
- "Tie handling missing."
- "This task may be unsafe or hard to verify."
- "The amount is high for this user's trust/KYC tier."
- "The proof requirement does not match the selected resolution mode."

### Product Decision

Add a constitution health layer before publish.

This layer should guide users toward clear rules. It should block only high-risk or structurally invalid DAREs and warn on issues that can be accepted with confirmation.

### Health Levels

#### Valid

The DARE can be submitted.

#### Warning

The user can continue after explicit acknowledgement.

Examples:

- Unusual stake/reward for category.
- Broad completion language.
- Missing optional edge-case details.
- High-dispute opponent warning.

#### Blocking

The DARE cannot be submitted until fixed.

Examples:

- Missing win condition.
- Missing proof method.
- Missing stake/reward.
- Missing duration or deadline.
- No tie/void handling for competitive Skill-Based DARE.
- Unsafe or prohibited content.
- Resolution mode incompatible with proof requirement.
- User lacks KYC, balance, or responsible-gaming eligibility.

### Validation Surfaces

Checks should run:

- per create step
- on review screen
- server-side on submit
- before accept if a DARE's constitution is incomplete or outdated
- during admin/jury review as context

### Required Health Checks

Constitution clarity:

- Title is specific.
- Challenge description states what must happen.
- Win condition is explicit.
- Task completion rule is explicit.
- Tie handling or void policy exists where required.
- Deadline/duration exists.

Proof and resolution:

- Proof method exists.
- Proof method matches resolution mode.
- Evidence format is allowed.
- In-app capture is required for high-risk evidence types.
- Witnessed DARE has Court/live requirements.
- Answer Key DARE has committed prompt/answer rules.

Money and eligibility:

- Stake/reward is greater than zero where required.
- Task-Based performer stake is zero.
- Creator has enough available balance where escrow is locked upfront.
- Stake/reward fits KYC tier.
- Stake/reward fits responsible-gaming limits.
- Fees and expected payout can be calculated by the server.

Safety and policy:

- DARE does not request illegal, dangerous, abusive, hateful, sexual, exploitative, or self-harm content.
- Physical DAREs include safety warning and proof requirements.
- Location-sensitive or real-world tasks are not allowed unless the current phase supports them.

### UX Requirements

- Health issues should appear as direct next actions, not generic warnings.
- Use plain labels such as "Add proof", "Set tie rule", "Lower stake", "Change resolution".
- The review screen should show a compact "Ready to publish" or "Fix 3 items" state.
- Blocking issues must move the user to the exact field that needs fixing.

### Backend And Security Requirements

- Client-side checks are advisory only.
- Server-side create/accept routes must repeat structural and eligibility validation.
- Prohibited content checks must run server-side before publishing a public DARE.
- Validation responses should use typed error codes and field paths.
- Avoid logging raw KYC data, private answer keys, raw evidence, access tokens, or payment secrets.

### Acceptance Criteria

- The app blocks a DARE with no proof method.
- The app blocks a competitive DARE with no win condition.
- The app blocks a Skill-Based DARE without tie/void handling.
- The app warns, but does not always block, broad wording that can still be judged.
- Server create rejects invalid submissions even if the client validation is bypassed.

## 3. Friend-To-Friend DARE Invites

### Problem

Many DAREs will begin socially between people who already know each other. If the only creation path is a public feed, the app misses a natural "I dare you" behavior.

### Product Decision

Support targeted DARE invites as a first-class creation path.

Flow:

1. Creator picks a template or starts from scratch.
2. Creator chooses Open DARE or Targeted Invite.
3. Creator creates the DARE.
4. Server locks creator escrow when required.
5. App generates a deep link.
6. Creator shares via WhatsApp/contact/native share.
7. Invitee opens DARE detail or accept screen.
8. Server validates eligibility before accept.

### UX Requirements

- "Open to anyone" and "Send to someone" should be clear options.
- WhatsApp should be a visible share action where platform policy allows.
- Shared text should be pre-filled and short.
- Invite links must open directly to DARE detail, not the generic feed.
- If invitee is unauthenticated, they should see DARE context before signup where safe.
- If invitee cannot accept, the screen should show the exact reason and next action.

### Deep Link Requirements

Required routes:

- public DARE detail: `/dare/{id}`
- accept: `/dare/{id}/accept`
- Court ready: `/court/ready?dareId={id}`
- result: `/court/result?dareId={id}`

Deep links should support:

- cold app launch
- already installed app
- web fallback when app is not installed
- expired or already-accepted DARE state
- targeted-to-someone-else state

### Security Requirements

- A link must never bypass accept validation.
- Targeted DAREs must enforce intended recipient rules server-side.
- Link previews must not expose private evidence, private answer keys, KYC, wallet, or risk data.
- Invite abuse should be rate-limited.

### Acceptance Criteria

- A creator can send a targeted DARE through WhatsApp.
- An invitee lands on the specific DARE detail.
- An ineligible invitee sees the reason they cannot accept.
- A DARE already accepted by someone else cannot be accepted again.
- Link sharing does not expose private account or wallet data.

## 4. First-Session Guided Path

### Problem

New users may not understand a peer-to-peer challenge economy with escrow, Court, proof, jury, and settlement. Landing directly in a dense feed can create confusion.

### Product Decision

Add a first-session path that gets users into one obvious low-risk action.

Recommended choices:

- Create your first DARE.
- Accept a low-stakes DARE.
- Watch a live Court.
- Try a practice DARE.

### Practice DARE

A practice DARE should teach the loop without real money.

Rules:

- No escrow.
- No wallet balance changes.
- No trust score impact.
- Clearly labelled as practice.
- Uses a simplified Court or proof flow.
- Ends with a receipt-like summary and next action.

### UX Requirements

- The first-session path should appear after account creation/profile setup or first feed entry.
- It should have one primary action.
- It should not block browsing forever.
- It should not imply the user won real money or changed trust score.
- Returning users should not repeatedly see the same tutorial.

### Acceptance Criteria

- A new user can understand Create, Accept, Court, Proof, and Settlement at a high level within one guided flow.
- Practice actions cannot create ledger, escrow, payout, or trust-score changes.
- The app stores local or server state that the first-session path was completed or dismissed.

## 5. Simpler Money Previews

### Problem

Users will make fast decisions around money. They need direct, unambiguous money states before create and accept.

### Product Decision

Create and accept screens must show a blunt money preview with server-derived values.

Required display:

- `You lock: NGN X`
- `They lock: NGN Y`
- `Winner receives: NGN Z`
- `Platform fee: NGN F`
- `Refund if expired: NGN X`
- `Dispute hold: possible`

Task-Based DARE display:

- `Darer reward locked: NGN X`
- `Performer stake: NGN 0`
- `Performer receives after valid completion: NGN Z`
- `Refund if expired: reward returns to Darer according to policy`

### UX Requirements

- Money preview appears before final submit/accept.
- Use explicit money verbs: locked, pending, refunded, paid out, held.
- Do not use "won" as a money state before settlement is confirmed.
- Do not show provider-pending deposits as available money.

### Backend Requirements

- Mobile should call quote/preview endpoints for create and accept.
- Server response should include all display amounts and eligibility gates.
- Client-calculated display can exist for draft feedback but must be labelled as estimated until server quote returns.

### Acceptance Criteria

- User sees exact escrow amount before create.
- User sees exact amount to be locked before accept.
- Task-Based accept clearly shows performer stake is zero.
- Fee and payout values come from server quote before irreversible action.

## 6. Low-Data Court Mode

### Problem

Unstable or expensive mobile data can break Court sessions. A failed Court due to connectivity will feel unfair, especially when money is locked.

### Product Decision

Court must support low-data and reconnect-aware behavior.

### Required Capabilities

- Reconnect banner.
- Heartbeat failure warning.
- Visible forfeit countdown when applicable.
- Audio-only or camera-off mode where the DARE's proof rules allow it.
- Reduced video quality option where LiveKit supports it.
- Court constitution cached after accept.
- Current required action stays visible while reconnecting.
- Fallback polling when realtime disconnects.
- Upload retry for evidence.

### Rules

- Low-data mode cannot weaken proof requirements.
- If video is required by the constitution, camera-off mode should be blocked or clearly marked as invalid for proof.
- Server remains authoritative for timer, presence, forfeits, and result.
- Client cannot extend deadlines locally.

### Acceptance Criteria

- Reconnect state appears within one failed heartbeat interval.
- User sees how long before forfeit risk applies.
- Court can recover from short network interruptions.
- Evidence uploads can retry without creating duplicate submitted evidence.

## 7. Evidence Capture Guidance

### Problem

Bad evidence creates bad jury decisions, disputes, and support tickets.

### Product Decision

Guide users at the moment of capture or upload.

### Required Prompts

For video:

- Show the task clearly.
- Keep the full attempt in frame.
- Record until the timer ends.
- Do not upload edited proof.
- Make sure audio is clear if the DARE depends on speech.

For images:

- Capture the required result clearly.
- Avoid cropped or blurry proof.
- Include required before/after details if the constitution asks for them.

For screen recordings:

- Start before the attempt.
- Keep the relevant app or page visible.
- Do not cut the recording before the required result appears.

### UX Requirements

- Guidance appears before capture and inside failed upload states.
- Evidence requirements from the constitution should be summarized at upload time.
- Upload status must distinguish selected, uploading, uploaded, and confirmed.
- Confirmation must be a separate server action after storage succeeds.

### Security Requirements

- Evidence is private by default.
- Storage paths and signed URLs are not exposed beyond authorized users.
- File type and size limits are enforced client-side and server-side.
- Evidence metadata is stored without excessive personal/device data.
- Access to evidence is audit-logged.

### Acceptance Criteria

- Users see proof guidance before recording/uploading.
- Failed upload does not show submitted state.
- Evidence appears submitted only after server confirmation.
- Jury/admin evidence packet includes the constitution's proof requirement.

## 8. Actionable Notifications

### Problem

Notifications are high-intent moments. If tapping a notification only marks it as read, the user hits a dead end.

### Product Decision

Every notification row must route to a destination or explicitly explain why no action is available.

Examples:

- Court starting -> Court ready/play.
- DARE accepted -> Court ready.
- KYC rejected -> KYC status/correction.
- Dispute needs evidence -> evidence upload.
- Jury invite -> jury assignment.
- Wallet update -> transaction detail.
- Withdrawal failed -> withdrawal receipt or support path.

### Requirements

- Push notification routing and in-app notification routing should use the same destination resolver.
- Notification payloads must include typed action data.
- Missing or invalid action data should fall back to a safe destination.
- Tapping a notification can mark it read, but it must also navigate when a destination exists.

### Acceptance Criteria

- Every known notification type has a tested destination.
- In-app notification rows and push notifications route consistently.
- Read state syncs after tap without blocking navigation.

## 9. Accept-Time Trust Warnings

### Problem

Users may accept quickly based on reward or social pressure. Trust and risk signals must be visible before they commit funds or time.

### Product Decision

Show direct trust warnings during accept, not only on feed cards.

### Warning Types

Opponent/account:

- Low trust opponent.
- New account.
- High dispute history.
- Recent forfeits.
- Account limited or under review.

DARE/constitution:

- Rules are incomplete.
- Proof method is weak.
- Tie handling unclear.
- Subjective outcome likely needs jury review.

Money:

- High stake for your tier.
- This action exceeds a responsible-gaming limit.
- Deposit required before accepting.

### UX Requirements

- Warnings appear above the final accept button.
- Blocking warnings disable accept and route to the fix.
- Non-blocking warnings require acknowledgement when risk is material.
- Keep warning copy short and concrete.

### Backend Requirements

- Accept quote should include capability flags and risk warnings.
- Server accept repeats all eligibility and state checks.
- Risk signals shown to users should avoid exposing private fraud/risk internals.

### Acceptance Criteria

- Accept flow warns on low trust or new accounts when data is available.
- Accept is blocked when DARE state, KYC, balance, limits, or targeting rules fail.
- User cannot accept a DARE by dismissing a server-blocking risk.

## 10. Local Support And Receipt Trail

### Problem

For money, identity, evidence, and disputes, users need proof that the app received their action.

### Product Decision

Every irreversible or support-sensitive action should produce a receipt state.

Receipt surfaces:

- Deposit initialized.
- Deposit confirmed.
- Withdrawal requested.
- Withdrawal approved/rejected/failed.
- DARE created.
- DARE accepted.
- Escrow locked.
- Evidence uploaded and confirmed.
- Dispute filed.
- Jury vote submitted.
- KYC submitted/rejected/approved.
- Settlement completed.
- Account restriction applied.

### Receipt Requirements

Each receipt should show:

- action type
- status
- timestamp
- reference ID
- DARE ID or transaction ID when relevant
- amount where relevant
- next action
- support link or support copy where relevant

### UX Requirements

- Receipts should be easy to screenshot.
- Do not expose secrets, access tokens, full bank data, private evidence links, or KYC document data.
- Status copy must distinguish pending from confirmed.

### Acceptance Criteria

- All money-moving actions end in a receipt or pending status screen.
- Evidence and dispute actions provide a reference ID.
- Support can identify the action from the receipt reference.

## 11. Phone-First Authentication

### Problem

Email/password is not the strongest default identity pattern for many Nigerian and Kenyan mobile-first users. Phone + OTP is familiar from WhatsApp, mobile money, neobanks, and local fintech products.

### Product Decision

Evaluate phone + OTP as a primary or parallel authentication option before wider launch.

This does not remove email support. It adds a lower-friction path aligned with local behavior.

### Requirements

- Phone number input with country code.
- OTP request and verification.
- Rate limiting by phone, IP/device, and account.
- Clear retry timers.
- Secure session creation through Supabase Auth or selected auth provider.
- Account linking rules for users who already signed up with email.
- Recovery path for lost phone numbers.
- Abuse monitoring for OTP spam.

### Security Requirements

- Never log OTP values.
- Do not reveal whether a phone number belongs to a high-value account.
- Rate-limit OTP sends and verification attempts.
- Protect against SIM swap risk for withdrawals and sensitive account changes.
- Consider step-up verification for withdrawals, KYC changes, and account recovery.

### Acceptance Criteria

- User can sign up and sign in with phone + OTP.
- OTP resend is rate-limited with visible timer.
- Existing users can link a phone without creating duplicate accounts.
- Sensitive flows can require stronger re-verification.

## 12. WhatsApp-Native DARE Sharing

### Problem

Generic share sheets are useful but not enough for a market where WhatsApp groups and direct chats are a primary sharing channel.

### Product Decision

Add WhatsApp-specific DARE sharing for core DARE invites and public DARE discovery.

This is not web campaign sharing. It is the core "send this DARE to a friend" behavior.

### Requirements

- One-tap "Share on WhatsApp" from DARE detail, create receipt, and targeted invite receipt.
- Pre-filled message with DARE title, stake/reward, proof type, expiry, and link.
- Link lands on DARE detail or accept flow.
- Message should be short enough to scan in a chat.
- Native share remains available as secondary option.

### Security Requirements

- Shared messages must not include private wallet, KYC, risk, evidence, or answer-key data.
- Links must not bypass auth, KYC, balance, targeting, or accept validation.
- Share action should be rate-limited if abuse emerges.

### Acceptance Criteria

- User can share a DARE directly to WhatsApp where supported.
- Recipient lands on the exact DARE.
- Expired/already accepted links show current state and next action.

## 13. In-App Video DARE Recording

### Problem

For witnessed and evidence-based DAREs, asking users to leave the app, record elsewhere, and upload later breaks the proof flow and weakens trust.

### Product Decision

Add in-app capture for video evidence where the selected DARE template or proof method requires it.

### Requirements

- Request camera/microphone permission only at capture time or Live Court entry.
- Show proof guidance before recording.
- Support short guided recordings for common formats.
- Attach DARE ID, user ID, capture time, upload status, and content hash.
- Upload with progress, retry, and failure recovery.
- Confirm evidence only after server-side storage confirmation.

### Security And Privacy Requirements

- Do not keep raw ID or evidence media in app state longer than needed.
- Store evidence privately.
- Use signed URLs for authorized review.
- Enforce file size, duration, and type limits.
- Preserve metadata needed for dispute review without collecting unnecessary device data.

### Acceptance Criteria

- User can record required proof without leaving the app.
- Upload retry does not duplicate final evidence.
- Evidence is not marked submitted until confirmed.
- Court/jury packet can reference the evidence object.

### Implementation Status

Implemented in the mobile evidence upload flow with an embedded `expo-camera` capture surface. Camera and microphone permissions are requested at capture time, photo/video captures are normalized into the same evidence file contract as library and document uploads, and existing upload confirmation rules still prevent evidence from appearing submitted before server confirmation.

## 14. Social Proof Feed

### Problem

The feed shows open DAREs, but it should also communicate that real activity is happening. Users respond to visible proof that others are playing, winning, watching, and settling.

### Product Decision

Add compact social proof signals to discovery without turning the feed into a casino-like ticker.

### Candidate Signals

- Recently settled DAREs.
- Trending DARE categories.
- Live Courts with spectator counts.
- Top trusted players.
- Fastest accepted open DAREs.
- Recent payouts after confirmed settlement.

### Copy Rules

- Only show confirmed events.
- Do not imply a payout before settlement is complete.
- Avoid manipulative urgency around money.
- Do not expose sensitive user details.

### Acceptance Criteria

- Feed can show at least one confirmed activity module.
- Settlement/payout labels are server-confirmed.
- Users can tap social proof items into relevant public detail or result views.

### Implementation Status

Implemented with the `GET /activity/social-proof` actions endpoint. The endpoint returns server-confirmed settlement events, posted payout/refund labels, live Court counts, public aggregate counts, and safe public player/category signals. Mobile prefers this endpoint and falls back to feed-derived counts only when confirmed activity sync is unavailable. Production scale may still require a database read-model view or cached projection, but the product correctness gap is closed.

## 15. Offline Resilience And Pending Queue

### Problem

An unstable network should not silently break important actions.

### Product Decision

Add explicit offline handling and a constrained pending queue.

### Cache Locally

- Accepted DARE constitution.
- Current Court ID and last known state.
- Draft create flow.
- Evidence upload file reference until confirmed or discarded.
- Last synced feed and wallet summaries with stale labels.

### Queue Carefully

Safe to queue:

- draft saves
- profile edits
- non-money evidence upload retry metadata
- notification read state

Use extreme caution or do not queue:

- create DARE final submit
- accept DARE
- ready-up
- result claims
- wallet deposits
- withdrawals
- settlement actions

Sensitive actions should generally require live server confirmation because state may change while the user is offline.

### UX Requirements

- Show offline banner globally.
- Show stale data timestamps.
- Disable money-moving and escrow-changing actions offline.
- Provide retry buttons.
- Explain when an action must wait for connection.

### Acceptance Criteria

- App clearly shows offline state.
- Money-moving actions cannot appear successful offline.
- Drafts survive app restart.
- Evidence upload failure can resume or restart cleanly.

## Prioritization

### Phase A: Immediate Product Hardening

Build first:

1. DARE templates.
2. Constitution health checks.
3. Simpler money previews.
4. Actionable notification rows.
5. Accept-time trust warnings.
6. Receipt trail.

These directly reduce failed creation, bad accept decisions, disputes, and money trust issues.

### Phase B: Social And Activation

Build next:

1. Friend-to-friend targeted invites.
2. WhatsApp-native sharing.
3. First-session guided path.
4. Social proof feed.

These improve liquidity and onboarding without weakening trust.

### Phase C: Court And Connectivity

Build after the core loop is stable:

1. Low-data Court mode.
2. In-app video capture.
3. Evidence guidance improvements.
4. Offline resilience and pending upload recovery.

These protect high-risk live and evidence-based flows.

### Phase D: Identity Expansion

Evaluate and build:

1. Phone + OTP authentication.
2. Account linking.
3. Step-up verification for sensitive actions.

This should be designed with abuse prevention and account recovery before rollout.

## Analytics

Track:

- `template_selected`
- `template_dare_created`
- `blank_dare_created`
- `constitution_health_warning_shown`
- `constitution_health_blocked`
- `constitution_health_fixed`
- `targeted_invite_created`
- `dare_shared_whatsapp`
- `dare_deep_link_opened`
- `first_session_path_started`
- `practice_dare_completed`
- `money_preview_seen`
- `accept_trust_warning_seen`
- `accept_trust_warning_acknowledged`
- `notification_action_opened`
- `receipt_viewed`
- `court_low_data_enabled`
- `court_reconnect_warning_seen`
- `evidence_guidance_seen`
- `evidence_capture_started`
- `evidence_upload_retry`
- `offline_banner_seen`
- `offline_action_blocked`
- `phone_otp_started`
- `phone_otp_verified`

Never track:

- raw OTPs
- raw answer keys
- raw KYC document data
- bank account numbers
- payment secrets
- access tokens
- raw evidence file content
- private signed evidence URLs

## Testing Requirements

### Unit Tests

- Template-to-draft mapping.
- Constitution health checks.
- Money preview formatting.
- Task-Based zero performer stake display.
- Trust warning copy selection.
- Notification destination resolution.
- Receipt data formatting.
- Offline action gating.

### Component Tests

- Template picker.
- Constitution health panel.
- Money preview panel.
- Invite/share action panel.
- Accept trust warning panel.
- Receipt screen.
- Evidence capture guidance panel.
- Offline banner.

### Integration Tests

- Create DARE from template -> review -> server create.
- Create targeted DARE -> share link -> recipient opens detail.
- Accept DARE with trust warning -> acknowledgement -> accept.
- Notification tap -> mark read -> route to target.
- Evidence upload failure -> retry -> confirm.
- Offline draft -> app restart -> draft restored.

### Security Tests

- Deep link cannot bypass accept validation.
- Targeted DARE cannot be accepted by wrong user.
- Client-side template defaults cannot bypass server validation.
- Offline sensitive actions cannot show false success.
- Evidence URLs are not leaked in logs or notifications.
- OTP attempts are rate-limited.

## Definition Of Done

A behavioral hardening feature is done only when:

- It keeps one clear primary action on screen.
- It handles loading, error, offline, and restricted states.
- Server-side validation protects all sensitive outcomes.
- Money, escrow, settlement, and trust states are never client-authoritative.
- Receipts exist for support-sensitive actions.
- Deep links route to the exact action without bypassing authorization.
- Copy is short, concrete, and action-oriented.
- Accessibility labels and touch targets meet the mobile UI spec.
- Tests cover the core happy path and the main failure path.
