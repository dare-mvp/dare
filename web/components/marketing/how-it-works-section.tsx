import { Target, CheckCircle2, Timer, Trophy } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: Target,
    title: 'Author the DARE',
    description:
      'Choose Skill-Based competition or Task-Based reward, then write the rules, proof, time limit, and settlement path.',
  },
  {
    number: '02',
    icon: CheckCircle2,
    title: 'Escrow locks',
    description:
      'Skill-Based locks both stakes. Task-Based locks only the Darer-funded reward.',
  },
  {
    number: '03',
    icon: Timer,
    title: 'Run Court',
    description:
      'Participants answer, perform live with witnesses, or submit evidence under a server-controlled timer.',
  },
  {
    number: '04',
    icon: Trophy,
    title: 'Settlement',
    description:
      'Answer Key checks, Witnessed signals, Evidence review, or jury verdicts release payout or refund.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-14 bg-brand-bg px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">Four steps from user-authored rules to settlement.</p>
        </div>

        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connecting dashed line (desktop only) */}
          <div
            aria-hidden
            className="absolute top-8 left-[calc(12.5%+18px)] right-[calc(12.5%+18px)] hidden h-px border-t border-dashed border-brand-primary/30 lg:block"
          />

          {STEPS.map((step) => (
            <div
              key={step.title}
              className="group relative rounded-xl border border-white/8 bg-brand-surface p-6 transition-all hover:border-brand-primary/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-primary/5"
            >
              {/* Step number badge */}
              <span className="absolute -top-3 left-5 rounded-full border border-brand-primary/40 bg-brand-bg px-2.5 py-0.5 font-mono text-[10px] text-brand-primary">
                {step.number}
              </span>

              <step.icon className="mt-2 h-8 w-8 text-brand-primary transition-transform group-hover:scale-110" />
              <h3 className="mt-4 font-syne text-lg font-extrabold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
