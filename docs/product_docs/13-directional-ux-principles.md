# Directional UX Principles

## Why This Exists

DARE's primary markets — Nigeria and Kenya — are mobile-first populations where users habitually **act before reading**. They tap buttons, scroll fast, and make decisions based on what they see first, not what the text says.

This is not a flaw to work around. It is the reality to design for.

Every screen, flow, and component in DARE - web and mobile - must be built on this principle: **the user never needs to read instructions to know what to do next.** The UI tells them by showing one clear action.

---

## The Core Rule

> At every moment in any flow, there is exactly one obvious thing to tap. That thing is a button. It is prominent. It appears before any explanatory text. Tapping it moves the user forward.

If a user can get stuck, confused, or land on a screen without knowing what to do next — the screen is broken, regardless of how clear the text is.

---

## Implementation Rules

### 1. One Primary Action Per Screen Moment
Never show multiple competing CTAs at the same level of visual weight. One action is primary. Everything else is secondary or absent.

**Wrong:** Three equal-weight buttons at the bottom of a screen.
**Right:** One large primary button. One small secondary link below it for cancel, back, or learn-more actions.

---

### 2. Button Before Explanation
The action (button) comes first in the visual hierarchy. Explanation text supports the button — it does not precede it.

**Wrong:**
> "Share your referral link to your WhatsApp Status or Instagram Story. Your friends need to sign up using your link for the referral to count."
> [Share button]

**Right:**
> [Share your link →]
> *Every friend who signs up via your link counts as a referral.*

---

### 3. Pre-Fill Everything Possible
Never ask users to compose, copy, or remember content. Pre-fill it.

- Share messages are pre-written and pre-loaded into the share sheet
- DM links open Instagram with the exact message already typed
- Referral links are embedded in buttons, not just displayed as text to copy
- Form fields auto-complete when the required platform data is available

---

### 4. Deep Links Replace Manual Multi-Step Flows
Every action that requires leaving the app or website must be a single tap that lands the user in exactly the right place.

**Wrong:** "Go to Instagram and search for @dareappofficial and follow us."
**Right:** [Follow @dareappofficial →] — tapping opens Instagram directly on the profile page.

**Wrong:** "DM us on Instagram and type: Challenge accepted and completed"
**Right:** [DM @dareappofficial →] — tapping opens Instagram DM with the message already written.

---

### 5. The System Initiates Transitions
Users do not figure out where to go after completing an action. The system moves them there.

- After form success → auto-scroll to the next step after a short delay
- After task completion → visually confirm and reveal the next task
- After a flow ends → redirect or show a clear "what's next" state

Do not end a state with silence. Every success state, error state, and completion state has a next action.

---

### 6. Progressive Reveal
Do not show all steps at once if it creates overwhelm. Show the current step clearly. Reveal the next step after the current one is taken or acknowledged.

Exception: a summary overview (e.g., "4 tasks total") can be shown upfront as context, but the actionable detail for each step reveals progressively.

---

### 7. Confirmation Over Assumption
Never leave the user wondering if their action worked. Every tap that triggers a state change must produce immediate visual feedback:
- Button state changes (loading spinner, disabled state)
- Success indicator (checkmark, color change, message)
- Next step appears or is scrolled into view

---

### 8. Error States Are Directional Too
Error messages must tell the user what to do, not just what went wrong.

**Wrong:** "Something went wrong."
**Right:** "That email is already registered. [Retrieve your referral link →]"

---

## Application Across Product Areas

| Area | Directional Implementation |
|---|---|
| Challenge flow | After signup → auto-scroll to tiers → [Share link] → [Follow on Instagram] → [DM to claim] |
| DARE creation | Step-by-step wizard, one decision per screen, next button always visible |
| Court | Clear countdown, one ready-up button, one submit button, no ambiguous states |
| Wallet | Deposit/withdraw are primary actions with pre-filled amounts where sensible |
| Onboarding | One question or action per screen, progress indicator always visible |
| Notifications | Every notification links directly to the relevant action, not a generic screen |

---

## For AI Agents and Developers

When building any screen or flow for DARE:

1. Ask: *"Can a user who does not read any text complete this action?"* If no — redesign.
2. Ask: *"What happens after the user taps the primary button?"* If there is no defined next state, define and build that state before shipping the flow.
3. Ask: *"Does this flow require copy-pasting, app-switching, or manual navigation?"* If yes — replace with a deep link or pre-filled action.
4. Never ship a success or completion state without a visible next step.
5. Never ship a form without a clear, prominent submit button that is always in view on mobile.

---

## Reference

This principle emerged from direct user feedback during the DARE I Dare You Challenge (June 2026), where users who received referral links did not complete the challenge because the next steps required reading and self-navigation rather than tapping and being guided.

See also:
- [03-user-roles-and-journeys.md](03-user-roles-and-journeys.md)
- [12-mobile-ui-ux-implementation-spec.md](12-mobile-ui-ux-implementation-spec.md)
- [10-technical-architecture-principles.md](10-technical-architecture-principles.md)
