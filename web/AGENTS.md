<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:directional-ux-rules -->
## Directional UX — Non-Negotiable for All UI Work

DARE's users in Nigeria and Kenya act before reading. Every screen and component you write must follow these rules without exception:

1. **One primary CTA per screen moment.** No two equally prominent buttons at the same level.
2. **Button before explanation.** The action comes first visually. Explanatory text goes below or beside it, never above.
3. **Pre-fill everything.** Share messages, DM text, and referral links must be embedded in buttons or pre-loaded into the OS share sheet. Never show a link for the user to manually copy unless a copy button is also present.
4. **Deep links over manual navigation.** Use `https://www.instagram.com/dareappofficial` links that open directly, never "go to Instagram and search…" instructions.
5. **System-initiated transitions.** After any action (form submit, button tap, timer), the UI moves the user to the next step — auto-scroll, conditional render, redirect. The user never needs to scroll or navigate on their own to find what's next.
6. **No silent success states.** Every `state.ok` or completion renders a visible next step — a button, a scroll, or a redirect.
7. **Directional error messages.** Every error state includes a recovery action: `"That email is already registered. [Retrieve your referral link →]"` — not just `"Something went wrong."`.

Before shipping any UI feature, ask: *"Can a user who does not read any text complete this action?"* If no — redesign.

Full specification: `../docs/13-directional-ux-principles.md`
<!-- END:directional-ux-rules -->
