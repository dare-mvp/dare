import type { Metadata } from 'next';
import { MarketingFooter } from '@/components/marketing/footer';
import { TalentFlow } from '@/components/marketing/talent-flow';
import { PassByAnimation } from '@/components/marketing/pass-by-animation';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  TALENT_CHALLENGE_CAP,
  TALENT_CHALLENGE_END_LABEL,
  TALENT_CHALLENGE_START_LABEL,
  TALENT_CHALLENGE_START,
  TALENT_CHALLENGE_END,
  getTalentChallengeStatus,
} from '@/lib/talent-challenge-config';
import { absoluteUrl, SITE_URL, createBreadcrumbSchema, jsonLdScript } from '@/lib/seo';

const CANONICAL = absoluteUrl('/talent');

export const metadata: Metadata = {
  title: 'Show Me Your Talent Dare Challenge — Earn ₦5,000 in Nigeria',
  description:
    'Record your talent, dare a friend to respond, and earn ₦5,000 to your DARE wallet. Nigeria only. 500 spots.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Show Me Your Talent Dare Challenge — Earn ₦5,000',
    description:
      'Record your talent, dare a friend to respond, and earn ₦5,000 to your DARE wallet. Nigeria only. Limited to 500 spots.',
    url: CANONICAL,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Show Me Your Talent Dare Challenge — DARE App' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Show Me Your Talent Dare Challenge — Earn ₦5,000',
    description: 'Record your talent, dare a friend, and earn ₦5,000 to your DARE wallet. Nigeria only.',
    images: ['/og-image.png'],
  },
};

type SearchParams = Promise<{ ref?: string }>;
const REFERRAL_CODE_RE = /^[A-Z0-9]{8}$/;

export default async function TalentPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const referralCode = searchParams.ref?.trim().toUpperCase();
  const referredBy = referralCode && REFERRAL_CODE_RE.test(referralCode) ? referralCode : undefined;

  const admin = createAdminClient();
  const { count } = await admin
    .from('marketing_waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'talent');

  const participantCount = count ?? 0;
  const { isFull, isExpired, isPending, isOpen, spotsRemaining, spotsTaken } =
    getTalentChallengeStatus(participantCount);

  const filledPct = Math.round((spotsTaken / TALENT_CHALLENGE_CAP) * 100);

  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Show Me Your Talent Dare Challenge',
    description:
      'Record your talent, dare a friend to respond, and earn ₦5,000 to your DARE wallet. Nigeria only. Limited to 500 spots.',
    url: CANONICAL,
    startDate: TALENT_CHALLENGE_START.toISOString(),
    endDate: TALENT_CHALLENGE_END.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', url: CANONICAL },
    organizer: {
      '@type': 'Organization',
      name: 'DARE',
      '@id': `${SITE_URL}/#organization`,
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Show Me Your Talent',
        description:
          'Record your talent, dare a friend, refer 3 people, and earn ₦5,000 to your DARE wallet.',
        price: '0',
        priceCurrency: 'NGN',
        availability: 'https://schema.org/InStock',
        validFrom: TALENT_CHALLENGE_START.toISOString(),
        url: CANONICAL,
      },
    ],
    image: absoluteUrl('/og-image.png'),
    maximumAttendeeCapacity: TALENT_CHALLENGE_CAP,
  };

  return (
    <>
      <PassByAnimation />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(eventSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(createBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Show Me Your Talent', path: '/talent' },
        ]))}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center overflow-hidden bg-brand-bg px-6 pt-20 pb-0 sm:pt-28 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-brand-primary opacity-[0.07] blur-[130px]" />
        </div>
        <div aria-hidden className="hero-grid-bg pointer-events-none absolute inset-0 opacity-[0.03]" />
        <div
          aria-hidden
          className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent"
        />

        <div className="relative z-10 max-w-2xl space-y-6">
          {isOpen ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-1.5 font-mono text-xs text-brand-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-primary" />
              </span>
              LIVE — Closes {TALENT_CHALLENGE_END_LABEL}
            </div>
          ) : isPending ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 font-mono text-xs text-muted-foreground">
              Opens {TALENT_CHALLENGE_START_LABEL}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 font-mono text-xs text-muted-foreground">
              {isFull ? `All ${TALENT_CHALLENGE_CAP} spots filled` : `Closed — ended ${TALENT_CHALLENGE_END_LABEL}`}
            </div>
          )}

          <h1 className="font-syne text-5xl font-extrabold leading-none tracking-tight text-foreground sm:text-7xl">
            Show Me Your{' '}
            <span className="text-brand-primary">Talent.</span>
          </h1>

          <p className="mx-auto max-w-lg text-lg text-muted-foreground leading-relaxed">
            Record your talent. Dare a friend to respond. Earn your reward — paid to your DARE wallet.
          </p>

          <div className="flex items-center justify-center">
            <div className="rounded-full border border-brand-primary/40 bg-brand-primary/10 px-6 py-2.5 font-mono text-base text-foreground">
              Earn{' '}
              <span className="text-brand-primary font-bold">₦5,000</span>
              {' '}to your DARE wallet
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm space-y-2">
            <div className="flex justify-between font-mono text-xs text-muted-foreground">
              <span>{spotsTaken} of {TALENT_CHALLENGE_CAP} spots taken</span>
              <span className={spotsRemaining <= 50 ? 'text-brand-primary font-bold' : ''}>
                {spotsRemaining} remaining
              </span>
            </div>
            <div className="flex gap-0.5" aria-hidden>
              {Array.from({ length: 30 }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-sm ${
                    i < Math.round(filledPct * 0.3) ? 'bg-brand-primary' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <TalentFlow
        referredBy={referredBy}
        spotsRemaining={spotsRemaining}
        isFull={isFull}
        isExpired={isExpired}
        isPending={isPending}
      />

      {/* ── Small Print ──────────────────────────────────────── */}
      <section className="bg-brand-bg px-4 sm:px-6 py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Terms &amp; Eligibility
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="shrink-0 text-brand-primary">—</span>
              Open to Nigerian residents aged 18 and above only.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-brand-primary">—</span>
              Only the challenger earns the ₦5,000 reward — not the person responding to the dare.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-brand-primary">—</span>
              Respondents who want to earn must sign up themselves and complete all 8 tasks independently.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-brand-primary">—</span>
              One reward per person. Duplicate or coordinated submissions will be disqualified.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-brand-primary">—</span>
              Referrals are tracked via your unique referral link. Self-referrals do not count.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-brand-primary">—</span>
              You must DM both video links (your talent video + your dared friend&apos;s response) to claim.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-brand-primary">—</span>
              Rewards are credited as DARE App wallet balance within 72 hours of verification.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-brand-primary">—</span>
              DARE reserves the right to disqualify submissions that appear fraudulent.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-brand-primary">—</span>
              This is a promotional challenge, not a gambling or lottery activity.
            </li>
          </ul>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
