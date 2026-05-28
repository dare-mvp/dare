'use client';

import { useState, useTransition } from 'react';
import { recordTierSelection } from '@/app/(marketing)/actions';
import {
  Heart,
  Share2,
  UserPlus,
  Video,
  ListChecks,
  CheckCircle2,
  ArrowDown,
} from 'lucide-react';

type Tier = 'standard' | 'champion';

const SHARED_TASKS = [
  {
    number: '02',
    Icon: Heart,
    title: 'Follow',
    description: 'Follow @dareappofficial on Instagram. Screenshot your follow as proof.',
  },
  {
    number: '03',
    Icon: Share2,
    title: 'Spread the Word',
    description:
      'Share your referral link on your WhatsApp Status, Instagram Story, or any social platform. Screenshot the post as proof.',
  },
];

const STANDARD_ONLY_TASK = {
  number: '04',
  Icon: UserPlus,
  title: 'Refer 2 Friends',
  description:
    'Get 2 friends to sign up on the DARE waitlist using your referral link. We track this automatically — no screenshot needed.',
};

const CHAMPION_REFER_TASK = {
  number: '04',
  Icon: UserPlus,
  title: 'Refer 3 Friends',
  description: 'Get 3 friends (not 2) to sign up via your referral link.',
  isChampion: true,
};

const CHAMPION_VIDEO_TASK = {
  number: '05',
  Icon: Video,
  title: 'Film Your Dare',
  description:
    'Record a 15–30 second video daring a friend to anything and tell them DARE App is where you settle it properly. Post on Instagram Reels or TikTok, tag @dareappofficial, and use #IDareYouNG. Submit the link in your DM.',
};

function TaskRow({
  number,
  Icon,
  title,
  description,
  accent = false,
  badge,
}: {
  number: string;
  Icon: React.ElementType;
  title: string;
  description: string;
  accent?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border ${
          accent ? 'border-brand-primary/20 bg-brand-primary/5' : 'border-white/10 bg-white/5'
        }`}
      >
        <Icon
          className={`h-4 w-4 ${accent ? 'text-brand-primary' : 'text-muted-foreground'}`}
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground flex-wrap">
          <span className={`font-mono text-[10px] ${accent ? 'text-brand-primary' : 'text-muted-foreground'}`}>
            {number}
          </span>
          {title}
          {badge && (
            <span className="rounded-full border border-brand-primary/30 bg-brand-primary/10 px-2 py-0.5 font-mono text-[10px] text-brand-primary">
              {badge}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

interface ChallengeTierPickerProps {
  referralCode?: string;
}

export function ChallengeTierPicker({ referralCode }: ChallengeTierPickerProps) {
  const [selected, setSelected] = useState<Tier | null>(null);
  const [, startTransition] = useTransition();

  function handleContinue() {
    if (!selected) return;
    // Fire-and-forget: record in DB without blocking the scroll
    startTransition(() => {
      recordTierSelection(selected, referralCode).catch(() => {
        // Non-critical — UI proceeds regardless
      });
    });
    document.getElementById('claim')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">

        {/* ── Standard ₦2,000 ── */}
        <button
          type="button"
          onClick={() => setSelected('standard')}
          aria-pressed={selected === 'standard' ? true : false}
          className={`relative w-full rounded-2xl border bg-brand-surface p-5 sm:p-8 text-left space-y-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
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
              <span className={`font-mono text-xs uppercase tracking-widest ${selected === 'standard' ? 'text-[#19C37D]' : 'text-muted-foreground'}`}>
                Standard Dare
              </span>
              <h3 className="mt-1 font-syne text-2xl sm:text-3xl font-extrabold text-foreground">₦2,000</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Task 01 + Tasks 02, 03, 04</p>
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

            {SHARED_TASKS.map((t) => (
              <TaskRow key={t.number} {...t} />
            ))}
            <TaskRow {...STANDARD_ONLY_TASK} />
          </div>
        </button>

        {/* ── Champion ₦3,000 ── */}
        <button
          type="button"
          onClick={() => setSelected('champion')}
          aria-pressed={selected === 'champion' ? true : false}
          className={`relative w-full rounded-2xl border bg-brand-surface p-5 sm:p-8 text-left space-y-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
            selected === 'champion'
              ? 'border-brand-primary shadow-lg shadow-brand-primary/10'
              : selected === 'standard'
              ? 'border-brand-primary/20 opacity-40'
              : 'border-brand-primary/50 shadow-md shadow-brand-primary/5 active:scale-[0.99] sm:hover:-translate-y-0.5'
          }`}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl bg-brand-primary opacity-[0.04]" />

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
              <h3 className="mt-1 font-syne text-2xl sm:text-3xl font-extrabold text-foreground">₦3,000</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Task 01 + Tasks 02, 03, 04, 05</p>
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

            {SHARED_TASKS.map((t) => (
              <TaskRow key={t.number} {...t} />
            ))}
            <TaskRow {...CHAMPION_REFER_TASK} accent badge="Champion" />
            <TaskRow {...CHAMPION_VIDEO_TASK} accent />
          </div>
        </button>

      </div>

      {/* ── Continue CTA ── */}
      <div
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
              ? "Continue — Standard ₦2,000"
              : "Continue — Champion ₦3,000"}
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
