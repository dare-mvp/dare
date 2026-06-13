'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BadgeCheck,
  Camera,
  Flame,
  Gauge,
  LockKeyhole,
  Play,
  ShieldCheck,
  Swords,
  Trophy,
  Vote,
  WalletCards,
  Zap,
} from 'lucide-react';

const GAME_STEPS = [
  { label: 'DARE type', value: 'Skill or Task', icon: Swords },
  { label: 'Funding', value: 'Stake or reward', icon: LockKeyhole },
  { label: 'Resolution', value: 'Answer, witness, proof', icon: Camera },
  { label: 'Review', value: 'Packet ready', icon: Vote },
];

const GAMEPLAY_SCREENS = [
  {
    eyebrow: 'Skill-Based',
    title: 'Trivia sprint',
    badge: 'ANSWER KEY COMMITTED',
    timer: '00:42',
    icon: Zap,
    accent: 'text-brand-primary',
    cta: 'Answer live',
    stats: [
      { name: 'Ayo', value: '7/10', score: 70, tone: 'bg-brand-primary' },
      { name: 'Mira', value: '6/10', score: 60, tone: 'bg-[#19C37D]' },
    ],
    metrics: [
      { label: 'Stakes', value: '2-way', icon: WalletCards, color: 'text-brand-primary' },
      { label: 'Trust', value: '98', icon: BadgeCheck, color: 'text-[#19C37D]' },
      { label: 'Path', value: 'Key', icon: Trophy, color: 'text-[#F59E0B]' },
    ],
    events: [
      { label: 'Answer key hash verified', icon: ShieldCheck, color: 'text-[#19C37D]' },
      { label: 'Prompt window open', icon: Camera, color: 'text-[#2DD4BF]' },
      { label: 'Court timer live', icon: Gauge, color: 'text-[#F59E0B]' },
    ],
  },
  {
    eyebrow: 'Task-Based',
    title: 'Freestyle proof',
    badge: 'EVIDENCE WINDOW',
    timer: '01:18',
    icon: Camera,
    accent: 'text-[#2DD4BF]',
    cta: 'Submit proof',
    stats: [
      { name: 'Performer proof', value: 'Submitted', score: 92, tone: 'bg-[#2DD4BF]' },
      { name: 'Geo check', value: 'Match', score: 84, tone: 'bg-brand-primary' },
    ],
    metrics: [
      { label: 'Reward', value: '1-way', icon: Camera, color: 'text-[#2DD4BF]' },
      { label: 'Time', value: '1m', icon: Gauge, color: 'text-[#F59E0B]' },
      { label: 'Ready', value: 'Yes', icon: ShieldCheck, color: 'text-[#19C37D]' },
    ],
    events: [
      { label: 'Proof attached', icon: Camera, color: 'text-[#2DD4BF]' },
      { label: 'Opponent response pending', icon: Swords, color: 'text-brand-primary' },
      { label: 'Hash created', icon: LockKeyhole, color: 'text-[#19C37D]' },
    ],
  },
  {
    eyebrow: 'Witnessed',
    title: 'Live review',
    badge: 'JURY LIVE',
    timer: '02:05',
    icon: Vote,
    accent: 'text-[#F59E0B]',
    cta: 'Review packet',
    stats: [
      { name: 'Witness signals', value: 'Ready', score: 86, tone: 'bg-[#19C37D]' },
      { name: 'Evidence packet', value: 'Open', score: 61, tone: 'bg-[#F59E0B]' },
    ],
    metrics: [
      { label: 'Jurors', value: '3', icon: Vote, color: 'text-[#F59E0B]' },
      { label: 'Blind', value: 'On', icon: ShieldCheck, color: 'text-[#19C37D]' },
      { label: 'Case', value: '#41', icon: Gauge, color: 'text-brand-primary' },
    ],
    events: [
      { label: 'Identity hidden', icon: ShieldCheck, color: 'text-[#19C37D]' },
      { label: 'Evidence packet opened', icon: Camera, color: 'text-[#2DD4BF]' },
      { label: 'Vote closes soon', icon: Gauge, color: 'text-[#F59E0B]' },
    ],
  },
  {
    eyebrow: 'Settlement',
    title: 'Payout cleared',
    badge: 'WINNER PAID',
    timer: 'DONE',
    icon: Trophy,
    accent: 'text-[#19C37D]',
    cta: 'View receipt',
    stats: [
      { name: 'Prize released', value: 'NGN 22,800', score: 100, tone: 'bg-[#19C37D]' },
      { name: 'Platform fee', value: 'NGN 1,200', score: 28, tone: 'bg-brand-primary' },
    ],
    metrics: [
      { label: 'Wallet', value: '+22.8K', icon: WalletCards, color: 'text-[#19C37D]' },
      { label: 'Receipt', value: 'Saved', icon: BadgeCheck, color: 'text-[#2DD4BF]' },
      { label: 'Rank', value: '+4', icon: Trophy, color: 'text-[#F59E0B]' },
    ],
    events: [
      { label: 'Escrow released', icon: LockKeyhole, color: 'text-[#19C37D]' },
      { label: 'Receipt generated', icon: BadgeCheck, color: 'text-[#2DD4BF]' },
      { label: 'Trust score updated', icon: Trophy, color: 'text-[#F59E0B]' },
    ],
  },
];

