# Show Me Your Talent Dare Challenge — Product Spec

## Overview

A standalone challenge campaign hosted at `daregamesapp.com/talent`. Separate from the
I Dare You Challenge. Runs concurrently with it.

Participants earn ₦5,000 DARE wallet credit by recording a talent video, daring a named friend
publicly, collecting their friend's video response as proof, and referring 3 friends through
their unique referral link.

The challenge is single-tier. There is no Standard / Champion / Legend structure.
Everyone who completes all tasks earns the same ₦5,000 reward.

---

## Campaign Parameters

| Parameter         | Value                                           |
| ----------------- | ----------------------------------------------- |
| Reward            | ₦5,000 DARE wallet credit                       |
| Total slots       | 500                                             |
| Start date        | July 20, 2026 (00:00 WAT)                       |
| End date          | September 20, 2026 (23:59 WAT)                  |
| Minimum referrals | 3 friends                                       |
| Hashtag           | #ShowMeYourDare                                 |
| Claim method      | DM @dareappofficial on Instagram or WhatsApp    |
| Page URL          | `/talent`                                       |

---

## Task Sequence

The order is fixed and directional. Participants must complete every step.

### Task 01 — Join the DARE waitlist

Enter email on the `/talent` page. Receive unique referral code and referral link.
Required before any other task.

### Task 02 — Follow @dareappofficial on Instagram

Screenshot the follow confirmation as proof. Attach in claim DM.

### Task 03 — Record your talent video

Film a 15–30 second video of any skill or talent.
This is the starting point of the dare. No restrictions on talent type.
The video must be an original performance — not a reaction, not a commentary.

### Task 04 — Post your talent video and dare a named friend

Post the video on Instagram Reels, TikTok, or WhatsApp Status.
Caption must include:

- The name of the specific person you are daring (e.g. "@tobi I dare you to top this")
- The hashtag #ShowMeYourDare
- The tag @dareappofficial

The dare must be directed at one specific named person, not an open call to anyone.
The in-app caption template uses `@[Friend's name]` as a placeholder the user must replace.

### Task 05 — Collect your friend's response

The dared person records their own talent video and posts it publicly in response.
Their response video is required proof. Without it the claim cannot be verified.

If the dared person does not respond, the participant must dare a different person and
collect a response before submitting. The challenge has no time limit per dare — only
the September 20 campaign end date applies.

### Task 06 — Share your referral link

Share the referral link on WhatsApp Status, Instagram Story, or any social platform.
Screenshot the share as proof.

### Task 07 — Refer 3 friends

Get a minimum of 3 friends to sign up on the `/talent` page using your referral link.
Referrals are auto-tracked — no screenshot needed. Self-referrals are disqualified.

### Task 08 — Claim your reward

DM @dareappofficial on Instagram (`ig.me/m/dareappofficial`) or WhatsApp (`wa.me/2347014268973`) with:

- Screenshot of Instagram follow (Task 02)
- Link to your posted talent video (Task 04)
- Link to your friend's response video (Task 05)
- Screenshot of your referral link share (Task 06)
- Referrals are auto-verified (Task 07)

DARE verifies all proof within 72 hours and credits ₦5,000 to the participant's DARE wallet.

---

## What the Respondent Receives

The person who responds to the dare is **not automatically enrolled or paid**.

If they want to earn ₦5,000 themselves, they must:

1. Visit `/talent` and get their own referral link
2. Record their own talent video (separate from their response)
3. Post it and dare a new named person
4. Complete all 8 tasks independently

This creates a natural funnel: every respondent has participated in a dare for free and
already understands how it works. They are the highest-intent lead for the challenge.

---

## The Poll (Internal)

After DARE receives and verifies both video links from a participant, the team posts a
side-by-side poll on the DARE Instagram Story and DARE WhatsApp Channel:
"Who showed better talent? 🔴 [Challenger] or 🟠 [Respondent]?"

The poll result does **not** affect the reward. The participant is paid regardless of votes.
The poll exists purely to drive community engagement and generate content for DARE's channels.

Participants are not told that the poll result is non-binding.

---

## Eligibility

- Open to Nigerian residents aged 18 and above
- One reward per person
- Both videos (Task 04 and Task 05) must be publicly visible at time of claim verification
- Videos must remain posted for a minimum of 30 days after reward is issued
- Talent must be an original performance. No re-posts, lip-sync only, or recycled content
- No dangerous, harmful, or sexually explicit content
- Duplicate or coordinated submissions will be disqualified

