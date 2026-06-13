'use client';

import { useState, useRef, useEffect } from 'react';
import { recordTierSelection } from '@/app/(marketing)/actions';
import { trackEvent } from '@/lib/analytics';
import {
  Heart,
  Share2,
  UserPlus,
  Video,
  ListChecks,
  CheckCircle2,
  ArrowDown,
  Copy,
  Check,
  MessageCircle,
  Swords,
  Users,
  Shield,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { LEGEND_START, LEGEND_START_LABEL } from '@/lib/challenge-config';

type Tier = 'standard' | 'champion' | 'legend';

const INSTAGRAM_PROFILE = 'https://www.instagram.com/dareappofficial';
const INSTAGRAM_DM = 'https://ig.me/m/dareappofficial';
const CLAIM_MESSAGE = 'Challenge accepted and completed';
const SHARE_TEXT =
  'I dare you to try this 👊 Join the DARE I Dare You Challenge and earn up to ₦9,000. Sign up with my link:';

// ── Sub-components ────────────────────────────────────────────────────────────

function ShareTaskButton({ referralUrl }: { referralUrl: string }) {
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
          url: referralUrl,
        });
        trackEvent('challenge_task_share_click', { source: 'task_list', method: 'native' });
        return;
      } catch {
        // fall through to WhatsApp
      }
    }
    trackEvent('challenge_task_share_click', { source: 'task_list', method: 'whatsapp' });
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${referralUrl}`)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  return (
    <div className="mt-3 space-y-1.5">
      <button
        type="button"
        onClick={handleShare}
        className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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

function CopyMessageButton({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent('challenge_claim_message_copied');
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-colors hover:bg-white/10 active:scale-95"
      aria-label="Copy claim message"
    >
      {copied ? (
        <Check className="h-4 w-4 text-[#19C37D]" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

function CopyLinkButton({ url, referralCode }: { url: string; referralCode?: string }) {
  const [copied, setCopied] = useState(false);
  const prefix = referralCode ? url.slice(0, url.lastIndexOf(referralCode)) : null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent('challenge_referral_link_copied', { source: 'task_list' });
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap rounded-lg border border-white/10 bg-brand-bg px-3 py-2.5 font-mono text-xs">
        {prefix && referralCode ? (
          <>
            <span className="text-muted-foreground">{prefix}</span>
            <span className="font-bold text-brand-primary">{referralCode}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{url}</span>
        )}
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
  );
}

function TaskCard({
  number,
  Icon,
  title,
  description,
  done = false,
  accent = false,
  children,
}: {
  number: string;
  Icon: React.ElementType;
  title: string;
  description?: string;
  done?: boolean;
  accent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 ${
        done
          ? 'border-[#19C37D]/20 bg-[#19C37D]/5 opacity-60'
          : accent
          ? 'border-brand-primary/20 bg-brand-primary/5'
          : 'border-white/8 bg-brand-surface'
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border ${
            done
              ? 'border-[#19C37D]/30 bg-[#19C37D]/10'
              : accent
              ? 'border-brand-primary/20 bg-brand-primary/10'
              : 'border-white/10 bg-white/5'
          }`}
        >
          <Icon
            className={`h-4 w-4 ${
              done ? 'text-[#19C37D]' : accent ? 'text-brand-primary' : 'text-muted-foreground'
            }`}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            <span
              className={`font-mono text-[10px] ${
                done ? 'text-[#19C37D]' : accent ? 'text-brand-primary' : 'text-muted-foreground'
              }`}
            >
              {number}
            </span>
            {title}
            {done && (
              <span className="rounded-full border border-[#19C37D]/30 bg-[#19C37D]/10 px-2 py-0.5 font-mono text-[10px] text-[#19C37D]">
                Done ✓
              </span>
            )}
          </p>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function TaskList({
  tier,
  referralCode,
  referralUrl,
}: {
  tier: Tier;
  referralCode?: string;
  referralUrl?: string;
}) {
  // ── Legend tier task list ─────────────────────────────────────────────────
  if (tier === 'legend') {
    return (
      <div className="space-y-3">
        {/* Gate */}
        <div className="rounded-xl border border-[#FBBF24]/20 bg-[#FBBF24]/5 opacity-70 p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/10">
              <Shield className="h-4 w-4 text-[#FBBF24]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                <span className="font-mono text-[10px] text-[#FBBF24]">Gate</span>
                Prior Tier Completed
                <span className="rounded-full border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-2 py-0.5 font-mono text-[10px] text-[#FBBF24]">
                  Done ✓
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                You earned Standard or Champion already. Submit your reward receipt in the claim DM.
              </p>
            </div>
          </div>
        </div>

        <TaskCard number="01" Icon={ListChecks} title="Join the DARE waitlist" done>
          <p className="mt-1 text-xs text-[#19C37D]">Completed in Step 1 ↑</p>
        </TaskCard>

        <TaskCard
          number="A"
          Icon={UserPlus}
          title="Refer 5 Friends"
          description="Get 5 friends to sign up via your referral link. Auto-tracked — no screenshot needed."
        >
          {referralUrl && (
            <CopyLinkButton url={referralUrl} referralCode={referralCode} />
          )}
        </TaskCard>

        <TaskCard
          number="B"
          Icon={Swords}
          title="Film a DARE Battle"
          description='Dare a named friend on camera to do something specific. They film themselves accepting or attempting it and post their response. Submit both video links in your claim DM. Tag @dareappofficial and use #IDareYouNG on both posts.'
          accent
        >
          <a
            href={INSTAGRAM_PROFILE}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 h-11 rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-5 text-sm font-semibold text-brand-primary transition-all hover:bg-brand-primary/20 active:scale-[0.98]"
          >
            Open Instagram Reels →
          </a>
        </TaskCard>

        <TaskCard
          number="C"
          Icon={Users}
          title="Drop in a WhatsApp Community"
          description="Share your referral link in a WhatsApp group of 20+ people. Screenshot the delivery as proof and include it in your claim DM."
        >
          {referralUrl && (
            <CopyLinkButton url={referralUrl} referralCode={referralCode} />
          )}
        </TaskCard>

        {/* Claim */}
        <div className="rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-4 sm:p-5 space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#FBBF24]">
              Done all tasks? Claim your ₦9,000
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              DM us with: proof of prior reward receipt, both battle video links (Task B), and screenshot of WhatsApp group delivery (Task C). Referrals are auto-tracked.
            </p>
          </div>

          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Send this message
            </p>
            {(() => {
              const legendMsg = `Legend Dare complete — ref: ${referralCode ?? 'XXXXXXXX'}`;
              return (
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-[#FBBF24]/20 bg-brand-bg px-3 py-2.5 font-mono text-sm text-[#FBBF24]">
                    {legendMsg}
                  </div>
                  <CopyMessageButton message={legendMsg} />
                </div>
              );
            })()}
          </div>

          <a
            href={INSTAGRAM_DM}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 h-12 rounded-xl bg-[#FBBF24] px-6 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-[0.98]"
            onClick={() => trackEvent('challenge_task_dm_click', { tier: 'legend' })}
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
            DM @dareappofficial to claim
          </a>
        </div>
      </div>
    );
  }

  // ── Standard / Champion task list ─────────────────────────────────────────
  return (
    <div className="space-y-3">
      <TaskCard number="01" Icon={ListChecks} title="Join the DARE waitlist" done>
        <p className="mt-1 text-xs text-[#19C37D]">Completed in Step 1 ↑</p>
      </TaskCard>

      <TaskCard
        number="02"
        Icon={Heart}
        title="Follow @dareappofficial"
        description="Screenshot your follow as proof — you'll attach it when you claim."
      >
        <a
          href={INSTAGRAM_PROFILE}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          onClick={() => trackEvent('challenge_task_follow_click')}
        >
          Follow on Instagram →
        </a>
      </TaskCard>

      <TaskCard
        number="03"
        Icon={Share2}
        title="Spread the Word"
        description="Share your referral link on WhatsApp Status, Instagram Story, or any social platform. Screenshot the post as proof."
      >
        {referralUrl ? (
          <ShareTaskButton referralUrl={referralUrl} />
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Return to Step 1 above to get your referral link.
          </p>
        )}
      </TaskCard>

      <TaskCard
        number="04"
        Icon={UserPlus}
        title={tier === 'champion' ? 'Refer 3 friends' : 'Refer 2 friends'}
        description={`Get ${tier === 'champion' ? '3' : '2'} friends to sign up on the DARE waitlist using your referral link. Auto-tracked — no screenshot needed.`}
      >
        {referralUrl && (
          <CopyLinkButton url={referralUrl} referralCode={referralCode} />
        )}
      </TaskCard>

      {tier === 'champion' && (
        <TaskCard
          number="05"
          Icon={Video}
          title="Film Your Dare"
          description='Record 15–30s video daring a friend to anything and say "DARE App is where you settle it properly." Post on Instagram Reels or TikTok, tag @dareappofficial, use #IDareYouNG. Send the post link in your claim DM.'
          accent
        >
          <a
            href={INSTAGRAM_PROFILE}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 h-11 rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-5 text-sm font-semibold text-brand-primary transition-all hover:bg-brand-primary/20 active:scale-[0.98]"
          >
            Open Instagram Reels →
          </a>
        </TaskCard>
      )}

      {/* Claim */}
      <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4 sm:p-5 space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary">
            Done all tasks? Claim your reward
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tier === 'champion'
              ? 'DM us with screenshots (Tasks 02 & 03) and your video link (Task 05).'
              : 'DM us with screenshots (Tasks 02 & 03) to claim.'}
          </p>
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Send this message
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-brand-primary/20 bg-brand-bg px-3 py-2.5 font-mono text-sm text-brand-primary">
              {CLAIM_MESSAGE}
            </div>
            <CopyMessageButton message={CLAIM_MESSAGE} />
          </div>
        </div>

        <a
          href={INSTAGRAM_DM}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 h-12 rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          onClick={() => trackEvent('challenge_task_dm_click', { tier })}
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
          DM @dareappofficial to claim
        </a>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ChallengeTierPickerProps {
  referralCode?: string;
  referralUrl?: string;
}

export function ChallengeTierPicker({ referralCode, referralUrl }: ChallengeTierPickerProps) {
  const [selected, setSelected] = useState<Tier | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [selectionError, setSelectionError] = useState<'not_eligible' | 'unknown' | null>(null);
  const [hasSwiped, setHasSwiped] = useState(false);
  const legendComingSoon = new Date() < LEGEND_START;
  const taskListRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => setHasSwiped(true);
    el.addEventListener('scroll', onScroll, { once: true, passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!selected || !continueRef.current) return;
    const timer = setTimeout(() => {
      continueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    return () => clearTimeout(timer);
  }, [selected]);

  function handleTierSelect(tier: Tier) {
    if (tier === 'legend' && legendComingSoon) return;
    setSelected(tier);
    setSelectionError(null);
    trackEvent('challenge_tier_selected', { tier });
  }

  async function handleContinue() {
    if (!selected || isPending) return;
    setIsPending(true);
    setSelectionError(null);
    const result = await recordTierSelection(selected, referralCode);
    setIsPending(false);
    if ('error' in result) {
      setSelectionError(result.error);
      if (result.error === 'not_eligible') setSelected(null);
      return;
    }
    trackEvent('challenge_tier_confirmed', { tier: selected });
    setConfirmed(true);
  }

  useEffect(() => {
    if (!confirmed || !taskListRef.current) return;
    const timer = setTimeout(() => {
      taskListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [confirmed]);

  // ── Phase 2: task list ────────────────────────────────────────────────────
  if (confirmed && selected) {
    const isChampion = selected === 'champion';
    const isLegend = selected === 'legend';
    const accentClass = isLegend
      ? 'text-[#FBBF24]'
      : isChampion
      ? 'text-brand-primary'
      : 'text-[#19C37D]';
    const ringClass = isLegend
      ? 'bg-[#FBBF24]/20'
      : isChampion
      ? 'bg-brand-primary/20'
      : 'bg-[#19C37D]/15';
    const checkClass = isLegend
      ? 'text-[#FBBF24]'
      : isChampion
      ? 'text-brand-primary'
      : 'text-[#19C37D]';
    const tierLabel =
      selected === 'standard' ? 'Standard Dare' : selected === 'champion' ? 'Champion Dare' : 'Legend Dare';
    const tierAmount =
      selected === 'standard' ? '₦2,000' : selected === 'champion' ? '₦3,000' : '₦9,000';

    return (
      <div className="space-y-6">
        {/* Compact selected-tier header */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-brand-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full ${ringClass}`}>
              <CheckCircle2 className={`h-4 w-4 ${checkClass}`} />
            </div>
            <div>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${accentClass}`}>
                {tierLabel}
              </span>
              <p className="font-syne text-xl font-extrabold text-foreground leading-tight">
                {tierAmount}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmed(false);
              setSelected(null);
              setIsPending(false);
            }}
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-3"
          >
            Change tier
          </button>
        </div>

        {/* Task list */}
        <div ref={taskListRef} className="scroll-mt-14">
          <TaskList tier={selected} referralCode={referralCode} referralUrl={referralUrl} />
        </div>
      </div>
    );
  }

  // ── Phase 1: tier selection ───────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Scroll hint — fades out after first swipe ── */}
      <div
        aria-hidden
        className={`flex items-center justify-center gap-2 transition-opacity duration-500 ${
          hasSwiped ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <ChevronLeft className="h-4 w-4 animate-pulse text-muted-foreground" />
        <span className="font-mono text-[11px] text-muted-foreground tracking-wide">
          3 tiers · swipe to explore
        </span>
        <ChevronRight className="h-4 w-4 animate-pulse text-muted-foreground" />
      </div>

      <div ref={scrollContainerRef} className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">

        {/* ── Standard ₦2,000 ── */}
        <button
          type="button"
          onClick={() => handleTierSelect('standard')}
          aria-label={`Standard Dare — ₦2,000, 4 tasks${selected === 'standard' ? ' (selected)' : ''}`}
          className={`relative shrink-0 w-[300px] sm:w-[360px] snap-start rounded-2xl border bg-brand-surface p-5 sm:p-8 text-left space-y-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
            selected === 'standard'
              ? 'border-[#19C37D]/60 shadow-lg shadow-[#19C37D]/5'
              : selected !== null
              ? 'border-white/8 opacity-40'
              : 'border-white/8 active:scale-[0.99] sm:hover:border-white/20 sm:hover:-translate-y-0.5'
          }`}
        >
          {selected === 'standard' && (
            <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#19C37D]/15">
              <CheckCircle2 className="h-4 w-4 text-[#19C37D]" />
            </div>
          )}

          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <span
                className={`font-mono text-xs uppercase tracking-widest ${
                  selected === 'standard' ? 'text-[#19C37D]' : 'text-muted-foreground'
                }`}
              >
                Standard Dare
              </span>
              <h3 className="mt-1 font-syne text-2xl sm:text-3xl font-extrabold text-foreground">
                ₦2,000
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Task 01 + Tasks 02, 03, 04
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-muted-foreground shrink-0">
              4 tasks
            </span>
          </div>

          <div className="h-px bg-white/8" />

          <div className="space-y-4">
            <div className="flex gap-3 opacity-40">
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

            {[
              { number: '02', Icon: Heart, title: 'Follow', description: 'Follow @dareappofficial on Instagram. Screenshot as proof.' },
              { number: '03', Icon: Share2, title: 'Spread the Word', description: 'Share your referral link on WhatsApp Status or Instagram Story.' },
              { number: '04', Icon: UserPlus, title: 'Refer 2 Friends', description: 'Get 2 friends to sign up via your referral link. Auto-tracked.' },
            ].map(({ number, Icon, title, description }) => (
              <div key={number} className="flex gap-3">
                <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="font-mono text-[10px] text-muted-foreground">{number}</span>
                    {title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </button>

        {/* ── Champion ₦3,000 ── */}
        <button
          type="button"
          onClick={() => handleTierSelect('champion')}
          aria-label={`Champion Dare — ₦3,000, 5 tasks${selected === 'champion' ? ' (selected)' : ''}`}
          className={`relative shrink-0 w-[300px] sm:w-[360px] snap-start rounded-2xl border bg-brand-surface p-5 sm:p-8 text-left space-y-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
            selected === 'champion'
              ? 'border-brand-primary shadow-lg shadow-brand-primary/10'
              : selected !== null
              ? 'border-brand-primary/20 opacity-40'
              : 'border-brand-primary/50 shadow-md shadow-brand-primary/5 active:scale-[0.99] sm:hover:-translate-y-0.5'
          }`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl bg-brand-primary opacity-[0.04]"
          />

          {selected === 'champion' && (
            <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary/20">
              <CheckCircle2 className="h-4 w-4 text-brand-primary" />
            </div>
          )}

          <div className="relative flex items-start justify-between gap-3 pr-6">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-brand-primary">
                Champion Dare
              </span>
              <h3 className="mt-1 font-syne text-2xl sm:text-3xl font-extrabold text-foreground">
                ₦3,000
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Task 01 + Tasks 02, 03, 04, 05
              </p>
            </div>
            <span className="rounded-full border border-brand-primary/40 bg-brand-primary/10 px-2.5 py-1 font-mono text-xs text-brand-primary shrink-0">
              Best reward
            </span>
          </div>

          <div className="relative h-px bg-brand-primary/20" />

          <div className="relative space-y-4">
            <div className="flex gap-3 opacity-40">
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

            {[
              { number: '02', Icon: Heart, title: 'Follow', description: 'Follow @dareappofficial on Instagram. Screenshot as proof.' },
              { number: '03', Icon: Share2, title: 'Spread the Word', description: 'Share your referral link on WhatsApp Status or Instagram Story.' },
            ].map(({ number, Icon, title, description }) => (
              <div key={number} className="flex gap-3">
                <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="font-mono text-[10px] text-muted-foreground">{number}</span>
                    {title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-brand-primary/20 bg-brand-primary/5">
                <UserPlus className="h-4 w-4 text-brand-primary" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
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

            <div className="flex gap-3">
              <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-brand-primary/20 bg-brand-primary/5">
                <Video className="h-4 w-4 text-brand-primary" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="font-mono text-[10px] text-brand-primary">05</span>
                  Film Your Dare
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                  Record a 15–30s video daring a friend to anything and tell them DARE App is where you settle it properly. Post on Reels or TikTok, tag @dareappofficial, use #IDareYouNG. Send the link in your DM.
                </p>
              </div>
            </div>
          </div>
        </button>

        {/* ── Legend ₦9,000 — coming soon until LEGEND_START, then fully live ── */}
        {legendComingSoon ? (
          // Non-interactive preview card
          <div
            aria-label={`Legend Dare — ₦9,000, coming ${LEGEND_START_LABEL}`}
            className={`relative shrink-0 w-[300px] sm:w-[360px] snap-start rounded-2xl border bg-brand-surface p-5 sm:p-8 text-left space-y-5 select-none ${
              selected !== null ? 'border-[#FBBF24]/10 opacity-30' : 'border-[#FBBF24]/15'
            }`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl bg-[#FBBF24] opacity-[0.02]"
            />

            {/* Coming soon badge — top right */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-2.5 py-1">
              <Clock className="h-3 w-3 text-[#FBBF24]" aria-hidden />
              <span className="font-mono text-[10px] text-[#FBBF24]">Coming soon</span>
            </div>

            <div className="relative flex items-start justify-between gap-3 pr-32">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#FBBF24]/60">
                  Legend Dare
                </span>
                <h3 className="mt-1 font-syne text-2xl sm:text-3xl font-extrabold text-foreground">
                  ₦9,000
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Unlocks {LEGEND_START_LABEL}
                </p>
              </div>
            </div>

            <div className="relative h-px bg-[#FBBF24]/10" />

            <div className="relative space-y-4 opacity-50">
              {[
                { number: 'Gate', Icon: Shield, title: 'Prior Tier Completed' },
                { number: 'A', Icon: UserPlus, title: 'Refer 5 Friends' },
                { number: 'B', Icon: Swords, title: 'Film a DARE Battle' },
                { number: 'C', Icon: Users, title: 'Drop in a WhatsApp Community' },
              ].map(({ number, Icon, title }) => (
                <div key={number} className="flex gap-3">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-[#FBBF24]/10 bg-[#FBBF24]/5">
                    <Icon className="h-4 w-4 text-[#FBBF24]/50" aria-hidden />
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#FBBF24]/50">{number}</span>
                    <p className="text-sm font-semibold text-foreground/50">{title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Live — fully interactive
          <button
            type="button"
            onClick={() => handleTierSelect('legend')}
            aria-label={`Legend Dare — ₦9,000, exclusive${selected === 'legend' ? ' (selected)' : ''}`}
            className={`relative shrink-0 w-[300px] sm:w-[360px] snap-start rounded-2xl border bg-brand-surface p-5 sm:p-8 text-left space-y-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24] ${
              selected === 'legend'
                ? 'border-[#FBBF24]/60 shadow-lg shadow-[#FBBF24]/10'
                : selected !== null
                ? 'border-white/8 opacity-40'
                : 'border-[#FBBF24]/30 shadow-md shadow-[#FBBF24]/5 active:scale-[0.99] sm:hover:-translate-y-0.5'
            }`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl bg-[#FBBF24] opacity-[0.03]"
            />

            {selected === 'legend' && (
              <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#FBBF24]/20">
                <CheckCircle2 className="h-4 w-4 text-[#FBBF24]" />
              </div>
            )}

            <div className="relative flex items-start justify-between gap-3 pr-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#FBBF24]">
                  Legend Dare
                </span>
                <h3 className="mt-1 font-syne text-2xl sm:text-3xl font-extrabold text-foreground">
                  ₦9,000
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Standard or Champion required
                </p>
              </div>
              <span className="rounded-full border border-[#FBBF24]/40 bg-[#FBBF24]/10 px-2.5 py-1 font-mono text-xs text-[#FBBF24] shrink-0">
                Exclusive
              </span>
            </div>

            <div className="relative h-px bg-[#FBBF24]/20" />

            <div className="relative space-y-4">
              <div className="flex gap-3">
                <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-[#FBBF24]/20 bg-[#FBBF24]/5">
                  <Shield className="h-4 w-4 text-[#FBBF24]" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="font-mono text-[10px] text-[#FBBF24]">Gate</span>
                    Prior Tier Completed
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                    You've already earned Standard or Champion. Submit proof in your claim DM.
                  </p>
                </div>
              </div>

              {[
                { number: 'A', Icon: UserPlus, title: 'Refer 5 Friends', description: 'Get 5 friends to sign up via your referral link. Auto-tracked.' },
                { number: 'B', Icon: Swords, title: 'Film a DARE Battle', description: 'Dare a named friend on camera. They film their response. Submit both video links.' },
                { number: 'C', Icon: Users, title: 'Drop in a WhatsApp Community', description: 'Share your link in a WhatsApp group of 20+ people. Screenshot the delivery.' },
              ].map(({ number, Icon, title, description }) => (
                <div key={number} className="flex gap-3">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-[#FBBF24]/20 bg-[#FBBF24]/5">
                    <Icon className="h-4 w-4 text-[#FBBF24]" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="font-mono text-[10px] text-[#FBBF24]">{number}</span>
                      {title}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </button>
        )}

      </div>

      {/* ── Continue CTA ── */}
      <div
        ref={continueRef}
        className={`transition-all duration-300 ${
          selected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={isPending}
            className={`flex w-full sm:w-auto items-center justify-center gap-2 h-14 rounded-xl px-6 sm:px-10 text-base sm:text-lg font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
              selected === 'legend'
                ? 'bg-[#FBBF24] text-black'
                : 'bg-brand-primary text-white'
            }`}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <>
                {selected === 'standard'
                  ? 'Continue — Standard ₦2,000'
                  : selected === 'champion'
                  ? 'Continue — Champion ₦3,000'
                  : 'Continue — Legend ₦9,000'}
                <ArrowDown className="h-5 w-5 shrink-0" aria-hidden />
              </>
            )}
          </button>

          {selectionError && (
            <p className="text-center text-sm text-red-400 max-w-sm">
              {selectionError === 'not_eligible'
                ? 'Legend Dare is only available to previous Standard or Champion completers. Pick one of those tiers to start.'
                : 'Couldn\'t save your selection — tap Continue to try again.'}
            </p>
          )}

          <button
            type="button"
            onClick={() => { setSelected(null); setSelectionError(null); }}
            className="text-center font-mono text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Change tier
          </button>
        </div>
      </div>
    </div>
  );
}
