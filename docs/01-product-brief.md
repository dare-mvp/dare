# DARE Product Brief

## Purpose

DARE is a mobile-first social challenge platform where users create, accept, watch, and resolve skill-based challenges with clearly defined rules and optional financial stakes.

The product should not be framed as a generic betting app. Its stronger position is a trust-based challenge economy: users compete on ability, evidence, reputation, and community adjudication.

## Product Thesis

People already challenge each other informally: "I bet you cannot do this", "prove it", "run this errand faster", "answer this", "beat me at this". DARE turns that social behavior into a structured, auditable, mobile-native experience.

DARE succeeds if it makes three things reliable:

- The rules of the challenge are clear before anyone commits.
- The funds or rewards are handled transparently and safely.
- The winner is determined by a trusted process.

## Core Promise

Challenge anything. Prove it. Resolve it fairly.

## Target Users

- Competitive mobile-first users who enjoy peer challenges.
- Skill-based creators who can build reputation through repeated wins.
- Spectators who want live social entertainment.
- Jurors who earn trust and rewards by resolving disputes.
- Local communities that need lightweight challenge, errand, and proof workflows.

## Product Pillars

### 1. Constitution First

Every DARE must have a clear "constitution" before it can be accepted:

- Challenge title or test
- Category
- Duration
- Stake or reward
- Rules
- Proof method
- Resolution type
- Edge-case handling

### 2. Trust Before Virality

The product is built around trust score, juror reputation, payment integrity, and transparent dispute handling. Growth mechanics must not weaken the integrity model.

### 3. Mobile Money Native

Wallet, escrow, deposits, withdrawals, and payouts are core product surfaces. They must be server-authoritative and audit-friendly before any real-money launch.

### 4. Low-Data African Market Fit

The mobile app should work well on unstable networks and prepaid data plans. The broader strategy also calls for USSD support for balance checks, accepting pending DAREs, and simple wallet actions.

### 5. Community Resolution

DARE uses a jury model for disputed or evidence-based outcomes. This gives the product a culturally resonant governance layer instead of opaque support tickets.

## Primary User Loop

1. A user creates a DARE with a constitution.
2. Another user accepts it after reviewing the terms.
3. Both users commit stakes or rewards into escrow.
4. The DARE runs in the Court.
5. The outcome is resolved by scoring, audience vote, evidence, or jury review.
6. Escrow is released and trust scores update.
7. The result becomes part of each user's reputation.

## Prototype Inputs

The existing single-page prototype already demonstrates:

- Auth and profile creation
- Feed and leaderboard
- Five-step DARE creation flow
- Challenge accept modal
- Court experience
- Quiz scoring
- Spectator voting
- Chat
- Evidence recording/upload concepts
- Jury room
- Wallet and transactions
- Notifications
- Admin dispute/risk view

The rebuild should keep the product model, not the implementation structure.

## Non-Goals For The First Mobile MVP

- Do not ship all DARE types at once.
- Do not launch real-money staking before compliance, payment approval, KYC, escrow, and fraud monitoring are ready.
- Do not depend on client-side wallet or payout logic.
- Do not treat tournaments, creator fees, or AI voice creation as MVP blockers.

## Success Definition

The first production-ready MVP is successful when a user can safely:

- Register and complete required verification.
- Deposit funds through a verified payment flow.
- Create or accept a supported DARE type.
- Have funds locked in escrow by the server.
- Complete the DARE.
- Receive a server-determined result.
- See wallet, transaction, and trust score updates.
- File a dispute when allowed.

