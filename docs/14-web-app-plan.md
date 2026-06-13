# DARE Web App Plan

## Structure

Build one Next.js 16 app at `dare/web/` alongside the existing `dare/mobile/` and `dare/supabase/` folders. Marketing routes live at `/`. Admin routes live at `/admin/**` and are protected by middleware.

## Tech Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Framework | Next.js 16 App Router | SSR for marketing SEO, server components for admin data, API routes for auth |
| Styling | Tailwind CSS v4 | Fast design-system implementation and dark theme support |
| Components | shadcn/ui with Radix primitives | Tables, dialogs, accordions, badges, and admin UI primitives |
| Auth | `@supabase/ssr` with Next.js middleware | Reuses Supabase auth and supports server-side `is_admin` checks |
| Blog | MDX files in `content/blog/` with `next-mdx-remote` and `gray-matter` | No CMS needed for v1; posts are code-deployed |
| Data fetching | Server components and Server Actions | Admin tables load server-side; mutations call existing Edge Functions |
| Deployment | Vercel | Natural fit for Next.js App Router, edge middleware, image optimization, and preview deployments |

## Environment

Create `dare/web/.env.local.example` during scaffolding.

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to client components. It is required for admin server-side queries that bypass RLS.

## Route Map

| Route | Purpose |
| --- | --- |
| `/` | Landing page with hero, how it works, trust and safety, FAQ, footer |
| `/how-it-works` | Out of v1 route map; landing page carries the explainer content |
| `/trust-safety` | KYC, skill-based framing, and responsible gaming detail |
| `/faq` | Full FAQ accordion |
| `/blog` | Blog post list |
| `/blog/[slug]` | Individual MDX post |
| `/auth/login` | Admin sign-in with email and password |
| `/admin` | Dashboard with stat cards and recent activity |
| `/admin/withdrawals` | Withdrawal approval queue |
| `/admin/kyc` | KYC review queue |
| `/admin/users` | User search and account management |
| `/admin/users/[id]` | User detail page |
| `/admin/jury` | Jury case oversight |

## Marketing Site

The visual language matches the mobile app exactly:

| Token | Value |
| --- | --- |
| Background | `#050509` |
| Primary | `#FF5500` |
| Surface | `#0E0E1A` |
| Headlines | Syne 800 |
| Body | DM Sans |
| Badges and labels | JetBrains Mono |

Load fonts through `next/font/google` in the root layout. Do not load them from external CSS at runtime.

The site is dark, dense, and energetic: closer to a sports challenger brand than a polished fintech landing page.

### Landing Sections

| Section | Content |
| --- | --- |
| Hero | Headline: "Challenge. Wager. Win." One-line subcopy, APK download CTA, App Store CTA, phone mockup or abstract app visual |
| How it works | Four steps: Create a Skill-Based or Task-Based DARE, accept/perform, Court or proof review, settlement |
| Trust and safety | Three-column grid: skill-based Predominance Test, escrow-protected funds, KYC and responsible gaming |
| FAQ | Accordion covering payouts, disputes, jury, trust score, supported banks |
| Blog | Card grid of latest posts with title, date, excerpt |
| Footer | Logo, nav links, social links, legal disclaimer |

### Additional Marketing Section

The additional marketing section is a waitlist/newsletter capture block.

Purpose:

- Capture users who are not ready to install yet.
- Build a launch audience for public release.
- Provide a low-friction CTA below the core trust and FAQ sections.

Fields:

- Email address
- Optional role selector: Player, creator, community lead, partner

Storage target is `marketing_waitlist`. Form inserts run through a server-only action using the Supabase service-role client.

### SEO and Metadata

Every marketing route must define:

- Page `<title>`
- Meta description
- Open Graph title, description, and image
- Twitter card metadata

The app must also generate:

- `sitemap.xml`
- `robots.txt`

The root landing page owns the primary brand metadata. Blog pages derive metadata from MDX frontmatter.

Blog images for v1 live in `public/blog/images/` and are committed alongside MDX posts.

## Admin Panel

The admin app uses a fixed left sidebar with nav links, a top bar with the signed-in user email and sign out, and a full-width content area with padding.

### Auth Guard

`middleware.ts` checks the Supabase session on every `/admin/**` request. If there is no session, redirect to `/auth/login`.

After login, the admin layout performs a server-side check against `profiles.is_admin`. If false, render a 403 page. Admins cannot self-register; they must be flagged in the database.

### Admin Account Provisioning

First admin provisioning is a manual database operation performed by the project owner from Supabase SQL editor or `supabase db query`.

After the admin user signs up normally, run:

```sql
update public.profiles
set is_admin = true
where id = '<USER_UUID>';
```

To find the user ID by email:

```sql
select id, email
from auth.users
where email = '<ADMIN_EMAIL>';
```

Then verify:

```sql
select id, username, is_admin
from public.profiles
where id = '<USER_UUID>';
```

Only existing project owners run this. The web app must not include self-service admin registration.

### Admin Data Sources

Server components query Supabase directly from the server using the service role key. Client components must not receive service-role credentials.

Initial query shapes:

- Dashboard stats:
  - `withdrawal_requests` where `status = 'pending'`
  - `kyc_verifications` where `status = 'pending'`
  - `jury_cases` where `status in ('open', 'jury_voting', 'escalated')`
  - `profiles` where `account_status = 'frozen'`
- Recent activity:
  - `audit_logs`, latest 20 rows ordered by `created_at desc`
  - Surface admin, provider, and high-risk system events first
