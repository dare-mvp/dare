# Battle Cascade — Content Plan (July 1–15, 2026)

## Purpose

This document is the execution plan for the second phase of the I Dare You Challenge campaign,
running July 1–15, 2026.

Standard tier is now closed. The challenge has been expanded to 1,000 slots with Champion as the
minimum entry. Every new participant must film a dare video and refer 3 friends.

This plan has one primary goal: convert Champion completers into Legend completers via dare battles,
while simultaneously filling the remaining Champion slots.

It is a companion to [[19-i-dare-you-challenge-content-plan]] and [[18-make-it-a-dare-content-strategy]].

---

## Campaign Context

| Tier | Reward | Minimum tasks |
|------|--------|---------------|
| Standard | ₦2,000 | CLOSED — existing completers keep status |
| Champion | ₦3,000 | Follow + refer 3 friends + film a dare video |
| Legend | ₦9,000 | Champion done + refer 5 friends + dare battle + WhatsApp group drop |

**Challenge closes:** July 15, 2026 (23:59 WAT)
**Total slots:** 1,000
**Standard tier:** Disabled in UI and blocked server-side. Re-enable by setting `STANDARD_TIER_ACTIVE = true` in `dare/web/lib/challenge-config.ts`.

---

## Strategic Focus

Two audiences to address simultaneously:

**Audience A — Champion completers (existing)**
These people have already earned ₦3,000. They are the highest-intent users in the funnel. Legend
requires a dare battle on top of what they have already done. Content targeting this group should
make the battle feel easy, fast, and worth the ₦6,000 difference.

**Audience B — New entrants (Champion only)**
Every new joiner must film a dare video. Content for this group removes the "I don't know how to
do this" friction and shows the battle mechanic visually.

Both audiences are served by the same three content pieces below.

---

## Execution Tracker

| # | Piece | Format | Day | Status |
|---|-------|--------|-----|--------|
| 1 | What is a DARE battle? | Text post | July 3–4 | [ ] |
| 2 | Battle demonstration video | Higgsfield 2-person | July 5–6 | [ ] |
| 3 | Champion completers — your next step | Text post | July 10–11 | [ ] |
| 4 | Final 48 hours | Text post | July 13 | [ ] |
| 5 | Challenge closed | Text post | July 15 | [ ] |

Every caption from July 1–15 ends with:
> Everyone who completes the challenge walks into the DARE app with wallet credit already loaded.

---

## Piece 1 — What Is a DARE Battle?

**Type:** Text post
**Platforms:** Instagram, Twitter/X, WhatsApp Status
**Day:** July 3–4
**Goal:** Remove friction for both new Champion entrants and existing Champion completers considering Legend.

**Copy:**

> A DARE battle is two people. One dares. One responds.
>
> Example:
> You film yourself: "I dare Tunde to name 10 Nigerian states in 60 seconds."
> Tunde films himself trying it and posts his response.
>
> Both videos go up with #IDareYouNG. You send both links in your claim DM. That is it.
>
> That combination unlocks ₦9,000 to your DARE wallet.
>
> If you have already completed Champion tier, you are one battle away from Legend.
>
> Everyone who completes the challenge walks into the DARE app with wallet credit already loaded.
>
> Link in bio. #IDareYouNG

**Note:** Do not over-explain. The example does the work. Keep the copy exactly as shown — short lines,
one idea per line, no filler.

---

## Piece 2 — Battle Demonstration Video

**Type:** Higgsfield 2-person UGC video
**Platform:** DARE WhatsApp Channel (primary), Instagram Reels (secondary)
**Day:** July 5–6
**Goal:** Show the battle mechanic visually. Make Champion completers see themselves in the man's
position — one step from Legend.

### Scene brief

Man has already completed Champion tier and earned ₦3,000. Woman challenges him to a dare battle
on camera to unlock Legend. He accepts immediately. She confirms his Legend tier is one battle away
on her phone. End card: "One battle. ₦9,000 in your DARE wallet. July 15."

### Full script (for approval before generation)

