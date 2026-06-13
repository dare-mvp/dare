import { Trophy, Gamepad2, Dumbbell, Music2, Brain, MapPin } from 'lucide-react';

const CATEGORIES = [
  {
    icon: Trophy,
    name: 'Sports',
    examples: ['Football juggling', 'Sprint race', 'Basketball 1v1'],
    color: 'text-brand-primary',
    bg: 'bg-brand-primary/10',
    border: 'hover:border-brand-primary/40',
    range: 'NGN 5K – 50K',
  },
  {
    icon: Gamepad2,
    name: 'Gaming',
    examples: ['FIFA', 'Chess', 'Mobile games'],
    color: 'text-[#7C3AED]',
    bg: 'bg-[#7C3AED]/10',
    border: 'hover:border-[#7C3AED]/40',
    range: 'NGN 2K – 30K',
  },
  {
    icon: Dumbbell,
    name: 'Fitness',
    examples: ['Push-up count', 'Plank hold', 'Burpees'],
    color: 'text-[#19C37D]',
    bg: 'bg-[#19C37D]/10',
    border: 'hover:border-[#19C37D]/40',
    range: 'NGN 1K – 20K',
  },
  {
    icon: Music2,
    name: 'Creative',
    examples: ['Freestyle rap', 'Dance battle', 'Beat making'],
    color: 'text-[#2DD4BF]',
    bg: 'bg-[#2DD4BF]/10',
    border: 'hover:border-[#2DD4BF]/40',
    range: 'NGN 5K – 100K',
  },
  {
    icon: Brain,
    name: 'Mind',
    examples: ['Trivia', 'Riddles', 'Debate'],
    color: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/10',
    border: 'hover:border-[#F59E0B]/40',
    range: 'NGN 1K – 25K',
  },
  {
    icon: MapPin,
    name: 'Street',
    examples: ['Hyper-local', 'Geo-verified', 'Community picks'],
    color: 'text-[#EC4899]',
    bg: 'bg-[#EC4899]/10',
    border: 'hover:border-[#EC4899]/40',
    range: 'NGN 2K – 40K',
  },
];

export function CategoriesSection() {
  return (
    <section id="categories" className="scroll-mt-14 bg-brand-bg px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3 py-1.5 font-mono text-xs text-brand-primary">
            Challenge types
          </div>
          <h2 className="font-syne text-4xl font-extrabold text-foreground sm:text-5xl">
            Two funding models. Three resolution paths.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Create a DARE in any category. Skill-Based uses two-sided stakes; Task-Based uses a
            Darer-funded reward. Results settle by Answer Key, Witnessed, or Evidence review.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className={`group rounded-xl border border-white/8 bg-brand-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${cat.border}`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${cat.bg} ${cat.color}`}
                >
                  <cat.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {cat.range}
                </span>
              </div>
              <h3 className="font-syne text-lg font-extrabold text-foreground">{cat.name}</h3>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {cat.examples.map((ex) => (
                  <span
                    key={ex}
                    className="rounded-md border border-white/8 bg-white/[0.04] px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don&apos;t see your category?{' '}
          <a href="#waitlist" className="text-brand-primary hover:underline">
            Join the waitlist
          </a>{' '}
          and suggest it.
        </p>
      </div>
    </section>
  );
}
