import { Scale, Lock, Shield } from 'lucide-react';

const PILLARS = [
  {
    icon: Scale,
    title: 'Skill Wins Here',
    description:
      'The Predominance Test: outcomes decided by player skill, not chance.',
  },
  {
    icon: Lock,
    title: 'Funds in Escrow',
    description:
      'Money is locked the moment a DARE is accepted, released only on settlement.',
  },
  {
    icon: Shield,
    title: 'Responsible Gaming',
    description:
      'Identity verified, deposit limits enforced, self-exclusion available.',
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
              <pillar.icon className="h-8 w-8 text-brand-primary" />
              <h3 className="font-syne text-lg font-extrabold text-foreground">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
