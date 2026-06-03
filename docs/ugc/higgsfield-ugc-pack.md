# DARE Mobile Higgsfield UGC Pack

## Purpose

Create UGC-style vertical videos that show the exact look and product feel of the DARE mobile app. The creative should feel like a real person demonstrating a regulated, skill-first challenge app, not a betting app, crypto app, casino ad, or generic fintech mockup.

Primary format:

- Platform: Higgsfield Marketing Studio
- Mode: `ugc` or `ugc_how_to`
- Aspect ratio: `9:16`
- Duration: 15s primary, 30s extended
- Resolution: 720p for fast iteration
- Product reference: DARE mobile app screenshots in `docs/ugc/screenshots`

## Higgsfield Execution Checklist

1. Upload the screenshots in `docs/ugc/screenshots` as product/app reference media before generating.
2. Use `auth-welcome.png`, `feed.png`, `create.png`, `court.png`, `wallet.png`, and `profile.png` as the minimum reference set.
3. If using a presenter, choose one adult avatar reference from `avatar_assets/man` or `avatar_assets/woman`.
4. Use Marketing Studio video mode `ugc` for the 15s version and `ugc_how_to` for the 30s version.
5. Paste the matching Higgsfield prompt and the negative prompt together.
6. Reject any generation where the phone UI changes the DARE logo, tab names, screen headings, orange action color, wallet states, or Court layout.

## Reference Assets

Use these local screenshots as the product/app references:

- `docs/ugc/screenshots/auth-welcome.png`
- `docs/ugc/screenshots/feed.png`
- `docs/ugc/screenshots/create.png`
- `docs/ugc/screenshots/court.png`
- `docs/ugc/screenshots/wallet.png`
- `docs/ugc/screenshots/profile.png`
- `docs/ugc/screenshots/notifications.png`

Optional presenter/avatar references:

- `avatar_assets/man/Warm&Approachable.png`
- `avatar_assets/man/Focused&Locked-In.png`
- `avatar_assets/man/ExcitedCelebration.png`
- `avatar_assets/woman/Warm&Approachable.png`
- `avatar_assets/woman/FocusedChallenge.png`
- `avatar_assets/woman/ExcitedCelebration.png`

Do not treat the screenshots as loose inspiration. They define the exact mobile UI style.

## Exact App Look

Visual identity:

- Dark-first app background: near-black `#050509`.
- Card surfaces: dark navy-black `#0E0E1A`, elevated panels around `#141425` and `#1C1C33`.
- Primary brand/action color: vivid orange `#FF5500`.
- Text: white and soft lavender-gray, with muted labels.
- Status colors: green for successful/verified, yellow for escrow/pending, blue for info, pink/red for danger/live.
- No purple gradient backgrounds, no neon casino visuals, no crypto coin aesthetic.

Typography feel:

- DARE logo and big screen titles use wide, heavy, angular display type similar to Syne ExtraBold.
- Body/UI copy is clean rounded sans similar to DM Sans.
- Labels, balances, statuses, and numeric UI use compact mono styling similar to JetBrains Mono.
- Keep letter spacing tight and controlled. Do not use stretched, futuristic sci-fi type.

UI structure:

- Phone screen is portrait, app fills the display.
- Header has orange DARE mark, white wordmark, compact mono subtitle, notification icon, plus icon, and orange avatar square.
- Bottom tab bar has five tabs: Feed, Create, Court, Wallet, Profile.
- Controls have 10-16px radius, not oversized pill-only UI.
- Cards have visible 1px borders, dark surfaces, compact spacing, and product-state content.
- Primary buttons are orange with white text. Secondary buttons are dark with subtle borders.

Core product screens to show:

- Feed: "DARE Feed", preview data alerts, filter chips, live pulse, "Got something to prove?" issue CTA, top players.
- Create: "Issue a DARE", type/category choices, algorithmic selected, review escrow flow.
- Court: "The Court", live player-vs-player arena, timer, score, pot, active status.
- Wallet: "Wallet", available balance, DARE coins, escrow, trust score, deposit/withdraw actions, pending confirmation copy.
- Profile: "My Profile", Kade profile, Champion trust score, win rate, earnings, disputes.

## Product Truths

Always preserve these messages:

- DARE is skill-first.
- Money is held in escrow.
- Provider confirmation and settlement matter.
- Challenges have rules and proof.
- Disputes can be reviewed.
- The app is not luck-based and not a casino.

Approved product language:

- "Challenge friends."
- "Set clear rules."
- "Lock stakes in escrow."
- "Skill decides the outcome."
- "Submit proof."
- "Settlement stays pending until confirmed."
- "Review evidence before resolving disputes."

Avoid:

- "Bet", "jackpot", "wager", "odds", "spin", "casino", "guaranteed winnings".
- Overpromising earnings.
- Showing cash flying, slot-machine motion, roulette, dice, lottery, crypto tokens, or trading charts.
- Fake UI screens that do not match the provided screenshots.

## Primary UGC Concept

Title: "I found an app for settling friendly challenges properly."

Hook:

"You know when friends argue about who actually won a challenge? This app makes the rules, money, and proof clear before anyone starts."

Story:

1. Creator speaks to camera with phone in hand.
2. Quick close-up of Feed screen.
3. Show Create screen and point to challenge type/category.
4. Show Court screen with timer, players, score, and pot.
5. Show Wallet screen and mention escrow/pending confirmation.
6. End on Profile or Feed with a direct but responsible CTA.

Tone:

- Conversational, confident, practical.
- More "smart friend showing a useful app" than influencer hype.
- Energy is competitive but controlled.

## 15s Script

Spoken:

"This is DARE. You create a challenge, set the rules, and the stake sits in escrow. Then both players enter Court mode, the timer runs, and skill decides the result. I like that the wallet shows what is available, what is locked, and what is still pending."

On-screen captions:

- "Set the rules"
- "Stake stays in escrow"
- "Play in Court mode"
- "Settlement stays clear"

Shot list:

1. 0-2s: Presenter holds phone, direct-to-camera hook.
2. 2-5s: Feed screen close-up, thumb scroll or tap near Issue CTA.
3. 5-8s: Create screen, highlight Algorithmic and Category.
4. 8-12s: Court screen, timer and score visible.
5. 12-15s: Wallet/Profile screen, escrow and trust visible.

## 30s Script

Spoken:

"I found an app for those friendly challenges that always end in arguments. It is called DARE. First you issue a DARE and write the rules. Then the stake is shown clearly before anything moves. If both players accept, you go into Court mode with a timer, score, and pot visible. The important part is the wallet: it separates available balance, escrow, and pending confirmations, so the app does not pretend money moved before settlement. It feels like a challenge app built with guardrails."

On-screen captions:

- "Create a DARE"
- "Clear rules before start"
- "Escrow shown upfront"
- "Court mode decides"
- "Wallet separates available, locked, pending"
- "Built for skill challenges"

Shot list:

1. 0-3s: Creator selfie hook.
2. 3-7s: Auth or Feed screen in phone.
3. 7-12s: Create screen, point to Algorithmic, Jury, Evidence cards.
4. 12-18s: Court screen with active timer and player scores.
5. 18-24s: Wallet screen, show Available Balance, In escrow, Trust Score.
6. 24-30s: Profile screen, creator closes with responsible CTA.

## Higgsfield Prompt: 15s UGC

Use with Marketing Studio video, mode `ugc`, aspect `9:16`, duration `15`.

```text
Vertical UGC phone-demo ad for DARE, a skill-first challenge mobile app. A confident young creator speaks naturally to camera while holding a phone. The phone screen must match the provided DARE mobile screenshots exactly: near-black background, orange DARE logo and buttons, white heavy angular display headings, dark navy cards, bottom tabs Feed Create Court Wallet Profile, compact mono labels, escrow and wallet states. Show quick close-ups of the real app screens: DARE Feed, Issue a DARE, The Court with timer and player scores, Wallet with available balance and escrow. Tone is practical and trustworthy, not hype. The creator says that users set rules, lock stakes in escrow, play in Court mode, and see available versus pending money clearly. No casino imagery, no betting language, no crypto visuals, no fake UI redesigns.
```

## Higgsfield Prompt: 30s UGC

Use with Marketing Studio video, mode `ugc_how_to`, aspect `9:16`, duration `30`.

```text
Vertical how-to UGC video for DARE, a mobile app for skill-based challenges with escrow and dispute-ready settlement. A relatable creator demonstrates the app on a phone in a clean everyday setting. The app UI must match the supplied DARE mobile screenshots exactly: black #050509 background, orange #FF5500 primary actions and DARE mark, white angular DARE wordmark, dark card panels, bottom tab bar with Feed Create Court Wallet Profile, mono labels, visible wallet escrow and pending confirmation language. Sequence: open Feed, tap Issue, show Create screen with Algorithmic selected, show Court mode with timer score pot and ACTIVE NOW badge, show Wallet with available balance and escrow, end on Profile trust score. Spoken tone is clear and accountable. Emphasize rules, skill, escrow, proof, and confirmed settlement. Avoid casino, gambling, jackpot, odds, slot machines, crypto coins, money rain, exaggerated earnings, or any UI that does not match the screenshots.
```

## Negative Prompt / Guardrails

