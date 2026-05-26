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
  { label: 'Challenge', value: 'Street hoops', icon: Swords },
  { label: 'Escrow', value: 'NGN 12,000 locked', icon: LockKeyhole },
  { label: 'Proof', value: 'Clip submitted', icon: Camera },
  { label: 'Court', value: '2 jurors ready', icon: Vote },
];

const LIVE_EVENTS = [
  { label: 'Escrow verified', icon: ShieldCheck, color: 'text-[#19C37D]' },
  { label: 'Proof window open', icon: Camera, color: 'text-[#2DD4BF]' },
  { label: 'Court timer live', icon: Gauge, color: 'text-[#F59E0B]' },
];

const GAMEPLAY_SCREENS = [
  {
    eyebrow: 'Live DARE',
    title: '3-point sprint',
    badge: 'ESCROW LOCKED',
    timer: '00:42',
    icon: Zap,
    accent: 'text-brand-primary',
    cta: 'Enter court mode',
    stats: [
      { name: 'Ayo', value: '78 pts', score: 78, tone: 'bg-brand-primary' },
      { name: 'Mira', value: '72 pts', score: 72, tone: 'bg-[#19C37D]' },
    ],
    metrics: [
      { label: 'Stake', value: '12K', icon: WalletCards, color: 'text-brand-primary' },
      { label: 'Trust', value: '98', icon: BadgeCheck, color: 'text-[#19C37D]' },
      { label: 'Prize', value: 'Win', icon: Trophy, color: 'text-[#F59E0B]' },
    ],
    events: LIVE_EVENTS,
  },
  {
    eyebrow: 'Proof run',
    title: 'Freestyle round',
    badge: 'UPLOAD WINDOW',
    timer: '01:18',
    icon: Camera,
    accent: 'text-[#2DD4BF]',
    cta: 'Submit proof',
    stats: [
      { name: 'Clip quality', value: 'HD', score: 92, tone: 'bg-[#2DD4BF]' },
      { name: 'Geo check', value: 'Match', score: 84, tone: 'bg-brand-primary' },
    ],
    metrics: [
      { label: 'Angles', value: '2', icon: Camera, color: 'text-[#2DD4BF]' },
      { label: 'Time', value: '1m', icon: Gauge, color: 'text-[#F59E0B]' },
      { label: 'Ready', value: 'Yes', icon: ShieldCheck, color: 'text-[#19C37D]' },
    ],
    events: [
      { label: 'Camera roll attached', icon: Camera, color: 'text-[#2DD4BF]' },
      { label: 'Opponent proof pending', icon: Swords, color: 'text-brand-primary' },
      { label: 'Hash created', icon: LockKeyhole, color: 'text-[#19C37D]' },
    ],
  },
  {
    eyebrow: 'Court mode',
    title: 'Evidence vote',
    badge: 'JURY LIVE',
    timer: '02:05',
    icon: Vote,
    accent: 'text-[#F59E0B]',
    cta: 'Review evidence',
    stats: [
      { name: 'Player A proof', value: 'Strong', score: 86, tone: 'bg-[#19C37D]' },
      { name: 'Player B proof', value: 'Needs review', score: 61, tone: 'bg-[#F59E0B]' },
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

const TAB_LABELS = ['Challenge', 'Proof', 'Court', 'Settlement'];

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
    <section id="gameplay-preview" className="scroll-mt-20 overflow-hidden bg-brand-bg px-6 py-16">
      <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-x-10 lg:gap-y-7">
        {/* Left: copy */}
        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3 py-1.5 font-mono text-xs text-brand-primary">
              <Flame className="h-3.5 w-3.5" />
              Mobile gameplay
            </div>
            <div className="space-y-4">
              <h2 className="font-syne text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
                The app should feel like a match, not a form.
              </h2>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Players move through a fast challenge loop: issue the DARE, lock escrow, capture
                proof, and settle the winner in court mode.
              </p>
            </div>
          </div>
        </div>

        {/* Right: interactive phone preview */}
        <div className="relative mx-auto w-full max-w-[360px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mx-0">
          <div aria-hidden className="absolute -left-10 top-16 h-32 w-32 rounded-full border border-brand-primary/20" />
          <div aria-hidden className="absolute -right-8 bottom-14 h-24 w-24 rounded-full border border-[#2DD4BF]/20" />

          {/* Tab selector */}
          <div className="mb-3 flex gap-1" aria-label="Gameplay stages">
            {TAB_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                data-active={i === activeIndex}
                aria-label={`Show ${label} stage`}
                onClick={() => selectTab(i)}
                className={`flex-1 min-h-[44px] rounded-lg px-1 py-2 font-mono text-[11px] transition-all ${
                  i === activeIndex
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
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
                className="h-full bg-brand-primary rounded-full gameplay-progress"
              />
            </div>
          )}

          <div key={activeIndex} className="animate-in fade-in duration-300">
            <PhonePreview screen={screen} />
          </div>

          {paused && (
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="mt-3 w-full text-center font-mono text-[11px] text-muted-foreground hover:text-brand-primary transition-colors"
            >
              Resume auto-play
            </button>
          )}
        </div>

        {/* Game steps */}
        <div className="grid gap-3 sm:grid-cols-2 lg:col-start-1 lg:row-start-2">
          {GAME_STEPS.map((step) => (
            <div
              key={step.label}
              className="rounded-lg border border-white/8 bg-white/[0.03] p-4 hover:border-white/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/12 text-brand-primary">
                  <step.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-mono text-[11px] uppercase text-muted-foreground">{step.label}</p>
                  <p className="text-sm font-semibold text-foreground">{step.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scroll strip */}
        <div className="mt-2 lg:col-span-2 lg:mt-4">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-brand-primary">All four stages</p>
              <h3 className="mt-1 font-syne text-2xl font-extrabold text-foreground">
                Every moment players remember.
              </h3>
            </div>
            <p className="hidden max-w-xs text-sm text-muted-foreground sm:block">
              Click a stage above or tap below to jump directly.
            </p>
          </div>
          <div className="flex snap-x gap-5 overflow-x-auto pb-4 pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {GAMEPLAY_SCREENS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => selectTab(i)}
                className={`shrink-0 snap-center text-left outline-none rounded-[34px] transition-opacity ${
                  i === activeIndex ? 'opacity-100' : 'opacity-55 hover:opacity-80'
                }`}
                aria-label={`Switch to ${TAB_LABELS[i]} stage`}
              >
                <PhonePreview screen={s} compact />
              </button>
            ))}
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
      className={`rounded-[34px] border border-white/12 bg-[#090910] p-3 shadow-2xl shadow-brand-primary/10 ${
        compact ? 'w-[280px] sm:w-[300px]' : 'w-full max-w-[340px]'
      }`}
    >
      <div className="rounded-[26px] border border-white/8 bg-brand-bg p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className={`font-mono text-[10px] uppercase ${screen.accent}`}>{screen.eyebrow}</p>
            <h3 className="mt-1 font-syne text-2xl font-extrabold text-foreground">{screen.title}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary text-white">
            <screen.icon className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-[#19C37D]/12 px-2 py-1 font-mono text-[10px] text-[#19C37D]">
              {screen.badge}
            </span>
            <span className="font-mono text-sm text-foreground">{screen.timer}</span>
          </div>

          <div className="mt-5 space-y-4">
            {screen.stats.map((stat) => (
              <div key={stat.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{stat.name}</span>
                  <span className="font-mono text-muted-foreground">{stat.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`${stat.tone} h-full rounded-full`}
                    style={{ width: `${stat.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {screen.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-white/8 bg-white/[0.035] p-3 text-center"
            >
              <metric.icon className={`mx-auto h-5 w-5 ${metric.color}`} />
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">{metric.label}</p>
              <p className="text-sm font-bold text-foreground">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {screen.events.map((event) => (
            <div
              key={event.label}
              className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2"
            >
              <event.icon className={`h-4 w-4 ${event.color}`} />
              <span className="text-sm text-foreground">{event.label}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary font-semibold text-white transition-opacity hover:opacity-90"
          aria-label={screen.cta}
        >
          <Play className="h-4 w-4 fill-white" />
          {screen.cta}
        </button>
      </div>
    </div>
  );
}
