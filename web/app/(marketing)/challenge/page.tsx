import type { Metadata } from 'next';
import { Heart, Share2, UserPlus, Video, MessageCircle, ListChecks } from 'lucide-react';
import { MarketingFooter } from '@/components/marketing/footer';
import { ChallengeWaitlist } from '@/components/marketing/challenge-waitlist';
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

const STANDARD_TASKS = [
  {
    number: '02',
    Icon: Heart,
    title: 'Follow',
    description:
      'Follow @dareappofficial on Instagram. Screenshot your follow as proof.',
  },
  {
    number: '03',
    Icon: Share2,
    title: 'Spread the Word',
    description:
      'Share your referral link on your WhatsApp Status, Instagram Story, or any social platform. Screenshot the post as proof.',
  },
  {
    number: '04',
    Icon: UserPlus,
    title: 'Refer 2 Friends',
    description:
      'Get 2 friends to sign up on the DARE waitlist using your referral link. We track this automatically — no screenshot needed.',
  },
];

const CHAMPION_TASK = {
  number: '05',
  Icon: Video,
  title: 'Film Your Dare',
  description:
    'Record a 15–30 second video daring a friend to anything and tell them DARE App is where you settle it properly. Post on Instagram Reels or TikTok, tag @dareappofficial, and use #IDareYouNG. Submit the link in your DM.',
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

          <h1 className="font-syne text-6xl font-extrabold leading-none tracking-tight text-foreground sm:text-8xl">
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
            <div className="pt-2">
              <a
                href="#start"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-primary px-8 font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              >
                Start the challenge
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── Task 01 — Join the Waitlist (required) ───────────── */}
      <section id="start" className="scroll-mt-14 bg-brand-surface px-6 py-20">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="flex items-start gap-4">
            <span className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full border border-brand-primary/40 bg-brand-primary/10 font-mono text-sm font-bold text-brand-primary">
              01
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary mb-1">
                Required for all tiers
              </p>
              <h2 className="font-syne text-2xl font-extrabold text-foreground">
                Join the DARE waitlist
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Sign up to the DARE waitlist to get your unique referral link. You need this link
                to complete Tasks 03 and 04 below — it proves your referrals came from you.
              </p>
            </div>
          </div>

          <ChallengeWaitlist
            referredBy={referredBy}
            spotsRemaining={spotsRemaining}
            isFull={isFull}
            isExpired={isExpired}
            isPending={isPending}
          />
        </div>
      </section>

      {/* ── Challenge Tiers ──────────────────────────────────── */}
      <section className="bg-brand-bg px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-brand-surface px-4 py-1.5 font-mono text-xs text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              After completing Task 01
            </div>
            <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
              Pick your tier
            </h2>
            <p className="mt-3 text-muted-foreground">
              Complete all tasks in your chosen tier to claim your reward.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">

            {/* ── Standard ₦2,000 ── */}
            <div className="rounded-2xl border border-white/8 bg-brand-surface p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Standard Dare
                  </span>
                  <h3 className="mt-1 font-syne text-3xl font-extrabold text-foreground">
                    ₦2,000
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Task 01 + Tasks 02, 03, 04
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-muted-foreground">
                  4 tasks
                </span>
              </div>

              <div className="h-px bg-white/8" />

              <div className="space-y-5">
                {/* Task 01 recap */}
                <div className="flex gap-4 opacity-50">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-[#19C37D]/20 bg-[#19C37D]/5">
                    <ListChecks className="h-4 w-4 text-[#19C37D]" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">01</span>
                      Join the waitlist
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Completed above ↑</p>
                  </div>
                </div>

                {STANDARD_TASKS.map((task) => (
                  <div key={task.number} className="flex gap-4">
                    <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <task.Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="font-mono text-[10px] text-muted-foreground">{task.number}</span>
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Champion ₦3,000 ── */}
            <div className="relative rounded-2xl border border-brand-primary/50 bg-brand-surface p-8 space-y-6 shadow-lg shadow-brand-primary/5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl bg-brand-primary opacity-[0.04]"
              />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-brand-primary">
                    Champion Dare
                  </span>
                  <h3 className="mt-1 font-syne text-3xl font-extrabold text-foreground">
                    ₦3,000
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Task 01 + Tasks 02, 03, 04, 05
                  </p>
                </div>
                <span className="rounded-full border border-brand-primary/40 bg-brand-primary/10 px-3 py-1 font-mono text-xs text-brand-primary">
                  Best reward
                </span>
              </div>

              <div className="relative h-px bg-brand-primary/20" />

              <div className="relative space-y-5">
                {/* Task 01 recap */}
                <div className="flex gap-4 opacity-50">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-[#19C37D]/20 bg-[#19C37D]/5">
                    <ListChecks className="h-4 w-4 text-[#19C37D]" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">01</span>
                      Join the waitlist
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Completed above ↑</p>
                  </div>
                </div>

                {/* Tasks 02 & 03 same as Standard */}
                {STANDARD_TASKS.slice(0, 2).map((task) => (
                  <div key={task.number} className="flex gap-4">
                    <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <task.Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="font-mono text-[10px] text-muted-foreground">{task.number}</span>
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Task 04 — 3 referrals (Champion upgrade) */}
                <div className="flex gap-4">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-brand-primary/20 bg-brand-primary/5">
                    <UserPlus className="h-4 w-4 text-brand-primary" aria-hidden />
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="font-mono text-[10px] text-brand-primary">04</span>
                      Refer 3 Friends
                      <span className="rounded-full border border-brand-primary/30 bg-brand-primary/10 px-2 py-0.5 font-mono text-[10px] text-brand-primary">
                        Champion
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                      Get 3 friends (not 2) to sign up via your referral link.
                    </p>
                  </div>
                </div>

                {/* Task 05 — Film Your Dare */}
                <div className="flex gap-4">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-brand-primary/30 bg-brand-primary/10">
                    <CHAMPION_TASK.Icon className="h-4 w-4 text-brand-primary" aria-hidden />
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="font-mono text-[10px] text-brand-primary">{CHAMPION_TASK.number}</span>
                      {CHAMPION_TASK.title}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                      {CHAMPION_TASK.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── How to Claim ─────────────────────────────────────── */}
      <section className="bg-brand-surface px-6 py-20">
        <div className="mx-auto max-w-2xl space-y-10">
          <div className="text-center">
            <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
              How to claim
            </h2>
            <p className="mt-3 text-muted-foreground">
              Three steps once you have completed all your tasks.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 rounded-xl border border-white/8 bg-brand-bg p-5">
              <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-brand-primary/40 bg-brand-primary/10 font-mono text-xs text-brand-primary">
                1
              </span>
              <div>
                <p className="font-semibold text-foreground text-sm">Open Instagram</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Go to{' '}
                  <a
                    href="https://www.instagram.com/dareappofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary hover:underline"
                  >
                    @dareappofficial
                  </a>{' '}
                  and open a Direct Message.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-white/8 bg-brand-bg p-5">
              <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-brand-primary/40 bg-brand-primary/10 font-mono text-xs text-brand-primary">
                2
              </span>
              <div className="w-full">
                <p className="font-semibold text-foreground text-sm">Send this exact message</p>
                <div className="mt-2 rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
                  <p className="font-mono text-sm text-brand-primary">
                    Challenge accepted and completed
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Attach your screenshots, referral link, and video link (Champion tier) in the
                  same DM thread.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-white/8 bg-brand-bg p-5">
              <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#19C37D]/40 bg-[#19C37D]/10 font-mono text-xs text-[#19C37D]">
                3
              </span>
              <div>
                <p className="font-semibold text-foreground text-sm">Get paid</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  We verify your submission and credit your DARE App wallet within{' '}
                  <span className="text-foreground font-medium">72 hours</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <a
              href="https://ig.me/m/dareappofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center gap-3 rounded-xl bg-brand-primary px-10 text-lg font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              DM @dareappofficial
            </a>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              instagram.com/dareappofficial
            </p>
          </div>
        </div>
      </section>

      {/* ── Small Print ──────────────────────────────────────── */}
      <section className="bg-brand-bg px-6 py-12">
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
