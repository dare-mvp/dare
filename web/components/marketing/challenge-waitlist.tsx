'use client';

import { useActionState, useState } from 'react';
import { joinChallengeWaitlist, type ChallengeJoinState } from '@/app/(marketing)/actions';
import { CheckCircle2, Copy, Check, Lock, Clock } from 'lucide-react';
import { CHALLENGE_CAP, CHALLENGE_END_LABEL, CHALLENGE_START_LABEL } from '@/lib/challenge-config';

const initialState: ChallengeJoinState = {};

interface ChallengeWaitlistProps {
  referredBy?: string;
  spotsRemaining: number;
  isFull: boolean;
  isExpired: boolean;
  isPending: boolean;
}

export function ChallengeWaitlist({
  referredBy,
  spotsRemaining,
  isFull,
  isExpired,
  isPending,
}: ChallengeWaitlistProps) {
  const [state, formAction, pending] = useActionState(joinChallengeWaitlist, initialState);
  const [copied, setCopied] = useState(false);

  const referralLink = state.referralUrl ?? null;
  const referralPrefix = referralLink && state.referralCode
    ? referralLink.replace(/^https?:\/\//, '').replace(state.referralCode, '')
    : null;

  async function handleCopy() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  // ── Challenge closed states ───────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="flex gap-4 rounded-2xl border border-white/8 bg-brand-surface p-6">
        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Challenge not open yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The I Dare You Challenge opens on{' '}
            <span className="text-foreground font-medium">{CHALLENGE_START_LABEL}</span>.
            Check back then.
          </p>
        </div>
      </div>
    );
  }

  if (isFull || state.error === 'challenge_full') {
    return (
      <div className="flex gap-4 rounded-2xl border border-white/8 bg-brand-surface p-6">
        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">All {CHALLENGE_CAP} spots are filled</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This challenge has reached capacity. Follow{' '}
            <a
              href="https://www.instagram.com/dareappofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary hover:underline"
            >
              @dareappofficial
            </a>{' '}
            to hear about the next one.
          </p>
        </div>
      </div>
    );
  }

  if (isExpired || state.error === 'challenge_closed') {
    return (
      <div className="flex gap-4 rounded-2xl border border-white/8 bg-brand-surface p-6">
        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Challenge closed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This challenge ended on{' '}
            <span className="text-foreground font-medium">{CHALLENGE_END_LABEL}</span>.
            Follow{' '}
            <a
              href="https://www.instagram.com/dareappofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary hover:underline"
            >
              @dareappofficial
            </a>{' '}
            to hear about the next one.
          </p>
        </div>
      </div>
    );
  }

  // ── Success: show referral link ───────────────────────────────────────────

  if (state.ok && referralLink) {
    return (
      <div className="space-y-5 rounded-2xl border border-[#19C37D]/30 bg-[#19C37D]/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#19C37D]/15">
            <CheckCircle2 className="h-5 w-5 text-[#19C37D]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">You&apos;re on the list.</p>
            <p className="text-xs text-muted-foreground">
              Your referral link is ready. Use it for Tasks 03 and 04.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Your referral link
          </p>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap rounded-lg border border-white/10 bg-brand-bg px-3 py-2.5 font-mono text-xs">
              <span className="text-muted-foreground">{referralPrefix}</span>
              <span className="font-bold text-brand-primary">{state.referralCode}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-colors hover:bg-white/10 active:scale-95"
              aria-label="Copy referral link"
            >
              {copied ? (
                <Check className="h-4 w-4 text-[#19C37D]" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Every friend who signs up via your link counts as a referral for Task 04.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 rounded-2xl border border-white/8 bg-brand-surface p-6">
      {/* Spots remaining bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>{spotsRemaining} of {CHALLENGE_CAP} spots remaining</span>
          <span>Closes {CHALLENGE_END_LABEL}</span>
        </div>
        <div className="flex gap-0.5" aria-hidden>
          {Array.from({ length: 20 }, (_, i) => {
            const filledBlocks = Math.round(((CHALLENGE_CAP - spotsRemaining) / CHALLENGE_CAP) * 20);
            return (
              <div
                key={i}
                className={`h-1 flex-1 rounded-sm ${i < filledBlocks ? 'bg-brand-primary' : 'bg-white/10'}`}
              />
            );
          })}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Join the DARE waitlist to get your unique referral link. Required for all tiers.
      </p>

      <form action={formAction} className="space-y-3">
        {referredBy ? <input type="hidden" name="referred_by" value={referredBy} /> : null}

        <div className="flex gap-2">
          <input
            name="email"
            type="email"
            placeholder="your@email.com"
            required
            disabled={pending}
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 shrink-0 items-center rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? 'Joining…' : 'Join & get link'}
          </button>
        </div>

        {state.error === 'invalid_email' ? (
          <p className="text-xs text-destructive">Enter a valid email address.</p>
        ) : null}
        {state.error === 'invalid_referral' ? (
          <p className="text-xs text-destructive">
            This referral link is invalid. Remove the referral code and try again.
          </p>
        ) : null}
        {state.error === 'rate_limited' ? (
          <p className="text-xs text-destructive">Too many attempts. Try again later.</p>
        ) : null}
        {state.error === 'unknown' ? (
          <p className="text-xs text-destructive">Something went wrong. Try again.</p>
        ) : null}

        <p className="text-xs text-muted-foreground">No spam. Unsubscribe any time.</p>
      </form>
    </div>
  );
}