```
CHARACTERS:
Woman: dark-skinned Nigerian adult, 28-33, natural hair, casual everyday outfit. Main character.
Use provided character reference exactly. Dark skin tone throughout — do not lighten.
Man: dark-skinned Nigerian adult, 28-33, low fade haircut, plain casual outfit. No mic. No prop.
Dark skin tone throughout — do not lighten.

LOCATION:
Real Lagos street. Worn concrete sidewalk. Faded curb paint. Okada bikes passing in background.
Parked keke napep visible. Low-rise sun-bleached buildings. Flat midday natural daylight.
No colour grade. Nothing polished or staged. No cinematic lighting.

SCENE:

SHOT 1 [0:00–0:05]:
Woman faces man. She says EXACTLY: 'You finished Champion. Have you done your battle yet?'

SHOT 2 [0:05–0:09]:
Man shakes his head. He says EXACTLY: 'Not yet. What do I need to do?'

SHOT 3 [0:09–0:13]:
Woman holds phone toward man, screen facing him. She says EXACTLY:
'Dare a friend on camera. They film their response. Send both links in the DM.'

SHOT 4 [0:13–0:15]:
Man nods. He says EXACTLY: 'That is it? Let me call him now.'

END CARD TEXT (static, no voiceover):
One battle. ₦9,000 in your DARE wallet.
Closes July 15.
Link in bio.

STRICT DIALOGUE RULE: Characters speak ONLY the exact lines above. No other words. No Pidgin.
Natural Nigerian English only. No improvisation.

STRICT PHONE RULE: Phone screen faces toward the man at all times. Camera NEVER shows the phone
screen. No close-up of the screen.

STRICT SKIN TONE RULE: Both characters are dark-skinned Nigerian adults. Do not generate
light-skinned or non-African characters under any circumstances.

STRICT PRODUCT RULE: Use ONLY the exact screens from the provided DareApp reference images.
Do not invent any UI, text, buttons, or interface elements not in the reference images.
```

### Higgsfield generation parameters

Follow all rules from [[feedback_ugc_proven_formula]] before generating.

- **Model:** `marketing_studio_video`
- **Mode:** `ugc`
- **Hook:** NONE — do not add any hook_id
- **Product:** DareApp (`70b461e0-0746-4475-8abd-12d186755970`)
- **Avatar:** `avatars: [{id: "d92c9bd9-541c-458a-9bc6-17c9a0060fba", type: "custom"}]`
- **Aspect:** `9:16`
- **Duration:** `15`
- **Audio:** `generate_audio: true`
- **Count:** `1`

**Process rule:** Share this full script with the user for approval before submitting the generation
job. See [[feedback_video_script_approval]].

### Distribution

- **Primary:** Post to the DARE WhatsApp Channel as a video with caption
- **Secondary:** Instagram Reels with the same caption
- **Caption for both:**
  > One battle unlocks ₦9,000.
  >
  > If you have already completed Champion, dare a friend on camera. They film their response.
  > Send both video links to @dareappofficial.
  >
  > Everyone who completes the challenge walks into the DARE app with wallet credit already loaded.
  >
  > Closes July 15. Link in bio. #IDareYouNG

---

## Piece 3 — Champion Completers: Your Next Step Is Ready

**Type:** Text post
**Platforms:** Instagram, Twitter/X, WhatsApp Status
**Day:** July 10–11
**Goal:** Direct call to existing Champion completers. Five days left — create urgency.

**Copy:**

> If you have already claimed your ₦3,000 DARE reward, Legend is unlocked for you right now.
>
> You need:
> 2 more referrals (5 total — auto-tracked)
> 1 dare battle video with a friend
> 1 drop in a WhatsApp group of 20+ people
>
> That is ₦9,000 total in your DARE wallet. Closes July 15.
>
> DM @dareappofficial with your Champion reward receipt and we will confirm your Legend eligibility.
>
> Everyone who completes the challenge walks into the DARE app with wallet credit already loaded.
>
> #IDareYouNG

---

## Piece 4 — Final 48 Hours

**Type:** Text post — minimal copy
**Platforms:** All channels simultaneously
**Day:** July 13
**Goal:** Last urgency push. No explanation needed at this point.

**Copy:**

> 48 hours left on the DARE I Dare You Challenge.
>
> Champion: ₦3,000. Legend: ₦9,000. Closes July 15.
>
> Link in bio. #IDareYouNG

---

## Piece 5 — Challenge Closed

**Type:** Text post
**Platforms:** Instagram, Twitter/X, WhatsApp Status
**Day:** July 15 (after 23:59 WAT)
**Goal:** Celebrate the close. Seed anticipation for the next run.

**Copy:**

> The I Dare You Challenge is now closed.
>
> Thank you to everyone who completed a tier. Your DARE wallet credit is being processed.
>
> We will be back. Follow @dareappofficial to hear about the next run.
>
> #IDareYouNG

---

## Copy Rules (All Posts)

- Every caption from July 1–15 ends with the wallet credit line:
  "Everyone who completes the challenge walks into the DARE app with wallet credit already loaded."
- Hashtag on every post: #IDareYouNG
- Tag @dareappofficial where platform allows
- Never say "gambling" or "betting" — always "dare", "challenge", "proof", "earn"
- Keep copy under 150 words per post — this audience taps before reading
- Never promise a specific launch date for the DARE app

---

## What Not To Post During This Phase

- Awareness content explaining what DARE is from scratch — this audience knows
- Any post without a direct action the reader can complete in under 5 minutes
- Posts that mention Standard tier — it is closed and referencing it creates confusion
- Unsafe or reckless dare suggestions in battle examples