---

## Page Structure (`/talent`)

Mirrors the I Dare You Challenge page structure. Directional and instructional.
The actual performance takes place on social media — the page only handles signup,
task instructions, and proof submission guidance.

### Hero section

- Badge: LIVE — Closes September 20, 2026
- Headline: Show Me Your Talent.
- Subheadline: Record your talent. Dare a friend. Earn ₦5,000 to your DARE wallet.
- Reward pill: ₦5,000 (single pill, no tier comparison)
- Slot progress bar: X of 500 spots taken

### Step 01 — Join and get your link

Email form → submit → receive referral code and referral link.
Auto-scroll to Step 02 after success.

### Step 02 — Complete your tasks

Task cards shown after Step 01 is complete. Same card component as I Dare You.

Cards:

- 01: Join the waitlist (marked done after Step 01)
- 02: Follow @dareappofficial
- 03: Record your talent video
- 04: Post and dare a named friend (includes #ShowMeYourDare and @dareappofficial instructions)
- 05: Collect your friend's response
- 06: Share your referral link (WhatsApp share button pre-loaded with referral link)
- 07: Refer 3 friends (copy referral link button)
- 08: Claim — buttons linking to Instagram DM and WhatsApp DM with pre-filled template

### Small print / Terms

- Nigeria only, 18+
- One reward per person
- Referrals auto-tracked, self-referrals disqualified
- Rewards credited within 72 hours of verification
- Promotional challenge, not a gambling or lottery activity

---

## Technical Implementation

### Config file

New file: `dare/web/lib/talent-challenge-config.ts`

```typescript
export const TALENT_CHALLENGE_CAP = 500;
export const TALENT_CHALLENGE_START = new Date('2026-07-20T00:00:00+01:00');
export const TALENT_CHALLENGE_START_LABEL = 'July 20, 2026';
export const TALENT_CHALLENGE_END = new Date('2026-09-20T23:59:59+01:00');
export const TALENT_CHALLENGE_END_LABEL = 'September 20, 2026';
export const TALENT_CHALLENGE_REWARD = 5000;
export const TALENT_REFERRAL_MIN = 3;
```

### Database

Reuses `marketing_waitlist` table with `source: 'talent'`.
Referral tracking via existing `referred_by` and `referral_code` columns.
Email uniqueness is scoped per-source: same email can join both campaigns independently.

New table: `talent_claim_reviews`
Tracks submitted proof links and admin review status per referral code.
Named to match the existing `challenge_claim_reviews` pattern.

```sql
create table talent_claim_reviews (
  referral_code        text        not null primary key,
  challenger_video_url text        not null,
  response_video_url   text        not null,
  status               text        not null default 'pending',
  -- pending | approved | paid | rejected
  submitted_at         timestamptz not null default now(),
  reviewed_at          timestamptz,
  paid_at              timestamptz,
  reviewer_notes       text
);
```

### Server actions

New file: `dare/web/app/(marketing)/talent-actions.ts`

- `joinTalentWaitlist` — same pattern as `joinChallengeWaitlist` but with `source: 'talent'`
  and `TALENT_CHALLENGE_CAP` / `TALENT_CHALLENGE_START` / `TALENT_CHALLENGE_END`

### Admin panel

New route: `dare/web/app/admin/talent/`

- List all participants with referral count (status tabs: All / Pending / Approved / Paid / Rejected)
- View submitted claims with both video links
- Mark claim as approved / paid / rejected
- Add reviewer notes (saved to `reviewer_notes` column; visible in table)
- Approve action enforces 3-referral minimum server-side

### Pages and components

- `dare/web/app/(marketing)/talent/page.tsx` — main page
- `dare/web/components/marketing/talent-flow.tsx` — step controller (mirrors challenge-flow)
- `dare/web/components/marketing/talent-waitlist.tsx` — email signup (mirrors challenge-waitlist)
- `dare/web/components/marketing/talent-task-list.tsx` — task cards with pre-filled share/dare/claim actions

---

## Content and Copy Rules

- Never describe the challenge as a competition — it is a participation reward
- Never say "the best talent wins" — the reward is for completing the tasks, not for quality
- The poll is never described as the judging mechanism in any public-facing copy
- Always include the hashtag #ShowMeYourDare
- Always tag @dareappofficial in example captions
- Dare must be directed at a named person — never "dare anyone" or "dare the world"
- Caption template uses `@[Friend's name]` placeholder — users must substitute a real name before posting
- Keep all copy under 150 words per post — this audience taps before reading

---

## Launch Checklist

- [x] `talent-challenge-config.ts` created
- [x] `talent_claim_reviews` migration written and applied (20260703000000 + 20260703000001)
- [x] `talent-actions.ts` server actions implemented
- [x] `/talent` page built and tested
- [x] Admin talent panel built (`/admin/talent`)
- [x] SEO metadata set (title, description, OG image)
- [x] `/talent` added to sitemap
- [x] Rate limiting applied to `joinTalentWaitlist`
- [x] Welcome email flow confirmed (`sendTalentWelcomeEmail` in email.ts)
- [x] Challenge reminder cron built (`/api/cron/talent-reminder`, daily, nudges joiners who haven't claimed after 3 days)
- [x] Announcement post drafted (see Launch Announcement section below — Doc 20 is the Battle Cascade plan for the unrelated I Dare You Challenge and has no Talent content)
- [x] Page live and verified before July 20 (confirmed live at `/talent`, "LIVE — Closes September 20, 2026" badge showing, spots counter incrementing)

---

## Launch Announcement (July 20)

**Type:** Text post
**Platforms:** Instagram, Twitter/X, WhatsApp Status, DARE WhatsApp Channel
**Goal:** Announce the challenge is open today and drive the first wave of `/talent` joins.

**Copy:**

> Show Me Your Talent is live. 🎯
>
> Record a 15–30 second video of your skill. Post it and dare one friend by name to top it — tag them, use #ShowMeYourDare, and tag @dareappofficial.
>
> Get their response video as proof. Share your referral link. Refer 3 friends.
>
> Complete every step and earn ₦5,000 to your DARE wallet — no judging, no voting, just proof.
>
> 500 spots. Runs now through September 20.
>
> Link in bio. #ShowMeYourDare

**Example dare caption** (shown on the `/talent` page as a template for participants' own Task 04 post):

> @[Friend's name] I dare you to top this. #ShowMeYourDare @dareappofficial

**Compliance with Doc 21 copy rules:** no "competition" or "best talent wins" framing, reward stated as completion-based, poll not mentioned, hashtag and tag present, named-friend framing used in the example, 89 words (under the 150-word cap).

**Optional pairing video:** the I Dare You launch used a 2-person Higgsfield UGC video alongside its text posts. If wanted for this launch too, I'll draft the script (soul `d92c9bd9` + `9b338936`, `marketing_studio_video`, no hook, DareApp product ID, natural Lagos setting) and share it for approval before generating — see [[feedback_video_script_approval]].

### Launch assets (generated July 20-21)

1. **Motion graphic** — kinetic-typography poster animation, no people. [Base poster](https://d8j0ntlcm91z4.cloudfront.net/user_3DePm50yJK0kOjVEzWL324s3TiO/hf_20260721_012756_7492b7b8-e330-4a96-84fc-92590be6d007.png) / [animated version](https://d8j0ntlcm91z4.cloudfront.net/user_3DePm50yJK0kOjVEzWL324s3TiO/hf_20260721_013750_8fcc74f0-ff01-4538-abd4-c48cf9d14092.mp4).
2. **2-person UGC video** — souls `d92c9bd9` + `9b338936`, `marketing_studio_video`, `ugc` mode, no hook, DareApp product lock. [Result](https://d8j0ntlcm91z4.cloudfront.net/user_3DePm50yJK0kOjVEzWL324s3TiO/hf_20260721_015006_06489e2b-06f2-4c77-8841-2a55d77ca3b4.mp4).

### IG Reel captions

**For the motion graphic:**

> Show Me Your Talent is live. 🎯
>
> Record it. Dare a friend. Earn ₦5,000 to your DARE wallet.
>
> 500 spots. Live now through September 20.
>
> Link in bio. #ShowMeYourDare @dareappofficial

**For the UGC video:**

> She showed her talent. Now she's daring him. 🎯
>
> That's the whole challenge: record your talent, dare a friend by name, get their response, refer 3 friends — earn ₦5,000 to your DARE wallet.
>
> Tag the friend you're daring. Use #ShowMeYourDare. Tag @dareappofficial.
>
> Link in bio.

Both checked against the Doc 21 copy rules above: no competition/judging language, reward stated as completion-based, hashtag + tag present on both, under 150 words each.
