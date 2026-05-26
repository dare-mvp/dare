import Link from 'next/link';
import { Scale, Lock, Shield, ChevronRight, BadgeCheck, UserCheck, Clock } from 'lucide-react';

const PILLARS = [
  {
    icon: Scale,
    title: 'Skill Wins Here',
    description:
      'The Predominance Test: outcomes decided by player skill, not chance. Every DARE category is audited for skill determination.',
    highlights: ['Blind jury review', 'Evidence-based verdicts', 'No house edge'],
  },
  {
    icon: Lock,
    title: 'Funds in Escrow',
    description:
      'Money is locked the moment a DARE is accepted, released only on settlement. No admin can access your funds.',
    highlights: ['Instant lock on accept', 'Smart release logic', 'Immutable ledger'],
  },
  {
    icon: Shield,
    title: 'Responsible Gaming',
    description:
      'Identity verified, deposit limits enforced, self-exclusion available on demand. We prioritise player welfare.',
    highlights: ['KYC required', 'Deposit limits', 'Self-exclusion'],
  },
];

const TRUST_BADGES = [
  { icon: BadgeCheck, label: 'KYC Verified Players' },
  { icon: UserCheck, label: 'Blind Jury System' },
  { icon: Clock, label: 'Instant Settlement' },
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

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {TRUST_BADGES.map((badge) => (
              <div
                key={badge.label}
                className="inline-flex items-center gap-2 rounded-full border border-[#19C37D]/30 bg-[#19C37D]/8 px-4 py-1.5 text-sm text-[#19C37D]"
              >
                <badge.icon className="h-4 w-4" />
                {badge.label}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="group rounded-xl border border-white/8 bg-brand-bg p-6 space-y-4 transition-all hover:border-brand-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary transition-transform group-hover:scale-110">
                <pillar.icon className="h-6 w-6" />
              </div>
              <h3 className="font-syne text-lg font-extrabold text-foreground">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
              <ul className="space-y-1.5">
                {pillar.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-1 w-1 rounded-full bg-brand-primary shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/trust-safety"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
          >
            Read our full Trust &amp; Safety policy
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
