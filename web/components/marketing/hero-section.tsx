import { ChevronDown } from 'lucide-react';

const HERO_STATS = [
  { value: '12,400+', label: 'DAREs created' },
  { value: '8,500+', label: 'Active players' },
  { value: 'NGN 25M+', label: 'In escrow' },
];

export function HeroSection() {
  return (
    <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden bg-brand-bg px-6 text-center">
      {/* Radial glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[700px] w-[700px] rounded-full bg-brand-primary opacity-8 blur-[140px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        aria-hidden
        className="hero-grid-bg pointer-events-none absolute inset-0 opacity-[0.03]"
      />

      {/* Top edge accent */}
      <div
        aria-hidden
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent"
      />

      <div className="relative z-10 max-w-3xl space-y-7">
        {/* Beta badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-1.5 font-mono text-xs text-brand-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
          </span>
          BETA — Android APK now available
        </div>

        {/* Headline */}
        <h1 className="font-syne text-5xl font-extrabold leading-tight tracking-tight text-foreground sm:text-7xl">
          Challenge.{' '}
          <span className="text-brand-primary">Wager.</span>{' '}
          Win.
        </h1>

        <p className="mx-auto max-w-xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
          DARE lets you challenge friends to real-money skill competitions, verified on-chain and
          settled in minutes. Your proof. Your prize.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="#apk-download"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-primary px-8 font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
          >
            Download APK
          </a>
          <a
            href="#testflight"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 font-semibold text-foreground transition-colors hover:bg-white/10"
          >
            iOS TestFlight
          </a>
        </div>

        {/* Social proof stats */}
        <div className="flex items-center justify-center gap-6 pt-2">
          {HERO_STATS.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-6">
              <div className="text-center">
                <p className="font-syne text-2xl font-extrabold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
              {i < HERO_STATS.length - 1 && (
                <div className="h-8 w-px bg-white/10" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Scroll
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
      </div>
    </section>
  );
}
