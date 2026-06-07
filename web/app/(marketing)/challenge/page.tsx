import type { Metadata } from 'next';
import { MarketingFooter } from '@/components/marketing/footer';
import { ChallengeFlow } from '@/components/marketing/challenge-flow';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  CHALLENGE_CAP,
  CHALLENGE_END_LABEL,
  CHALLENGE_START_LABEL,
  getChallengeStatus,
} from '@/lib/challenge-config';

export const metadata: Metadata = {
  title: 'I Dare You Challenge',
  description:
    'DARE is challenging you. Join the waitlist, follow, refer friends, earn ₦2,000 to ₦3,000 in your DARE wallet. Nigeria only.',
  openGraph: {
    title: 'I Dare You Challenge — DARE App',
    description:
      'Join the waitlist, follow @dareappofficial, refer friends, film your dare. Earn ₦2,000 – ₦3,000 paid to your DARE wallet.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'I Dare You Challenge — DARE App',
    description:
      'Join the waitlist, follow @dareappofficial, refer friends, film your dare. Earn ₦2,000 – ₦3,000 paid to your DARE wallet.',
    images: ['/og-image.png'],
  },
};


type SearchParams = Promise<{ ref?: string }>;
const REFERRAL_CODE_RE = /^[A-Z0-9]{8}$/;

export default async function ChallengePage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const referralCode = searchParams.ref?.trim().toUpperCase();
  const referredBy = referralCode && REFERRAL_CODE_RE.test(referralCode) ? referralCode : undefined;

  const admin = createAdminClient();
  const { count } = await admin
    .from('marketing_waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'challenge');

  const participantCount = count ?? 0;
  const { isFull, isExpired, isPending, isOpen, spotsRemaining, spotsTaken } =
    getChallengeStatus(participantCount);

  const filledPct = Math.round((spotsTaken / CHALLENGE_CAP) * 100);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden bg-brand-bg px-6 text-center">
        {/* Radial glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-brand-primary opacity-[0.07] blur-[130px]" />
        </div>

        <div aria-hidden className="hero-grid-bg pointer-events-none absolute inset-0 opacity-[0.03]" />

        <div
          aria-hidden
          className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent"
        />

        <div className="relative z-10 max-w-2xl space-y-6">
          {/* Badge */}
          {isOpen ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-1.5 font-mono text-xs text-brand-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-primary" />
              </span>
              LIVE — Closes {CHALLENGE_END_LABEL}
            </div>
          ) : isPending ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 font-mono text-xs text-muted-foreground">
              Opens {CHALLENGE_START_LABEL}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 font-mono text-xs text-muted-foreground">
              {isFull ? `All ${CHALLENGE_CAP} spots filled` : `Closed — ended ${CHALLENGE_END_LABEL}`}
            </div>
          )}

          <h1 className="font-syne text-5xl font-extrabold leading-none tracking-tight text-foreground sm:text-7xl">
            I Dare{' '}
            <span className="text-brand-primary">You.</span>
          </h1>

          <p className="mx-auto max-w-lg text-lg text-muted-foreground leading-relaxed">
            DARE — the skill challenge app — is now challenging <em>you</em>. Complete
            the tasks, DM us on Instagram, and earn your reward.
          </p>

          {/* Reward pills */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="rounded-full border border-white/10 bg-brand-surface px-5 py-2 font-mono text-sm text-foreground">
              Standard{' '}
              <span className="text-[#19C37D] font-bold">₦2,000</span>
            </div>
            <div className="rounded-full border border-brand-primary/40 bg-brand-primary/10 px-5 py-2 font-mono text-sm text-foreground">
              Champion{' '}
              <span className="text-brand-primary font-bold">₦3,000</span>
            </div>
          </div>

          {/* Spots progress */}
          <div className="mx-auto w-full max-w-sm space-y-2">
            <div className="flex justify-between font-mono text-xs text-muted-foreground">
              <span>{spotsTaken} of {CHALLENGE_CAP} spots taken</span>
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

          {isOpen && (
            <div className="pt-2 w-full sm:w-auto">
              <a
                href="#start"
                className="flex w-full sm:inline-flex sm:w-auto h-12 items-center justify-center gap-2 rounded-xl bg-brand-primary px-8 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Start the challenge
              </a>
            </div>
          )}
        </div>
      </section>

      <ChallengeFlow
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
              Joining the DARE waitlist is required to participate in any tier.
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
            <li className="flex gap-2">
              <span className="shrink-0 text-brand-primary">—</span>
              Challenge runs until further notice. DARE may close entries at any time.
            </li>
          </ul>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
