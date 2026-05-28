'use client';

import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { ChallengeWaitlist } from './challenge-waitlist';
import { ChallengeTierPicker } from './challenge-tier-picker';

interface ChallengeFlowProps {
  referredBy?: string;
  spotsRemaining: number;
  isFull: boolean;
  isExpired: boolean;
  isPending: boolean;
}

export function ChallengeFlow({
  referredBy,
  spotsRemaining,
  isFull,
  isExpired,
  isPending,
}: ChallengeFlowProps) {
  // Lifted state: referral code from the waitlist join is passed down to the
  // tier picker so the tier selection can be linked to this participant.
  const [referralCode, setReferralCode] = useState<string | undefined>(undefined);

  return (
    <>
      {/* ── Task 01 — Join the Waitlist (required) ───────────── */}
      <section id="start" className="scroll-mt-14 bg-brand-surface px-4 sm:px-6 py-12 sm:py-20">
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
                Sign up to get your unique referral link. You need this to complete Tasks 03
                and 04 — it proves your referrals came from you.
              </p>
            </div>
          </div>

          <ChallengeWaitlist
            referredBy={referredBy}
            spotsRemaining={spotsRemaining}
            isFull={isFull}
            isExpired={isExpired}
            isPending={isPending}
            onSuccess={setReferralCode}
          />
        </div>
      </section>

      {/* ── Challenge Tiers ──────────────────────────────────── */}
      <section className="bg-brand-bg px-4 sm:px-6 py-12 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 sm:mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-brand-surface px-4 py-1.5 font-mono text-xs text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              After completing Task 01
            </div>
            <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-foreground sm:text-5xl">
              Pick your tier
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Tap a card to choose your tier, then continue to the claim steps.
            </p>
          </div>

          <ChallengeTierPicker referralCode={referralCode} />
        </div>
      </section>
    </>
  );
}