```text
Do not redesign the app UI. Do not change the DARE logo, colors, tab names, screen headings, or wallet/court layout. No purple gradient app design, no generic SaaS dashboard, no iPhone mockup with fake pastel UI, no casino floor, no slot machine, no betting slip, no roulette, no dice, no cash explosion, no crypto token, no stock trading chart, no luxury flex aesthetic. Do not say bet, wager, odds, jackpot, guaranteed profit, passive income, or win money easily. Do not show minors. Do not imply money is paid before settlement confirmation.
```

## Shot-Level Prompt Notes

Feed close-up:

```text
Phone close-up showing the DARE Feed screen exactly like the reference: orange DARE mark, DARE Feed title, balance chip, preview data alert, preview feed alert, filter chips, Live pulse panel, Issue CTA, Top Players card, dark UI with orange active tab.
```

Create close-up:

```text
Phone close-up showing Issue a DARE screen exactly like the reference: preview data alert, four-step progress row, Type section, Algorithmic selected card with orange border, Jury and Evidence dark cards, Category chips, orange Create tab active.
```

Court close-up:

```text
Phone close-up showing The Court screen exactly like the reference: Premier League quiz in court mode, timer 1:12, Kade versus Tomi player cards, scores 3 and 2, pot NGN 5,000, ACTIVE NOW badge, bottom Court tab active.
```

Wallet close-up:

```text
Phone close-up showing Wallet screen exactly like the reference: available balance NGN 47,350, DARE Coins 2,400, NGN 15,000 in active escrow, deposit withdraw coins buttons, In escrow and Trust score cards, Provider confirmation pending alert.
```

Profile close-up:

```text
Phone close-up showing My Profile screen exactly like the reference: Kade profile, orange avatar, Champion trust score 724, Knowledge Sports Finance tags, Edit and Share buttons, wins, win rate, earned, disputes.
```

## Creator Direction

Presenter:

- Adult creator, 21-35.
- Friendly but focused delivery.
- Casual clothing, clean indoor or outdoor setting.
- Phone is visible but not constantly covering the face.
- Use natural hand gestures to point to the app screen.

Performance:

- Speak like explaining a useful app to a friend.
- Keep pace fast enough for TikTok/Reels, but do not sound like a get-rich pitch.
- Pause slightly on "escrow", "Court mode", and "pending confirmation".

Camera:

- 9:16 handheld or tripod selfie.
- Mix face-to-camera and phone close-ups.
- Use clean cuts, not heavy transitions.
- Keep the phone UI readable. Avoid motion blur over balances, timer, or CTA labels.

## Generated Assets — I Dare You Challenge (2026-05-29)

### Static Graphics

| Format | Dimensions | Direct Link |
| --- | --- | --- |
| Square — Instagram feed | 1024×1024 · 1:1 | [Download PNG](https://d8j0ntlcm91z4.cloudfront.net/user_3DePm50yJK0kOjVEzWL324s3TiO/hf_20260529_124207_34b5eff6-3b98-49cc-8a1c-9d11a15aeb6d.png) |
| Vertical — Stories / Reels | 1536×2752 · 9:16 · 2K | [Download PNG](https://d8j0ntlcm91z4.cloudfront.net/user_3DePm50yJK0kOjVEzWL324s3TiO/hf_20260529_124211_67ae2c6b-3daf-4a62-a840-ba5964d57006.png) |

### Motion Videos

| Format | Duration | Model | Direct Link |
| --- | --- | --- | --- |
| Square — Instagram feed | 6s · 1080×1080 · 1:1 | Kling 3.0 Pro | [Download MP4](https://d8j0ntlcm91z4.cloudfront.net/user_3DePm50yJK0kOjVEzWL324s3TiO/hf_20260529_124404_364854d6-8ce9-43cc-b678-0372d542addc.mp4) |
| Vertical — Stories / Reels | 8s · 1080×1920 · 9:16 | Kling 3.0 Pro | [Download MP4](https://d8j0ntlcm91z4.cloudfront.net/user_3DePm50yJK0kOjVEzWL324s3TiO/hf_20260529_125504_c4e3dea8-fdb1-443b-9a8a-a0ee02560bd8.mp4) |

### Higgsfield Workspace

All generations are saved in your Higgsfield account under **Generations → History**.
Log in at [higgsfield.ai](https://higgsfield.ai) to download, re-generate, or remix any asset.

---

## Compliance Notes For Creative Review

Before publishing, verify:

- The video does not call DARE a betting, gambling, casino, lottery, or investment app.
- The video does not promise income or guaranteed wins.
- The video does not imply wallet balances update before provider confirmation.
- The creator is visibly adult.
- App UI shown in the video matches the screenshots.
- Any mention of stakes is paired with escrow, rules, skill, or settlement language.
