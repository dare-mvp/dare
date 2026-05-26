# DARE Web App — Implementation Specification

## Purpose

This document converts `14-web-app-plan.md` into a step-by-step build guide. Every section corresponds to a step in the build order and specifies exact commands, packages, file contents, query shapes, component APIs, and UI states. Nothing here requires guessing; decisions not in this spec are explicitly deferred.

---

## Step 1: Scaffold `dare/web/`

### Bootstrap

```bash
cd dare
npx create-next-app@latest web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
cd web
```

The target runtime is Next.js 16. After scaffolding, verify `package.json` uses `next@16.x`. If `create-next-app@latest` installs a newer major version, pin `next` back to the latest Next 16 release before continuing.

### Additional packages

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install next-mdx-remote gray-matter
npm install @tailwindcss/typography
npm install lucide-react clsx tailwind-merge
npx shadcn@latest init
```

shadcn init answers: style `default`, base color `neutral`, CSS variables `yes`.

Then add the shadcn components used across the app:

```bash
npx shadcn@latest add button input label badge table tabs dialog drawer sheet accordion card separator skeleton
```

### `next.config.ts`

The blog uses filesystem reads plus `compileMDX` from `next-mdx-remote/rsc`. Do not install or configure `@next/mdx`; MDX files are not imported directly as React components.

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
```

### Font loading (`app/layout.tsx` root)

Load all three brand fonts from Google Fonts using `next/font/google`. Expose them as CSS variables so Tailwind can reference them.

```ts
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';

const syne = Syne({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-syne-var',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans-var',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono-var',
});
```

Apply all three variables on the `<html>` element's `className`.

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

### Tailwind v4 theme (`app/globals.css`)

This spec commits to Tailwind CSS v4. Do not add a v3-style `tailwind.config.ts` for theme tokens. Brand colors and fonts live in CSS via `@theme`.

### `globals.css`

Set the default background and text color on `:root` and `body`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --color-brand-bg: #050509;
  --color-brand-surface: #0E0E1A;
  --color-brand-primary: #FF5500;
  --font-syne: var(--font-syne-var), sans-serif;
  --font-sans: var(--font-dm-sans-var), sans-serif;
  --font-mono: var(--font-jetbrains-mono-var), monospace;
}

:root {
  --background: #050509;
  --foreground: #f5f5f5;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: var(--font-dm-sans-var), sans-serif;
}
```

### Environment file

Create `dare/web/.env.local.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Copy to `.env.local` and fill in values from the Supabase project dashboard. `SUPABASE_SERVICE_ROLE_KEY` must never appear in client components or `NEXT_PUBLIC_*` variables.

### Waitlist migration decision

If the waitlist form is live in v1, create a Supabase migration before writing the form:

```sql
create table public.marketing_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text,
  created_at timestamptz not null default now()
);

alter table public.marketing_waitlist enable row level security;
-- No public select/update/insert policy. Inserts go through a Server Action using the service-role client.
```

If deferred, render the waitlist section as a static display with no form submission.

---

## Step 2: Supabase Clients and Middleware Session Refresh

### `lib/supabase/client.ts` (browser)

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### `lib/supabase/server.ts` (server components and Server Actions)

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}
```

### `lib/supabase/admin.ts` (service role — server only)

Used exclusively in admin server components and Server Actions. Never import this in client components.

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

### `lib/supabase/middleware.ts`

```ts
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return response;
}
```

### `proxy.ts` (root)

```ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Step 3: Auth Flow

### `app/auth/login/page.tsx`

Server component that renders a client login form. The form calls `supabase.auth.signInWithPassword` using the browser client, then redirects to `/admin` on success.

States:
- Default: email + password fields, submit button
- Loading: button shows spinner, inputs disabled
- Error: inline error message below the form (`Invalid login credentials` → show "Incorrect email or password")
- Success: `router.replace('/admin')`

No sign-up link. No password reset link in v1.

### `app/admin/layout.tsx` — `is_admin` guard

This layout runs on the server. After the middleware confirms a session exists, the layout performs a second check:

```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user!.id)
  .single();

if (!profile?.is_admin) {
  return <ForbiddenPage />;
}
```

`ForbiddenPage` is a simple full-page message: "Access denied. This account does not have admin privileges."

