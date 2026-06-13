'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
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
} from 'lucide-react';

type Tier = 'standard' | 'champion';

const INSTAGRAM_PROFILE = 'https://www.instagram.com/dareappofficial';
const INSTAGRAM_DM = 'https://ig.me/m/dareappofficial';
const CLAIM_MESSAGE = 'Challenge accepted and completed';
const SHARE_TEXT =
  'I dare you to try this 👊 Join the DARE I Dare You Challenge and earn up to ₦3,000. Sign up with my link:';

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

function CopyMessageButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CLAIM_MESSAGE);
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
            <CopyMessageButton />
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
  const [, startTransition] = useTransition();
  const taskListRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected || !continueRef.current) return;
    const timer = setTimeout(() => {
      continueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    return () => clearTimeout(timer);
  }, [selected]);

  function handleContinue() {
    if (!selected) return;
    trackEvent('challenge_tier_confirmed', { tier: selected });
    startTransition(() => {
      recordTierSelection(selected, referralCode).catch(() => {});
    });
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
    return (
      <div className="space-y-6">
        {/* Compact selected-tier header */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-brand-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                selected === 'champion' ? 'bg-brand-primary/20' : 'bg-[#19C37D]/15'
              }`}
            >
              <CheckCircle2
                className={`h-4 w-4 ${
                  selected === 'champion' ? 'text-brand-primary' : 'text-[#19C37D]'
                }`}
              />
            </div>
            <div>
              <span
                className={`font-mono text-[10px] uppercase tracking-widest ${
                  selected === 'champion' ? 'text-brand-primary' : 'text-[#19C37D]'
                }`}
              >
                {selected === 'standard' ? 'Standard Dare' : 'Champion Dare'}
              </span>
              <p className="font-syne text-xl font-extrabold text-foreground leading-tight">
                {selected === 'standard' ? '₦2,000' : '₦3,000'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmed(false);
              setSelected(null);
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
    <div className="space-y-6">
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">

        {/* ── Standard ₦2,000 ── */}
        <button
          type="button"
          onClick={() => { setSelected('standard'); trackEvent('challenge_tier_selected', { tier: 'standard' }); }}
          aria-label={`Standard Dare — ₦2,000, 4 tasks${selected === 'standard' ? ' (selected)' : ''}`}
          className={`relative shrink-0 w-[300px] sm:w-[360px] snap-start rounded-2xl border bg-brand-surface p-5 sm:p-8 text-left space-y-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
            selected === 'standard'
              ? 'border-[#19C37D]/60 shadow-lg shadow-[#19C37D]/5'
              : selected === 'champion'
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
              {
                number: '02',
                Icon: Heart,
                title: 'Follow',
                description: 'Follow @dareappofficial on Instagram. Screenshot as proof.',
              },
              {
                number: '03',
                Icon: Share2,
                title: 'Spread the Word',
                description: 'Share your referral link on WhatsApp Status or Instagram Story.',
              },
              {
                number: '04',
                Icon: UserPlus,
                title: 'Refer 2 Friends',
                description: 'Get 2 friends to sign up via your referral link. Auto-tracked.',
              },
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
                  <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </button>

        {/* ── Champion ₦3,000 ── */}
        <button
          type="button"
          onClick={() => { setSelected('champion'); trackEvent('challenge_tier_selected', { tier: 'champion' }); }}
          aria-label={`Champion Dare — ₦3,000, 5 tasks${selected === 'champion' ? ' (selected)' : ''}`}
          className={`relative shrink-0 w-[300px] sm:w-[360px] snap-start rounded-2xl border bg-brand-surface p-5 sm:p-8 text-left space-y-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
            selected === 'champion'
              ? 'border-brand-primary shadow-lg shadow-brand-primary/10'
              : selected === 'standard'
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
              {
                number: '02',
                Icon: Heart,
                title: 'Follow',
                description: 'Follow @dareappofficial on Instagram. Screenshot as proof.',
              },
              {
                number: '03',
                Icon: Share2,
                title: 'Spread the Word',
                description: 'Share your referral link on WhatsApp Status or Instagram Story.',
              },
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
                  <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
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
            className="flex w-full sm:w-auto items-center justify-center gap-2 h-14 rounded-xl bg-brand-primary px-6 sm:px-10 text-base sm:text-lg font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          >
            {selected === 'standard'
              ? 'Continue — Standard ₦2,000'
              : 'Continue — Champion ₦3,000'}
            <ArrowDown className="h-5 w-5 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-center font-mono text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Change tier
          </button>
        </div>
      </div>
    </div>
  );
}
