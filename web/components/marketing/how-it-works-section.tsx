import { Target, CheckCircle2, Timer, Trophy } from 'lucide-react';

const STEPS = [
  {
    icon: Target,
    title: 'Create a DARE',
    description:
      'Pick your challenge category, set a wager amount, and send the invite to your opponent.',
  },
  {
    icon: CheckCircle2,
    title: 'Opponent accepts',
    description:
      'Funds are locked in escrow the moment both players confirm. No one can back out without penalty.',
  },
  {
    icon: Timer,
    title: 'Complete the challenge',
    description:
      'Each player submits evidence when the challenge is complete. The Court timer keeps it fair.',
  },
  {
    icon: Trophy,
    title: 'Settlement',
    description:
      'The winner is determined by evidence review or jury vote. Funds are released to the wallet instantly.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-brand-bg px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">Four steps from challenge to payout.</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.title} className="rounded-xl border border-white/8 bg-brand-surface p-6">
              <step.icon className="h-8 w-8 text-brand-primary" />
              <h3 className="mt-4 font-syne text-lg font-extrabold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