The layout also renders the admin shell: fixed left sidebar + top bar. See Step 6 for the shell spec.

Create a shared server-only helper, `lib/admin-auth.ts`, and call it from every admin page and every admin Server Action before using `createAdminClient()`. Do not rely on layout protection alone for pages that query with the service role.

```ts
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    throw new Error('FORBIDDEN');
  }

  return { user };
}
```

Every route under `/admin/**` must opt out of static caching:

```ts
export const dynamic = 'force-dynamic';
```

Admin data is sensitive and should never be statically generated or cached across users.

### Sign out

The top bar includes a "Sign out" button that calls a Server Action:

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/auth/login');
}
```

---

## Step 4: Marketing Landing Page

### `app/(marketing)/layout.tsx`

Renders a sticky top navigation bar and wraps children. The nav contains:
- Left: DARE wordmark in Syne 800
- Right: two explicit CTA links, no user-agent detection:
  - Primary: "Download APK" -> Android APK URL
  - Secondary: "iOS TestFlight" -> TestFlight URL

No auth state in the marketing layout.

### `app/(marketing)/page.tsx`

Compose sections in order:

```tsx
<HeroSection />
<HowItWorksSection />
<TrustSafetySection />
<WaitlistSection />
<FaqSection />
<BlogPreviewSection />
<FooterSection />
```

Each section is a separate component in `components/marketing/`.

### `HeroSection`

- Full-viewport-height section with centered content
- Headline: `Challenge. Wager. Win.` — Syne 800, large (text-5xl md:text-7xl)
- Subcopy: one line describing DARE in plain language — DM Sans, muted
- Two CTAs side by side:
  - Primary: "Download APK" → links to the APK file URL (placeholder `#` until the APK is hosted)
  - Secondary: "iOS TestFlight" → links to the TestFlight URL (placeholder `#`)
- Right side or background: phone mockup image or abstract glowing geometric visual
- The `#FF5500` primary color used for the primary CTA and accent glows only

### `HowItWorksSection`

Four numbered steps in a horizontal row (desktop) or vertical stack (mobile):

1. Create a DARE — set the challenge, stake, and category
2. Opponent accepts — funds go into escrow
3. Court — timed challenge with live countdown
4. Settlement — winner receives payout, trust score updates

Each step has an icon, a bold short label (Syne), and one sentence of body copy (DM Sans).

### `TrustSafetySection`

Three columns:

| Column | Icon | Heading | Body |
|---|---|---|---|
| Skill-based | scales icon | Skill Wins Here | The Predominance Test: outcomes decided by player skill, not chance |
| Escrowed funds | lock icon | Funds in Escrow | Money is locked the moment a DARE is accepted, released only on settlement |
| KYC and gaming limits | shield icon | Responsible Gaming | Identity verified, deposit limits enforced, self-exclusion available |

### `WaitlistSection`

Client component. Add `'use client'` at the top and use React 19 `useActionState` so the form can render Server Action return states without manual client-side fetch.

Placed between TrustSafety and FAQ. Full-width dark surface block (`bg-brand-surface`).

Heading: "Be first in."
Subcopy: "Sign up to get early access and launch updates."

Form fields:
- Email input (required, type email)
- Role selector (optional): `<select>` with options Player, Creator, Community lead, Partner

Submit button: "Join waitlist"

On submit: call a Server Action that validates the form and inserts into `marketing_waitlist` with `createAdminClient()`. Do not use the anon server client for this insert; the table has RLS enabled and intentionally has no public insert policy.

Return states:
- Success: replace form with "You're on the list." confirmation message
- Duplicate email: show "You're already signed up."
- Other error: show "Something went wrong. Try again."

Server Action implementation shape:

```ts
'use server';
import { createAdminClient } from '@/lib/supabase/admin';

export type WaitlistState = { ok?: boolean; error?: 'invalid_email' | 'duplicate' | 'unknown' };

export async function joinWaitlist(
  _previousState: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? '').trim() || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'invalid_email' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('marketing_waitlist')
    .insert({ email, role });

  if (error?.code === '23505') return { error: 'duplicate' };
  if (error) return { error: 'unknown' };
  return { ok: true };
}
```

Client component action state:

```tsx
'use client';

import { useActionState } from 'react';
import { joinWaitlist, type WaitlistState } from './actions';

const initialState: WaitlistState = {};

export function WaitlistSection() {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);

  if (state.ok) {
    return <p>You're on the list.</p>;
  }

  return (
    <form action={formAction}>
      {/* email, role, submit button */}
      {state.error === 'duplicate' ? <p>You're already signed up.</p> : null}
      {state.error === 'invalid_email' ? <p>Enter a valid email.</p> : null}
      {state.error === 'unknown' ? <p>Something went wrong. Try again.</p> : null}
      <button disabled={pending}>Join waitlist</button>
    </form>
  );
}
```

### `FaqSection`

shadcn `Accordion` component, `type="multiple"` (multiple items can be open).

Render from `lib/faq-data.ts`, using the first five items on the landing page and the full array on `/faq`.

### `lib/faq-data.ts`

```ts
export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: 'How do payouts work?',
    answer: 'When a DARE settles, the winner receives the eligible escrow payout after platform fees. Wallet updates are recorded through immutable ledger entries.',
  },
  {
    question: "What happens if there's a dispute?",
    answer: 'A player can file a dispute during the dispute window. Evidence is reviewed through the jury flow, and the final verdict controls settlement.',
  },
  {
    question: 'Who are the jurors?',
    answer: 'Jurors are eligible DARE users who meet KYC, trust, and anti-collusion checks. Jury packets are blinded so jurors focus on evidence, not identity.',
  },
  {
    question: 'What is a trust score?',
    answer: 'Trust score reflects account behavior such as completed DAREs, forfeits, disputes, and jury reliability. It helps protect players from risky matches.',
  },
  {
    question: 'Which banks and accounts are supported?',
    answer: 'Deposits and withdrawals are handled through the configured payment provider. Supported banks depend on the provider coverage available at launch.',
  },
];
```

The landing FAQ renders `faqItems.slice(0, 5)`. The full FAQ page renders every item in `faqItems`.

### `BlogPreviewSection`

Reads the three most recent MDX posts from `content/blog/`. Renders as a card grid (3 columns desktop, 1 mobile). If frontmatter `category` is missing, render the card category badge as `General`.

Each card:
- Cover image (from frontmatter `image` field, falls back to a placeholder gradient)
- Category badge — JetBrains Mono, brand primary
- Title — Syne
- Excerpt — DM Sans, muted
- Date — JetBrains Mono, small

"Read all posts →" link at the bottom.

This section must be a server component so it can read the filesystem at build time.

Use a single shared loader so the landing preview, blog index, sitemap, and detail pages cannot drift.

### `lib/blog.ts`

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const SLUG_PATTERN = /^[a-z0-9-]+$/;

export type BlogFrontmatter = {
  title: string;
  date: string;
  excerpt: string;
  image?: string;
  author: string;
  category?: string;
};

export type BlogPostPreview = BlogFrontmatter & {
  slug: string;
};

function assertFrontmatter(data: Record<string, unknown>, slug: string): BlogFrontmatter {
  if (
    typeof data.title !== 'string' ||
    typeof data.date !== 'string' ||
    typeof data.excerpt !== 'string' ||
    typeof data.author !== 'string'
  ) {
    throw new Error(`Invalid blog frontmatter for ${slug}`);
  }

  return {
    title: data.title,
    date: data.date,
    excerpt: data.excerpt,
    author: data.author,
    image: typeof data.image === 'string' ? data.image : undefined,
    category: typeof data.category === 'string' ? data.category : undefined,
  };
}

export async function getBlogSlugs(): Promise<string[]> {
  let files: string[];
  try {
    files = await fs.readdir(BLOG_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  return files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''))
    .filter((slug) => SLUG_PATTERN.test(slug));
}

export async function getAllBlogPosts(): Promise<BlogPostPreview[]> {
  const slugs = await getBlogSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const { frontmatter } = await getBlogPost(slug);
      return { slug, ...frontmatter };
    }),
  );

  return posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export async function getLatestBlogPosts(limit = 3): Promise<BlogPostPreview[]> {
  return (await getAllBlogPosts()).slice(0, limit);
}

