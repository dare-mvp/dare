'use client';

import { useActionState, useState, useEffect } from 'react';
import { joinChallengeWaitlist, type ChallengeJoinState } from '@/app/(marketing)/actions';
import { CheckCircle2, Copy, Check, Lock, Clock, ArrowDown } from 'lucide-react';
import { CHALLENGE_CAP, CHALLENGE_END_LABEL, CHALLENGE_START_LABEL } from '@/lib/challenge-config';
import { trackEvent } from '@/lib/analytics';

const initialState: ChallengeJoinState = {};

const SHARE_TEXT = 'I dare you to try this 👊 Join the DARE I Dare You Challenge and earn up to ₦3,000. Sign up with my link:';

function ShareButton({ referralLink }: { referralLink: string }) {
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'I Dare You Challenge — DARE App',
          text: SHARE_TEXT,
          url: referralLink,
        });
        trackEvent('challenge_task_share_click', { source: 'step1', method: 'native' });
        return;
      } catch {
        // User cancelled or share failed — fall through to WhatsApp
      }
    }
    trackEvent('challenge_task_share_click', { source: 'step1', method: 'whatsapp' });
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${referralLink}`)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleShare}
        className="flex w-full items-center justify-center gap-2 h-12 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        {canNativeShare ? 'Share your link' : 'Share on WhatsApp'}
      </button>
      {canNativeShare && (
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          WhatsApp, Instagram, Twitter, Telegram &amp; more
        </p>
      )}
    </div>
  );
}

interface ChallengeWaitlistProps {
  referredBy?: string;
  spotsRemaining: number;
  isFull: boolean;
  isExpired: boolean;
  isPending: boolean;
  onSuccess?: (referralCode: string, referralUrl: string) => void;
}

export function ChallengeWaitlist({
  referredBy,
  spotsRemaining,
  isFull,
  isExpired,
  isPending,
  onSuccess,
}: ChallengeWaitlistProps) {
  const [state, formAction, pending] = useActionState(joinChallengeWaitlist, initialState);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.ok && state.referralCode && state.referralUrl) {
      onSuccess?.(state.referralCode, state.referralUrl);
      trackEvent('challenge_waitlist_join', {
        is_duplicate: !!state.isDuplicate,
        has_referrer: !!referredBy,
      });
    }
  }, [state.ok, state.referralCode, state.referralUrl, onSuccess, state.isDuplicate, referredBy]);

  useEffect(() => {
    if (!state.ok) return;
    const timer = setTimeout(() => {
      document.getElementById('tiers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.ok]);

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
      trackEvent('challenge_referral_link_copied', { source: 'step1' });
    } catch {
      setCopied(false);
    }
  }

  // ── Closed states ─────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="flex gap-4 rounded-2xl border border-white/8 bg-brand-surface p-5 sm:p-6">
        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Challenge not open yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Opens on{' '}
            <span className="text-foreground font-medium">{CHALLENGE_START_LABEL}</span>.
            Check back then.
          </p>
        </div>
      </div>
    );
  }

  if (isFull || state.error === 'challenge_full') {
    return (
      <div className="flex gap-4 rounded-2xl border border-white/8 bg-brand-surface p-5 sm:p-6">
        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">All {CHALLENGE_CAP} spots are filled</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow{' '}
            <a
              href="https://www.instagram.com/dareappofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary hover:underline"
            >
              @dareappofficial
            </a>{' '}
            to hear about the next challenge.
          </p>
        </div>
      </div>
    );
  }

  if (isExpired || state.error === 'challenge_closed') {
    return (
      <div className="flex gap-4 rounded-2xl border border-white/8 bg-brand-surface p-5 sm:p-6">
        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Challenge closed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ended {CHALLENGE_END_LABEL}. Follow{' '}
            <a
              href="https://www.instagram.com/dareappofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary hover:underline"
            >
              @dareappofficial
            </a>{' '}
            for the next one.
          </p>
        </div>
      </div>
    );
  }

  // ── Success: referral link ─────────────────────────────────────────────────

  if (state.ok && referralLink) {
    return (
      <div className="space-y-5 rounded-2xl border border-[#19C37D]/30 bg-[#19C37D]/5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#19C37D]/15">
            <CheckCircle2 className="h-5 w-5 text-[#19C37D]" />
          </div>
          <div>
            {state.isDuplicate ? (
              <>
                <p className="text-sm font-semibold text-foreground">Already registered.</p>
                <p className="text-xs text-muted-foreground">
                  This email is already on the list — here is your referral link.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">You&apos;re on the list.</p>
                <p className="text-xs text-muted-foreground">
                  Your referral link is ready. Use it for Tasks 03 and 04.
                </p>
              </>
            )}
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
            {/* Touch-friendly 44×44 copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-colors hover:bg-white/10 active:scale-95"
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
            Tap to copy. Every friend who signs up via your link counts as a referral.
          </p>
        </div>

        <ShareButton referralLink={referralLink} />

        <button
          type="button"
          onClick={() =>
            document.getElementById('tiers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          className="flex w-full items-center justify-center gap-2 h-12 rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Continue to Step 2 — Pick your tier
          <ArrowDown className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 rounded-2xl border border-white/8 bg-brand-surface p-5 sm:p-6">
      {/* Spots bar */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap justify-between gap-1 font-mono text-[10px] text-muted-foreground">
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

        {/* Stack vertically on mobile, side-by-side on sm+ */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="your@email.com"
            required
            disabled={pending || !!state.ok}
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-3 text-base sm:py-2.5 sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending || !!state.ok}
            className="flex h-12 sm:h-10 w-full sm:w-auto items-center justify-center rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
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
