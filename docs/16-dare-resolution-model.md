# DARE Resolution Model

## Product Decision

DARE is a user-authored skill challenge platform. The platform does not generate the challenge questions or tasks for players.

The player who creates a DARE defines the challenge, rules, proof requirements, time limits, win condition, tie handling, and dispute path. The platform provides the trust layer around that challenge:

- escrow
- live Court session
- participant readiness and presence
- timer
- LiveKit Cloud video room
- audience/witness participation
- Court recording, evidence capture, and storage
- dispute filing
- jury/admin review
- settlement
- trust score updates

Any implementation that makes DARE feel like the platform owns the challenge content is misaligned with the product.

## DARE Types And Stake Models

Every DARE keeps the same product pattern:

- public or targeted social challenge
- creator-authored constitution
- escrow-backed commitment
- live Court or proof flow
- witnessed, answer-key, or evidence-based resolution
- dispute path
- server-side settlement
- trust score impact

The difference between DARE types is the stake model, not the proof or resolution pattern.

### Skill-Based DARE

Use this when two participants compete against each other.

- The Darer creates the DARE and commits a stake.
- The Challenger accepts and commits a matching stake.
- Both stakes are held in escrow.
- The winner receives the eligible settlement payout after fees.
- If the DARE is voided, escrow is refunded according to the constitution and platform policy.

### Task-Based DARE

Use this when the Darer puts up a reward for someone else to complete a task.

- The Darer creates the DARE and funds the reward.
- The Performer accepts or claims the task without staking their own money.
- The Darer's reward is held in escrow.
- The Performer receives the eligible reward after valid completion.
- If the task expires, is cancelled before acceptance, or is voided, the remaining escrow returns to the Darer according to the constitution and platform policy.

Task-Based DAREs are not a separate product pattern. They remain public, social, witnessed, evidence-based, and dispute-resolvable. The only funding difference is that one side, the Darer, puts money on the line.

## Deprecated Concept: Platform-Authored Challenge Content

The current static `quiz_questions` model is a prototype artifact and is not the production product direction.

It remains only as legacy implementation scaffolding while the live Court and dispute system are rebuilt. It does not drive the MVP user experience.

Do not add more production work that depends on platform-authored questions or tasks as the primary challenge mechanic.

## Supported Production Resolution Modes

### 1. Pre-Committed Answer Key

Use this when the DARE has objective answers, such as knowledge, trivia, spelling, calculation, or rules-based tasks.

Example:

> "I will ask 10 questions about Nigerian fintech history. You win if you answer 7 or more correctly. Each answer has 15 seconds. No external help."

Flow:

1. Issuer creates the DARE and writes the public constitution.
2. Issuer submits private prompts and an answer key before Court starts.
3. The private answer key is hashed/committed server-side and hidden from the challenger.
4. Required participants enter Court.
5. Questions are asked live by the issuer, shown from the committed list, or revealed by the platform from issuer-authored prompts.
6. Challenger answers live.
7. Court records timing, presence, video/evidence metadata, and answer events.
8. Server compares submitted answers to the committed answer key where exact matching is possible.
9. If either side disputes, the answer key, transcript, recording, constitution, and witness/audience signals form the review packet.

Security requirements:

- The issuer cannot change the answer key after commitment.
- The challenger cannot see the answer key before answering.
- Answer key revisions require all required participants to accept the revision or a new DARE.
- The server records enough evidence to audit timing and answer submission.

### 2. Witnessed Live Skill

Use this when the DARE depends on observed performance, judgment, proof, or subjective evaluation.

Examples:

- physical feat
- creative challenge
- sports skill
- verbal debate
- real-world task
- live challenge where correctness depends on context

Flow:

1. Issuer creates a public constitution with explicit proof and win conditions.
2. Challenger or Performer accepts after reviewing the constitution.
3. Required participants enter Court.
4. Court starts a server-authoritative timer and presence session.
5. Spectators/audience can watch through LiveKit Cloud, chat, and submit witness signals when eligible.
6. Participants submit live proof or recorded evidence when required.
7. If all required participants agree, result can proceed to settlement.
8. If there is disagreement, a jury/admin review uses the constitution, recordings, evidence, witness signals, and participant claims.
9. Settlement follows the final accepted result or verdict.