export async function getBlogPost(slug: string): Promise<{
  slug: string;
  frontmatter: BlogFrontmatter;
  source: string;
}> {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error('Invalid blog slug');
  }

  const source = await fs.readFile(path.join(BLOG_DIR, `${slug}.mdx`), 'utf8');
  const parsed = matter(source);
  return {
    slug,
    frontmatter: assertFrontmatter(parsed.data, slug),
    source: parsed.content,
  };
}
```

### `FooterSection`

Four columns:
- DARE wordmark + one-line tagline
- Nav links: Home, How it works, Trust & Safety, FAQ, Blog
- Legal links: Terms of service, Privacy policy
- Social links: Twitter/X, Instagram (placeholders until handles are confirmed)

Below the columns: a legal disclaimer in small muted text:

> DARE is a skill-based challenges platform. Outcomes are determined by player performance, not chance. Available to users 18 and over in supported regions.

---

## Step 5: Marketing Sub-pages and SEO

### `app/(marketing)/trust-safety/page.tsx`

Expands the three trust columns from the landing section into full explanatory content with headers, paragraphs, and a final responsible gaming CTA. Content TBD during implementation.

### `app/(marketing)/faq/page.tsx`

Full FAQ accordion. Same component as the landing section but with a longer list of items. Sourced from a static array defined in `lib/faq-data.ts` so the same data can be rendered on both routes.

### Blog

#### MDX frontmatter shape

Every file in `content/blog/` must start with:

```yaml
---
title: string
date: YYYY-MM-DD
excerpt: string (1–2 sentences, used in card grid and og:description)
image: /blog/images/filename.jpg  (optional, falls back to placeholder)
author: string
---
```

#### `app/(marketing)/blog/page.tsx`

Server component. Reads all MDX files from `content/blog/`, sorts by date descending, renders the card grid. Same card component as `BlogPreviewSection`.

#### `app/(marketing)/blog/[slug]/page.tsx`

Server component. Reads and renders the MDX file matching `params.slug`. Renders a prose article layout with a cover image, title, date, author, and the MDX body.

Prose styles: apply Tailwind Typography (`@tailwindcss/typography`) to the MDX wrapper div. The plugin is loaded from `app/globals.css` with Tailwind v4 `@plugin`.

Use `compileMDX` from `next-mdx-remote/rsc` in the detail page:

```tsx
import { compileMDX } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import { getBlogPost, getBlogSlugs } from '@/lib/blog';

export async function generateStaticParams() {
  return (await getBlogSlugs()).map((slug) => ({ slug }));
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const post = await getBlogPost(slug);
    const { content } = await compileMDX({ source: post.source });
    return <article className="prose prose-invert">{content}</article>;
  } catch {
    notFound();
  }
}
```

#### Static generation

`/blog/[slug]` must export `generateStaticParams` so individual posts are statically generated at build time. `/blog` is a static server component that reads all posts at build time and does not need `generateStaticParams`.

### SEO files

#### `app/sitemap.ts`

```ts
import { MetadataRoute } from 'next';
import { getAllBlogPosts } from '@/lib/blog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllBlogPosts();

  return [
    { url: 'https://dareapp.com', lastModified: new Date() },
    { url: 'https://dareapp.com/trust-safety', lastModified: new Date() },
    { url: 'https://dareapp.com/faq', lastModified: new Date() },
    { url: 'https://dareapp.com/blog', lastModified: new Date() },
    ...posts.map((post) => ({
      url: `https://dareapp.com/blog/${post.slug}`,
      lastModified: new Date(post.date),
    })),
  ];
}
```

Replace `dareapp.com` with the confirmed production domain once known.

#### `app/robots.ts`

```ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin/' },
    sitemap: 'https://dareapp.com/sitemap.xml',
  };
}
```

#### Metadata per route

Define a `generateMetadata` export or static `metadata` object on each marketing page:

| Route | Title | Description |
|---|---|---|
| `/` | DARE — Challenge. Wager. Win. | The hyper-local P2P skill challenge platform for Africa |
| `/trust-safety` | Trust & Safety — DARE | How DARE protects your funds and verifies your identity |
| `/faq` | FAQ — DARE | Common questions about DARE, payouts, disputes, and jury |
| `/blog` | Blog — DARE | Updates, guides, and community stories from DARE |
| `/blog/[slug]` | `{post.title} — DARE` | `{post.excerpt}` |

All routes share the same `og:image`. Create `public/og-image.png` (1200×630) during the marketing build step. Blog posts can override with a post-specific image from frontmatter.

---

## Step 6: Admin Shell and Dashboard

### Admin sidebar

Left sidebar, fixed position, full height, `bg-brand-surface` background, `w-56`.

Nav items with icons (Lucide):

| Icon | Label | Route |
|---|---|---|
| LayoutDashboard | Dashboard | `/admin` |
| ArrowDownCircle | Withdrawals | `/admin/withdrawals` |
| UserCheck | KYC | `/admin/kyc` |
| Users | Users | `/admin/users` |
| Gavel | Jury | `/admin/jury` |

Active route: highlight with `text-brand-primary` and a left border accent.

### Admin top bar

Full-width bar above the content area, `bg-brand-surface`, height `h-14`. Contains:
- Left: page title from a small client component that maps the current pathname to a label
- Right: signed-in email address in muted text + "Sign out" button

Implement title derivation in `components/admin/AdminTopBar.tsx`, not in the server layout.

```tsx
'use client';

