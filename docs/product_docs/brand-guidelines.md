# DARE Brand Guidelines

## Brand Position

DARE is a skill-first challenge platform for friends and local communities. The brand feels competitive, direct, secure, and fast. It does not feel like a casino, a generic crypto app, or a playful toy.

Primary brand idea:

> Skill challenges with real stakes, clear proof, and trusted settlement.

## Logo System

The DARE logo uses an angular D mark with a cut-through energy bolt. The D shape anchors the name and the bolt communicates action, speed, and challenge resolution.

Logo files:

- `web/public/brand/dare-mark.svg` - square app mark for icons, favicons, compact nav, social avatars.
- `web/public/brand/dare-lockup.svg` - full lockup for marketing, app stores, investor decks, and social headers.
- `web/public/brand/dare-wordmark.svg` - wordmark-only fallback when the mark is already nearby.
- `web/app/favicon.ico` - browser favicon endpoint for legacy and default browser requests.
- `web/app/icon.svg` - Next.js app icon route for browser tabs and metadata.
- `web/public/apple-touch-icon.png` - Apple home-screen/bookmark icon.
- `web/public/brand/dare-icon-192.png` and `web/public/brand/dare-icon-512.png` - installable app manifest icons.
- `web/components/brand/dare-logo.tsx` - reusable in-app React logo component.

### Preferred Use

Use the lockup in product headers, launch pages, campaign pages, and decks. Use the mark alone only where horizontal space is constrained or when the DARE name appears next to it in text.

### Clear Space

Keep at least one mark-width of empty space around the full lockup. For the standalone mark, keep at least 25 percent of the mark width on all sides.

### Minimum Sizes

- Standalone mark: 24 px minimum in UI.
- Full lockup: 96 px minimum width in UI.
- Social and app-store export: use 1024 x 1024 px or larger source dimensions.

### Do Not

- Do not add gradients, shadows, bevels, or glow effects to the logo.
- Do not recolor the mark outside the approved palette.
- Do not place the orange mark on low-contrast orange, red, or brown backgrounds.
- Do not stretch, rotate, outline, or crop the mark.
- Do not use the logo as a decorative pattern behind text.

## Color Palette

DARE uses a restrained dark interface with a high-energy orange action color. Orange is reserved for identity, primary actions, active states, and critical product emphasis.

| Role | Token | Hex | Usage |
| --- | --- | --- | --- |
| Brand background | `--color-brand-bg` | `#050509` | Page background, hero background, high-trust surfaces |
| Brand surface | `--color-brand-surface` | `#0E0E1A` | Cards, sidebars, modals, panels |
| Brand primary | `--color-brand-primary` | `#FF5500` | Logo mark, primary CTA, selected nav, focus ring |
| Foreground | `--foreground` | `#F5F5F5` | Primary text on dark surfaces |
| Muted text | `--muted-foreground` | `#888888` | Secondary labels, helper text |
| Secondary surface | `--secondary` | `#1A1A2E` | Subtle controls and inactive nav |

Optional supporting colors for future product states:

| Role | Hex | Usage |
| --- | --- | --- |
| Verified | `#19C37D` | KYC complete, settled payout, successful verification |
| Evidence | `#2DD4BF` | Proof submitted, media verified, neutral evidence states |
| Risk | `#F59E0B` | Pending review, timed challenge warning |
| Blocked | `#EF4444` | Rejected KYC, fraud hold, destructive action |

Accessibility rule: all text and icon states must meet WCAG AA contrast. Do not use orange text below 14 px on dark backgrounds unless the contrast is verified.

## Typography

Primary display:

- Syne ExtraBold
- Used for logo-adjacent headings, hero headlines, and short campaign lines.

Primary UI:

- DM Sans
- Used for body copy, forms, navigation, data tables, and admin screens.

Technical and numeric:

- JetBrains Mono
- Used for short labels, identifiers, transaction-like values, and status chips.

Rules:

- Keep letter spacing at `0`.
- Do not use viewport-scaled font sizes.
- Use compact headings in dashboards and dense admin interfaces.
- Avoid all-caps body copy. Reserve uppercase for short labels only.

## Voice And Messaging

DARE sounds confident, precise, and accountable.

Use:

- "Challenge friends."
- "Submit proof."
- "Funds stay in escrow until settlement."
- "Skill decides the outcome."
- "Review evidence before resolving disputes."

Avoid:

- Casino language such as "jackpot", "spin", "luck", or "bet big".
- Overpromising payouts or financial results.
- Crypto-first language unless the user is in a wallet or settlement context.
- Vague AI-style claims such as "revolutionary", "seamless", or "next-gen".

## Official Social Channels

Use these exact handles and URLs in marketing surfaces, decks, app-store copy, and launch materials:

| Channel | Handle | URL |
| --- | --- | --- |
| Instagram | `@dareappofficial` | `https://www.instagram.com/dareappofficial` |
| YouTube | `@iDareUChallenge` | `https://www.youtube.com/@iDareUChallenge` |

## Product UI Rules

Primary actions use brand orange. Secondary actions use dark surfaces with subtle borders. Destructive actions must use the blocked color and explicit confirmation.

For admin screens, prioritize trust and scanning:

- Dense tables over decorative cards.
- Clear status badges.
- Visible timestamps and IDs.
- Explicit empty, loading, and error states.
- No marketing language inside operational workflows.

For consumer screens, emphasize:

- Challenge creation.
- Proof capture.
- Escrow confidence.
- Dispute clarity.
- Responsible participation.

## Brand Rollout Plan

1. Replace plain text DARE wordmarks in web navigation and admin chrome with `DareLogo`.
2. Generate production favicon and app icons from `dare-mark.svg`.
3. Replace starter social preview files with a DARE-specific Open Graph image.
4. Audit marketing copy for casino-forward language.
5. Apply the same logo and color tokens to the mobile app.
6. Add a visual QA checklist for logo contrast, clear space, and mobile header fit.

## Implementation Notes

Current web tokens live in `web/app/globals.css`. New UI uses existing tokens before adding colors. Any new color must have its role documented here before it is added to CSS.

Logo component usage:

```tsx
import { DareLogo } from '@/components/brand/dare-logo';

<DareLogo size="md" />
<DareLogo variant="mark" size="sm" />
```

Do not recreate the logo with plain text in new components. Use the component or the approved SVG assets.
