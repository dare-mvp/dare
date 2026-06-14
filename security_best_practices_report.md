# SEO Functionality and Security Audit

Date: 2026-06-14

Scope: Recent web SEO and Google Search Console verification changes in `web/app`, `web/lib/seo.ts`, metadata routes, and `web/public/google76450211c515ba41.html`.

## Automated Checks

- `npm run lint` in `web`: passed.
- `npx tsc --noEmit` in `web`: passed.
- `npm run build` in `web`: passed.
- `npm audit --omit=dev --audit-level=moderate` in `web`: failed on a moderate PostCSS advisory through `next`.
- Runtime smoke test against `next start`: passed for homepage, Google verification meta tag, JSON-LD presence, `robots.txt`, `sitemap.xml`, and Google verification HTML file.

## Findings

### NEXT-SUPPLY-001

Severity: Medium

Location: `web/package.json:20`, `node_modules/next/node_modules/postcss`

Evidence:

```json
"next": "16.2.6"
```

`npm audit` reports `postcss <8.5.10` as vulnerable to XSS via unescaped `</style>` in CSS stringify output, pulled through `next`. The installed package is `next@16.2.6`; the npm registry reports `latest` as `16.2.9`.

Impact: This is not introduced by the SEO code, but it is a production dependency advisory. If attacker-controlled CSS can ever reach PostCSS stringify paths in build or server-side processing, it can become an XSS risk.

Fix: Upgrade `next` and `eslint-config-next` together to the current patch line, then rerun lint, typecheck, build, and `npm audit`. Do not run `npm audit fix --force`; npm suggests a breaking downgrade path.

Mitigation: Keep dependency update checks in CI and review Next.js advisories promptly.

False positive notes: Current project code did not reveal attacker-controlled CSS processing in the SEO changes. This remains a dependency hygiene issue until the audit is clean.

### REACT-CSP-001 / REACT-HEADERS-001

Severity: Low

Location: `web/next.config.ts:3`, `web/vercel.json:1`, `web/app/layout.tsx:75`, `web/components/analytics/google-tag-manager.tsx:31`

Evidence:

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
};
```

The repo-visible Next/Vercel config does not set security headers such as CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or clickjacking protection. The layout preconnects to Google endpoints, and GTM injects inline scripts via `next/script`.

Impact: No direct exploit was found in the SEO changes. The JSON-LD path is escaped centrally. However, without visible CSP/security headers, the app has weaker defense-in-depth if future untrusted HTML/script injection is introduced or if GTM governance is loosened.

Fix: Add production security headers centrally, preferably in `next.config.ts` or Vercel edge config. CSP should explicitly account for Next.js, Google Tag Manager, Google Analytics, images, fonts, and Supabase. Start report-only if needed, then enforce.

Mitigation: Keep GTM container access tightly controlled and avoid adding broad third-party script permissions.

False positive notes: Headers may be configured outside this repo at the hosting/CDN layer. Verify runtime production headers after deployment.

## Positive Controls Verified

- Google verification meta tag is in root metadata at `web/app/layout.tsx:34`.
- Google verification static file exists at `web/public/google76450211c515ba41.html:1` and returns the expected body.
- JSON-LD uses centralized escaping at `web/lib/seo.ts:150` with `replace(/</g, '\\u003c')`.
- All SEO JSON-LD insertions found in the Next app route through `jsonLdScript`.
- `robots.txt` allows public pages and blocks `/admin/`, `/auth/`, `/api/`, and `/_next/data/` at `web/app/robots.ts:10`.
- `sitemap.xml` includes home, challenge, FAQ, trust-safety, blog, and blog post URLs.

## Test Gap

`web/package.json` has no `test` script. Current verification is lint, TypeScript, production build, npm dependency audit, and runtime smoke checks.