import { usePathname } from 'next/navigation';

const ADMIN_TITLES: Array<[RegExp, string]> = [
  [/^\/admin$/, 'Dashboard'],
  [/^\/admin\/withdrawals/, 'Withdrawals'],
  [/^\/admin\/kyc/, 'KYC Review'],
  [/^\/admin\/users\/[^/]+$/, 'User Detail'],
  [/^\/admin\/users/, 'Users'],
  [/^\/admin\/jury/, 'Jury Oversight'],
];

function getAdminTitle(pathname: string): string {
  return ADMIN_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'Admin';
}

export function AdminTopBar({ email }: { email: string }) {
  const pathname = usePathname();
  const title = getAdminTitle(pathname);

  return (
    <header className="flex h-14 items-center justify-between bg-brand-surface px-6">
      <h1 className="font-syne text-lg">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{email}</span>
        {/* Sign out Server Action form goes here. */}
      </div>
    </header>
  );
}
```

### `lib/admin-api.ts`

Typed wrappers for every admin Edge Function call. All calls go to:

```
{NEXT_PUBLIC_SUPABASE_URL}/functions/v1/actions
```

With `Authorization: Bearer {session.access_token}` and the action envelope format the Edge Function expects.

The Edge Function action is selected by the REST path, not by an `action` field in the JSON body. Every wrapper sends `POST` to one of these paths:

| Wrapper | Path |
|---|---|
| `approveWithdrawal` | `/functions/v1/actions/admin/withdrawals/{id}/approve` |
| `rejectWithdrawal` | `/functions/v1/actions/admin/withdrawals/{id}/reject` |
| `decideKyc` | `/functions/v1/actions/admin/kyc/{verificationId}/decide` |
| `freezeUser` | `/functions/v1/actions/admin/users/{userId}/freeze` |
| `assignJuryCase` | `/functions/v1/actions/admin/jury-cases/{caseId}/assign` |
| `resolveJuryCase` | `/functions/v1/actions/admin/jury-cases/{caseId}/resolve` |

Functions to define:

```ts
approveWithdrawal(id: string, reason: string, accessToken: string): Promise<void>
rejectWithdrawal(id: string, reason: string, accessToken: string): Promise<void>
decideKyc(
  verificationId: string,
  payload: {
    verdict: 'approved' | 'rejected';
    kycTierGranted?: 'kyc1' | 'kyc2' | 'kyc3';
    adminNote?: string;
  },
  accessToken: string,
): Promise<void>
freezeUser(userId: string, reason: string, accessToken: string): Promise<void>
assignJuryCase(caseId: string, accessToken: string, assignmentCount?: 3 | 5 | 7): Promise<void>
resolveJuryCase(
  caseId: string,
  payload: {
    verdict: 'A' | 'B' | 'void' | 'uphold' | 'overturn';
    adminNote: string;
  },
  accessToken: string,
): Promise<void>
```

All functions throw on non-2xx responses. Callers handle errors and surface them in the UI.

All admin Edge Function calls must use the existing action envelope. Do not include an `action` property.

```ts
{
  requestId: crypto.randomUUID(),
  idempotencyKey: `${scope}:${crypto.randomUUID()}`,
  payload
}
```

Shared fetch helper:

```ts
type ActionEnvelope<TPayload> = {
  requestId: string;
  idempotencyKey: string;
  payload: TPayload;
};

