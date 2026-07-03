'use client';

import { useState } from 'react';
import { TalentWaitlist } from './talent-waitlist';
import { TalentTaskList } from './talent-task-list';

interface TalentFlowProps {
  referredBy?: string;
  spotsRemaining: number;
  isFull: boolean;
  isExpired: boolean;
  isPending: boolean;
}

export function TalentFlow({
  referredBy,
  spotsRemaining,
  isFull,
  isExpired,
  isPending,
}: TalentFlowProps) {
  const [referralCode, setReferralCode] = useState<string | undefined>(undefined);
  const [referralUrl, setReferralUrl] = useState<string | undefined>(undefined);

  function handleWaitlistSuccess(code: string, url: string) {
    setReferralCode(code);
    setReferralUrl(url);
  }

  return (
    <>
      {/* ── Task 01 — Join the Waitlist ────────────────────── */}
      <section id="start" className="scroll-mt-14 bg-brand-bg px-4 sm:px-6 pt-6 pb-10 sm:pb-16">
        <div className="mx-auto max-w-2xl">
          <TalentWaitlist
            referredBy={referredBy}
            spotsRemaining={spotsRemaining}
            isFull={isFull}
            isExpired={isExpired}
            isPending={isPending}
            onSuccess={handleWaitlistSuccess}
          />
        </div>
      </section>

      {/* ── Tasks 02–08 ──────────────────────────────────── */}
      {referralCode && referralUrl && (
        <section id="tasks" className="scroll-mt-14 bg-brand-bg px-4 sm:px-6 pb-16">
          <div className="mx-auto max-w-2xl">
            <TalentTaskList referralCode={referralCode} referralUrl={referralUrl} />
          </div>
        </section>
      )}
    </>
  );
}
