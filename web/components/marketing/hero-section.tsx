export function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden bg-brand-bg px-6 text-center">
      {/* Abstract background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[600px] w-[600px] rounded-full bg-brand-primary opacity-10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-1.5 font-mono text-xs text-brand-primary">
          BETA — Android APK now available
        </div>

        <h1 className="font-syne text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-7xl">
          Challenge.{' '}
          <span className="text-brand-primary">Wager.</span>{' '}
          Win.
        </h1>

        <p className="mx-auto max-w-xl text-lg text-muted-foreground sm:text-xl">
          DARE lets you challenge friends to real-money skill competitions, verified on-chain and
          settled in minutes. Your proof. Your prize.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="#apk-download"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand-primary px-8 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Download APK
          </a>
          <a
            href="#"
            className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-8 font-semibold text-foreground transition-colors hover:bg-white/10"
          >
            iOS TestFlight
          </a>
        </div>
      </div>
    </section>
  );
}
