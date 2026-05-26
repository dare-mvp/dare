const PILLARS = [
  {
    icon: '⚖️',
    title: 'Skill-based Predominance Test',
    description:
      'Every challenge category passes the Predominance Test — skill, not chance, determines the outcome. DARE is a skill platform, not a gambling product.',
  },
  {
    icon: '🔒',
    title: 'Escrow-protected funds',
    description:
      'Wager amounts are locked in escrow before any challenge begins. Neither player can withdraw until settlement. Powered by Paystack.',
  },
  {
    icon: '🪪',
    title: 'KYC and responsible gaming',
    description:
      'Identity verification is required above threshold stakes. Daily deposit limits, self-exclusion, and cooling-off periods are built in.',
  },
];

export function TrustSafetySection() {
  return (
    <section id="trust-safety" className="bg-brand-surface px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            Trust &amp; Safety
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built for real money. Held to a higher standard.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-xl border border-white/8 bg-brand-bg p-6 space-y-3"
            >
              <span className="text-3xl" role="img" aria-hidden>
                {pillar.icon}
              </span>
              <h3 className="font-syne text-lg font-extrabold text-foreground">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