const TAB_LABELS = ['Answer Key', 'Evidence', 'Witnessed', 'Settlement'];

export function GameplayPreviewSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % GAMEPLAY_SCREENS.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(advance, 3200);
    return () => clearInterval(id);
  }, [paused, advance]);

  const selectTab = (i: number) => {
    setActiveIndex(i);
    setPaused(true);
  };

  const screen = GAMEPLAY_SCREENS[activeIndex];

  return (
    /* No overflow-hidden on the section — it breaks iOS Safari scroll containers.
       Decorative circles are clipped by their own relative parent instead. */
    <section id="gameplay-preview" className="scroll-mt-14 bg-brand-bg px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* ── Desktop: 2-column grid ── Mobile: stacked ── */}
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px] lg:gap-x-12">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-8">

            {/* Copy */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3 py-1.5 font-mono text-xs text-brand-primary">
                <Flame className="h-3.5 w-3.5" />
                Mobile gameplay
              </div>
              <h2 className="font-syne text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
                The app should feel like a match, not a form.
              </h2>
              <p className="max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Participants move through a user-authored flow: define the DARE, lock stakes or a
                reward in escrow, capture proof, and settle by Answer Key, Witnessed, or Evidence review.
              </p>
            </div>

            {/* Game steps — always visible, 2×2 on mobile, 2×2 on desktop */}
            <div className="grid grid-cols-2 gap-3">
              {GAME_STEPS.map((step) => (
                <div
                  key={step.label}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 sm:p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/12 text-brand-primary">
                    <step.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">{step.label}</p>
                    <p className="truncate text-sm font-semibold text-foreground">{step.value}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* ── RIGHT COLUMN — phone preview ── */}
          {/* overflow-hidden here clips the decorative circles without affecting scroll children */}
          <div className="relative overflow-hidden rounded-[2px]">
            {/* Decorative circles (clipped by the overflow-hidden above) */}
            <div aria-hidden className="pointer-events-none absolute -left-8 top-12 h-28 w-28 rounded-full border border-brand-primary/20" />
            <div aria-hidden className="pointer-events-none absolute -right-6 bottom-12 h-20 w-20 rounded-full border border-[#2DD4BF]/20" />

            {/* Tab selector */}
            <div className="mb-3 flex gap-1.5" aria-label="Gameplay stages">
              {TAB_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`Show ${label} stage`}
                  onClick={() => selectTab(i)}
                  className={`flex-1 min-h-[44px] rounded-xl px-1 py-2 font-mono text-[11px] transition-all ${
                    i === activeIndex
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Auto-play progress bar */}
            {!paused && (
              <div className="mb-3 h-0.5 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  key={activeIndex}
                  className="h-full w-full rounded-full bg-brand-primary gameplay-progress"
                />
              </div>
            )}

            {/* Phone mockup */}
            <div key={activeIndex} className="animate-in fade-in duration-300">
              <PhonePreview screen={screen} />
            </div>

            {paused && (
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="mt-3 w-full text-center font-mono text-[11px] text-muted-foreground transition-colors hover:text-brand-primary"
              >
                ▶ Resume auto-play
              </button>
            )}
          </div>

        </div>

        {/* ── ALL FOUR STAGES — horizontal scroll strip ── */}
        <div className="mt-10 lg:mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-brand-primary">All four stages</p>
              <h3 className="mt-1 font-syne text-xl font-extrabold text-foreground sm:text-2xl">
                Every moment players remember.
              </h3>
            </div>
            <p className="hidden max-w-xs text-sm text-muted-foreground sm:block">
              Tap any card below to jump to that stage.
            </p>
          </div>

          {/* Negative horizontal margin breaks out of the section px so cards bleed to edge on mobile */}
          <div className="-mx-4 sm:-mx-6 lg:mx-0">
            <div className="flex gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
              {GAMEPLAY_SCREENS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => selectTab(i)}
                  className={`shrink-0 snap-start text-left outline-none rounded-[30px] transition-all ${
                    i === activeIndex
                      ? 'opacity-100 scale-[1.02]'
                      : 'opacity-50 hover:opacity-75'
                  }`}
                  aria-label={`Switch to ${TAB_LABELS[i]} stage`}
                >
                  <PhonePreview screen={s} compact />
                </button>
              ))}
              {/* Trailing spacer so last card doesn't butt against the edge */}
              <div className="w-4 shrink-0 sm:w-6 lg:hidden" aria-hidden />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

type GameplayScreen = (typeof GAMEPLAY_SCREENS)[number];

function PhonePreview({ compact = false, screen }: { compact?: boolean; screen: GameplayScreen }) {
  return (
    <div
      className={`rounded-[28px] border border-white/10 bg-[#090910] p-2.5 shadow-xl shadow-black/40 ${
        compact ? 'w-[260px] sm:w-[280px]' : 'w-full'
      }`}
    >
      <div className="rounded-[22px] border border-white/8 bg-brand-bg p-4">
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={`font-mono text-[10px] uppercase ${screen.accent}`}>{screen.eyebrow}</p>
            <h3 className="mt-0.5 font-syne text-xl font-extrabold text-foreground sm:text-2xl">{screen.title}</h3>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-white">
            <screen.icon className="h-5 w-5" />
          </div>
        </div>

        {/* Score card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-[#19C37D]/12 px-2 py-1 font-mono text-[10px] text-[#19C37D]">
              {screen.badge}
            </span>
            <span className="font-mono text-sm text-foreground">{screen.timer}</span>
          </div>

          <div className="mt-4 space-y-3">
            {screen.stats.map((stat) => (
              <div key={stat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{stat.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{stat.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`${stat.tone} h-full rounded-full`}
                    style={{ width: `${stat.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric chips */}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {screen.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-white/8 bg-white/[0.035] p-2.5 text-center"
            >
              <metric.icon className={`mx-auto h-4 w-4 ${metric.color}`} />
              <p className="mt-1.5 font-mono text-[9px] text-muted-foreground">{metric.label}</p>
              <p className="text-xs font-bold text-foreground">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Live event feed */}
        <div className="mt-3 space-y-1.5">
          {screen.events.map((event) => (
            <div
              key={event.label}
              className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2"
            >
              <event.icon className={`h-3.5 w-3.5 shrink-0 ${event.color}`} />
              <span className="text-xs text-foreground">{event.label}</span>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          type="button"
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary font-semibold text-sm text-white transition-opacity hover:opacity-90"
          aria-label={screen.cta}
        >
          <Play className="h-3.5 w-3.5 fill-white" />
          {screen.cta}
        </button>
      </div>
    </div>
  );
}