- Withdrawal queue:
  - `withdrawal_requests`
  - Join or follow-up fetch from `profiles` for username/display name
  - Destination bank details come from `withdrawal_requests.destination`
- KYC queue:
  - `kyc_verifications`
  - Join or follow-up fetch from `profiles` for username/current KYC tier
- Users:
  - `profiles`
  - `wallet_summary`
  - Optional `responsible_gaming_settings`
- Jury:
  - `jury_cases`
  - `dares`
  - `jury_assignments`

Confirmed schema note: the actual audit table is `audit_logs`; there is no `audit_risk_log` table in the current migrations. Confirm exact selected columns before writing each server component to avoid over-fetching sensitive fields.

### `/admin` Dashboard

Show stat cards for:

- Pending withdrawals
- Pending KYC submissions
- Open disputes
- Frozen accounts

Show a recent activity table with the latest 20 admin-visible events. Data loads in server components by querying Supabase directly with server-side credentials.

### `/admin/withdrawals`

Withdrawal queue with filter tabs:

- Pending
- Approved
- Rejected
- All

Table columns:

- Username
- Amount in NGN
- Bank name
- Account number
- Requested at

Row actions:

- Approve: dialog with required admin note, minimum 5 characters, then call `POST /admin/withdrawals/{id}/approve`
- Reject: dialog with required admin note, minimum 5 characters, then call `POST /admin/withdrawals/{id}/reject`

Approved rows are claimed by `claim_paystack_withdrawals` and processed automatically.

### `/admin/kyc`

KYC review queue with filter tabs:

- Pending
- Approved
- Rejected

Table columns:

- Username
- Tier requested
- Submitted at

Clicking a row opens a review drawer showing submitted document fields and the current KYC tier.

Actions:

- Approve with granted tier
- Reject with reason

Both actions call `POST /admin/kyc/{verificationId}/decide`.

### `/admin/users`

Account management page with debounced username search.

Table columns:

- Username
- Account status badge
- KYC tier
- Trust score
- Joined

Clicking a row opens `/admin/users/[id]`.

### `/admin/users/[id]`

User detail page:

- Profile card with avatar, bio, and categories
- Wallet summary: available, escrowed, pending withdrawal
- Account status
- KYC tier
- Freeze account button

Freeze flow:

- Confirmation dialog
- Required admin note, minimum 5 characters
- Call `POST /admin/users/{id}/freeze`

### `/admin/jury`

Jury oversight page with filter tabs:

- Open
- Escalated
- Resolved

Table columns:

- Truncated case ID
- DARE ID
- Votes cast / needed
- Status badge
- Created at

Actions:

- Assign: call `POST /admin/jury-cases/{id}/assign`
- Resolve, escalated only: verdict picker with `A`, `B`, `void`, `escalate`, plus rationale, then call `POST /admin/jury-cases/{id}/resolve`

## File Structure

```text
dare/web/
|-- app/
|   |-- (marketing)/
|   |   |-- layout.tsx
|   |   |-- page.tsx
|   |   |-- trust-safety/page.tsx
|   |   |-- faq/page.tsx
|   |   `-- blog/
|   |       |-- page.tsx
|   |       `-- [slug]/page.tsx
|   |-- admin/
|   |   |-- layout.tsx
|   |   |-- page.tsx
|   |   |-- withdrawals/page.tsx
|   |   |-- kyc/page.tsx
|   |   |-- users/
|   |   |   |-- page.tsx
|   |   |   `-- [id]/page.tsx
|   |   `-- jury/page.tsx
|   |-- auth/login/page.tsx
|   |-- globals.css
|   |-- layout.tsx
|   |-- robots.ts
|   `-- sitemap.ts
|-- components/
|   |-- marketing/
|   `-- admin/
|-- lib/
|   |-- supabase/
|   |   |-- client.ts
|   |   |-- server.ts
|   |   `-- middleware.ts
|   `-- admin-api.ts
|-- content/blog/
|-- public/
|   |-- favicon.ico
|   |-- og-image.png
|   `-- blog/images/
|-- proxy.ts
|-- next.config.ts
`-- package.json
```

## Build Order

1. Scaffold `dare/web/` with Next.js 16, TypeScript, Tailwind, and shadcn/ui.
   - Use `next-mdx-remote/rsc` plus `gray-matter` for blog rendering; do not configure `@next/mdx`.
   - Configure Syne, DM Sans, and JetBrains Mono via `next/font/google` in `app/layout.tsx`.
   - Include a Supabase migration for `marketing_waitlist`.
2. Set up Supabase browser client, server client, and middleware session refresh.
3. Build auth flow: login page, middleware protection, and `is_admin` guard.
4. Build marketing landing page with all sections.
5. Build marketing sub-pages: trust and safety, FAQ, blog.
6. Build admin shell with sidebar layout, stat cards, and dashboard.
7. Build admin withdrawals queue.
8. Build admin KYC queue.
9. Build admin users list and detail page.
10. Build admin jury oversight.

## Monorepo Integration

`dare/web/` stays independent enough to deploy as its own Vercel project, while sharing baseline TypeScript and linting conventions with the repository.

Minimum shared structure:

- Root `tsconfig.base.json`
- Shared ESLint config if linting is introduced
- Web-specific scripts inside `dare/web/package.json`
- No direct imports from `dare/mobile/`
- Shared constants remain local to each app until a dedicated `dare/packages/` workspace is created.