Security requirements:

- Witness voting must have anti-sybil controls.
- Jury packets are blinded by default; identity is revealed only to admins when required for safety or fraud review.
- Evidence must be private by default and accessed through signed URLs.
- The platform preserves an append-only audit trail for disputed outcomes.

### 3. Evidence Review

Use this when the DARE outcome depends primarily on submitted proof rather than immediate answer matching or live witness signals.

Examples:

- before/after proof
- recorded physical task
- screen recording
- creative submission
- location or completion proof
- any task where the judging packet matters more than live scoring

Flow:

1. Issuer creates a public constitution with exact evidence requirements.
2. Challenger or Performer accepts after reviewing the required proof format.
3. Court opens with server-authoritative timing, LiveKit Cloud video, participant presence, and recording consent.
4. Participants perform live; they can also capture or upload proof through approved app flows.
5. Evidence is stored privately with metadata, content hashes for uploaded files, and signed access.
6. If all required participants accept the submitted result, settlement can proceed.
7. If there is disagreement or policy requires review, a blinded jury/admin packet is created.
8. Jury/admin review follows the constitution and submitted evidence.
9. Settlement follows the final verdict, void/refund policy, or admin escalation.

Security requirements:

- Evidence capture uses in-app capture for high-risk formats.
- Uploaded files must be private, size-limited, type-validated, and malware/metadata reviewed before broader access.
- Evidence access must be logged.
- Jury packets hide unnecessary identity information from jurors.
- The client never decides the winner from uploaded media.

## Resolution Type Naming

Production naming is:

- `answer_key`: objective creator-authored questions/tasks with a committed answer key.
- `witnessed`: live audience/witness assisted result.
- `evidence`: proof submission with jury/admin review.

Resolution type is independent of DARE type. Valid combinations include:

- Skill-Based + Answer Key
- Skill-Based + Witnessed
- Skill-Based + Evidence
- Task-Based + Answer Key
- Task-Based + Witnessed
- Task-Based + Evidence

## MVP Direction

The MVP proves user-authored Court flows, not platform-authored challenge content.

Recommended MVP:

1. Skill-Based DARE with two-sided escrow.
2. Task-Based DARE with Darer-funded reward escrow.
3. Creator-authored Answer Key DARE with committed answer rules.
4. Witnessed DARE with live audience/witness signals.
5. Evidence DARE with private proof capture/upload and review.
6. Live Court with LiveKit Cloud video, timer, participant presence, chat, recording, and event metadata.
7. Dispute path with evidence packet and jury/admin review.
8. Server-side settlement after dispute window or verdict.

This keeps the MVP close to what DARE stands for: users create the dare, the platform makes it trustworthy.

## Implementation Implications

Replace platform-authored challenge assumptions with these domain concepts:

- `dare_type`: `skill` for two-sided stake DAREs or `task` for Darer-funded reward DAREs.
- `funding_model`: `two_sided_stake` or `darer_reward`.
- `dare_resolution_config`: stores resolution mode and required proof rules.
- `dare_prompts`: issuer-authored prompt/question records for Answer Key DAREs.
- `dare_answer_keys`: private committed answer records or answer hashes.
- `court_events`: append-only events for prompts asked, answers given, witness votes, result claims, and confirmations.
- `live_court_rooms`: LiveKit room metadata, provider state, and audience/recording flags.
- `live_court_participants`: participant/spectator video presence and recording consent.
- `live_court_recordings`: LiveKit egress recording metadata and private storage links.
- `court_recordings` or `evidence_objects`: media metadata and storage links when used by older code paths or uploaded evidence.
- `witness_votes`: audience/witness result signals with eligibility controls.
- `result_claims`: participant-submitted winner/score claims.

Settlement never trusts a client-computed winner. It follows:

1. both-party confirmed result, or
2. answer-key verified result, or
3. jury/admin verdict, or
4. void/refund policy.