async function postAdminAction<TPayload>(
  path: string,
  scope: string,
  payload: TPayload,
  accessToken: string,
): Promise<void> {
  const body: ActionEnvelope<TPayload> = {
    requestId: crypto.randomUUID(),
    idempotencyKey: `${scope}:${crypto.randomUUID()}`,
    payload,
  };

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      typeof errorBody?.error?.message === 'string'
        ? errorBody.error.message
        : `Admin action failed with ${response.status}`,
    );
  }
}
```

Payload field names must match the deployed Edge Functions:

- Withdrawal approve/reject/freeze: `{ reason }`
- KYC decide: `{ verdict, kycTierGranted, adminNote }`
- Jury assign: `{ assignmentCount? }`
- Jury resolve: `{ verdict, adminNote }`

### `app/admin/page.tsx` — Dashboard

Server component. Call `await requireAdmin()` before creating the service-role client. Runs four parallel count queries using `createAdminClient()`:

```ts
const [withdrawals, kyc, disputes, frozen] = await Promise.all([
  adminClient.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  adminClient.from('kyc_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  adminClient.from('jury_cases').select('id', { count: 'exact', head: true }).in('status', ['filed', 'accepted_for_review', 'jury_assignment', 'jury_voting', 'escalated']),
  adminClient.from('profiles').select('id', { count: 'exact', head: true }).eq('account_status', 'frozen'),
]);
```

Renders four stat cards in a 2×2 grid (desktop) or stacked (mobile):

| Card | Value | Link |
|---|---|---|
| Pending Withdrawals | count | `/admin/withdrawals` |
| Pending KYC | count | `/admin/kyc` |
| Open Disputes | count | `/admin/jury` |
| Frozen Accounts | count | `/admin/users` |

Below the cards: recent activity table. Query:

```ts
adminClient
  .from('audit_logs')
  .select('id, action, actor_user_id, actor_type, target_type, target_id, created_at, metadata')
  .order('created_at', { ascending: false })
  .limit(20)
```

Table columns: Timestamp, Action, Actor, Target. Render `actor_user_id` truncated with `actor_type` as context. Render timestamps in relative format (e.g. "3 minutes ago").

---

## Step 7: Admin Withdrawals Queue

### `app/admin/withdrawals/page.tsx`

Server component with filter tab state passed as a search param (`?status=pending`).

Query:

```ts
adminClient
  .from('withdrawal_requests')
  .select(`
    id,
    status,
    amount,
    currency,
    bank_code,
    account_number,
    account_name,
    requested_at,
    profiles!inner(username)
  `)
  .eq('status', filterStatus)   // omit filter when tab is 'all'
  .order('requested_at', { ascending: false })
  .range(from, to)
```

`withdrawal_requests` stores bank details as columns, not a `destination` JSON object. Use `bank_code`, `account_number`, and `account_name`. If a display bank name is required, add a bank-code mapping helper or future reference table.

Table columns: Username, Amount (NGN, formatted with comma separator), Bank code/name, Account number, Account name, Requested at.

Filter tabs: Pending | Approved | Rejected | All. Tabs are links that update the `?status=` search param.

Row actions (Pending tab only):

**Approve dialog:**
- Trigger: "Approve" button on the row
- Dialog contains: read-only summary of the withdrawal, admin note textarea (required, min 5 characters)
- Submit calls `approveWithdrawal(id, reason, accessToken)` via a Server Action
- On success: revalidate the page
- On error: show inline error message

**Reject dialog:** same pattern, calls `rejectWithdrawal(id, reason, accessToken)`.

Loading state: skeleton rows (use shadcn `Skeleton`).
Empty state: "No withdrawals in this status." with a muted icon.

---

## Step 8: Admin KYC Queue

### `app/admin/kyc/page.tsx`

Server component with `?status=pending` filter.

Query:

```ts
adminClient
  .from('kyc_verifications')
  .select(`
    id,
    status,
    kyc_tier_requested,
    submitted_at,
    documents,
    profiles!inner(username, kyc_tier)
  `)
  .eq('status', filterStatus)
  .order('submitted_at', { ascending: false })
  .range(from, to)
```

Table columns: Username, Current KYC tier, Tier requested (`kyc_tier_requested`), Submitted at.

Filter tabs: Pending | Approved | Rejected.

Clicking a row opens a right-side drawer (`Sheet` from shadcn). The drawer shows:
- Username and current KYC tier
- Submitted at timestamp
- Document fields rendered from the `documents` JSONB column (key/value list)

Drawer actions (Pending rows only):

**Approve:**
- Tier selector with exactly these values:
  ```tsx
  <select name="kycTierGranted" required>
    <option value="kyc1">KYC 1</option>
    <option value="kyc2">KYC 2</option>
    <option value="kyc3">KYC 3</option>
  </select>
  ```
- Submit calls `decideKyc(id, { verdict: 'approved', kycTierGranted: grantedTier, adminNote })`

**Reject:**
- Reason textarea (required, min 5 characters)
- Submit calls `decideKyc(id, { verdict: 'rejected', adminNote: reason })`

On success: close drawer, revalidate page.

---

## Step 9: Admin Users

### `app/admin/users/page.tsx`

This page has a search input. Because search is user-driven, the page is a client component (or a server component that receives `?q=` as a search param).

Use search param approach: the input is a controlled input that updates the URL's `?q=` param with a 300ms debounce. The server component reads `?q=` and runs a filtered query.

Query:

```ts
adminClient
  .from('profiles')
  .select('id, username, display_name, account_status, kyc_tier, trust_score, created_at')
  .ilike('username', `%${q}%`)   // omit when q is empty
  .order('created_at', { ascending: false })
  .range(from, to)
```

Table columns: Username, Account status (badge), KYC tier (badge), Trust score, Joined.

Account status badge colors:
- `active` → green
- `frozen` → red
- `limited` → orange
- `banned`, `closed` → gray
- Other → gray

Clicking a row navigates to `/admin/users/[id]`.

### `app/admin/users/[id]/page.tsx`

Server component. Two parallel queries:

```ts
export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

const [profile, wallet] = await Promise.all([
  adminClient
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, avatar_emoji, avatar_color, jury_categories, account_status, kyc_tier, trust_score, created_at')
    .eq('id', id)
    .single(),
  adminClient
    .from('wallet_summary')
    .select('available_balance, escrowed_balance, pending_withdrawal_balance')
    .eq('user_id', id)
    .single(),
]);
}
```

Page layout:
- Profile card: avatar, username, bio, jury category badges, joined date
- Status row: account status badge, KYC tier badge, trust score
- Wallet card: three balance figures (available, escrowed, pending withdrawal), in NGN
- Actions section: Freeze account button (only if `account_status` is not already `frozen`)

**Freeze flow:**
- Button opens a confirmation dialog
- Dialog contains: warning message, admin note textarea (required, min 5 characters)
- Submit calls `freezeUser(userId, reason, accessToken)` via Server Action
- On success: revalidate page (status badge updates to frozen, button disappears)

If user not found: render a 404-style message "User not found."

---

## Step 10: Admin Jury Oversight

### `app/admin/jury/page.tsx`

Server component with `?status=open` filter. The tab value maps to actual database statuses:

- `open` -> `filed`, `accepted_for_review`, `jury_assignment`, `jury_voting`
- `escalated` -> `escalated`
- `resolved` -> `verdict_reached`, `settlement_pending`, `closed`, `voided`

Query:

```ts
adminClient
  .from('jury_cases')
  .select(`
    id,
    status,
    votes_needed,
    created_at,
    dares!inner(id),
    jury_assignments(id, status),
    jury_votes(id)
  `)
  .in('status', mappedStatuses)
  .order('created_at', { ascending: false })
  .range(from, to)
