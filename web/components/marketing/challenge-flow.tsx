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
  const [referralUrl, setReferralUrl] = useState<string | undefined>(undefined);

  return (
    <>
      {/* ── Task 01 — Join the Waitlist (required) ───────────── */}
      <section id="start" className="scroll-mt-14 bg-brand-bg px-4 sm:px-6 pt-6 pb-10 sm:pb-16">
        <div className="mx-auto max-w-2xl">
          <ChallengeWaitlist
            referredBy={referredBy}
            spotsRemaining={spotsRemaining}
            isFull={isFull}
            isExpired={isExpired}
            isPending={isPending}
            onSuccess={(code, url) => { setReferralCode(code); setReferralUrl(url); }}
          />
        </div>
      </section>

      {/* ── Challenge Tiers ──────────────────────────────────── */}
      <section id="tiers" className="scroll-mt-14 bg-brand-bg px-4 sm:px-6 py-12 sm:py-20">
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

          <ChallengeTierPicker referralCode={referralCode} referralUrl={referralUrl} />
        </div>
      </section>
    </>
  );
}