```

Filter tabs: Open | Escalated | Resolved.

Table columns:
- Case ID (first 8 characters, monospace)
- DARE ID (first 8 characters, link to the DARE if a public detail URL exists — otherwise plain text)
- Votes cast / Votes needed (derived from `jury_votes.length` and `jury_cases.votes_needed`)
- Status badge
- Created at

Row actions:

**Assign** (Open cases):
- Single button, no dialog needed
- Calls `assignJuryCase(caseId, accessToken)`
- On success: revalidate page

**Resolve** (Escalated cases only):
- Opens a dialog
- Verdict picker: radio group with options `A wins`, `B wins`, `Void`, `Uphold dispute`, `Overturn dispute`
- Rationale textarea (required, min 10 characters)
- Calls `resolveJuryCase(caseId, { verdict, adminNote: rationale })`
- Maps display labels to API values: `A wins -> 'A'`, `B wins -> 'B'`, `Void -> 'void'`, `Uphold dispute -> 'uphold'`, `Overturn dispute -> 'overturn'`
- On success: close dialog, revalidate page

---

## Shared Implementation Rules

### Admin auth and caching

Every admin page and admin Server Action must call `requireAdmin()` before using the service-role client or calling admin Edge Function wrappers. Every admin page must export `dynamic = 'force-dynamic'`.

### Server Actions pattern

All admin mutations use Server Actions, not client-side fetch calls. Pattern:

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';
import { approveWithdrawal } from '@/lib/admin-api';

export async function approveWithdrawalAction(id: string, reason: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthenticated');
  await approveWithdrawal(id, reason, session.access_token);
  revalidatePath('/admin/withdrawals');
}
```

### Loading and error states

Every admin page that fetches data must handle three states:

- **Loading**: use React Suspense with a skeleton fallback. Wrap the data-fetching server component in `<Suspense fallback={<TableSkeleton />}>`.
- **Empty**: render a centered message with a muted icon when the query returns zero rows.
- **Error**: if a query throws, the nearest `error.tsx` catches it and renders "Something went wrong. Refresh the page."

Add `app/admin/error.tsx` as a shared admin error boundary.

### Not found states

Add `app/not-found.tsx` for marketing/blog 404s and `app/admin/not-found.tsx` for admin-scoped 404s.

- Invalid blog slugs call `notFound()` from `next/navigation`.
- Missing `/admin/users/[id]` records call `notFound()` after the profile query returns `PGRST116` or no row.
- The admin not-found page must not render sensitive IDs beyond what is already in the URL.

### Admin table pagination

Use search-param pagination in v1 rather than infinite scroll.

- Query params: `?page=1&pageSize=50`, with page size capped at 100 server-side.
- Withdrawal, KYC, and jury pages default to `pageSize=50`.
- Users default to `pageSize=100` because search narrows the result set.
- Fetch with `range(from, to)`, where `from = (page - 1) * pageSize` and `to = from + pageSize - 1`.
- Render Previous / Next buttons below the table. Disable Previous on page 1 and disable Next when fewer than `pageSize` rows return.

### Validation

Admin note fields: minimum 5 characters enforced both in the UI (disable submit button if shorter) and in the Server Action (throw `new Error('Note too short')` if bypassed).

Rationale field on jury resolve: minimum 10 characters, same enforcement.

### `next/image`

Use `next/image` for all images (phone mockup, blog cover images, user avatars). The complete `next.config.ts` in Step 1 already includes the Supabase Storage remote pattern; do not create a second config shape elsewhere.

### TypeScript types

Do not use `any`. Derive types from Supabase query results using the pattern:

```ts
type WithdrawalRow = NonNullable<
  Awaited<ReturnType<typeof fetchWithdrawals>>
>[number];
```

Or generate and import Supabase Database types from `supabase gen types typescript` and use them to type client queries.

### Verification gates

Before considering each build slice complete, run:

```bash
npm run typecheck
npm run lint
npm run build
```

Minimum manual checks:

- Marketing home renders at `/`
- FAQ accordion works with keyboard navigation
- Blog list and one blog detail page render from MDX
- Unauthenticated `/admin` redirects to `/auth/login`
- Non-admin authenticated user sees the 403 page
- Admin user can load dashboard stats
- Withdrawal approve/reject dialogs enforce note length before submit
- KYC drawer renders document JSON without exposing raw secrets
- Freeze user dialog prevents empty notes
- Jury resolve dialog only exposes verdict values accepted by the Edge Function

---

## Out of Scope for v1

- Court / match monitor in the admin panel
- Real-time live updates in admin tables (no WebSocket subscription — page refresh or manual reload)
- Admin user management beyond freeze (no unfreeze, no tier override from the web panel)
- Analytics or page view tracking
- Multi-language / localization
- Dark/light mode toggle (dark only, matching mobile)
