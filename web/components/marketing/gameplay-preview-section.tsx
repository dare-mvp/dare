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

const PLAYER_STATS = [
  { name: 'Ayo', score: 78, tone: 'bg-brand-primary' },
  { name: 'Mira', score: 72, tone: 'bg-[#19C37D]' },
];

const LIVE_EVENTS = [
  { label: 'Escrow verified', icon: ShieldCheck, color: 'text-[#19C37D]' },
  { label: 'Proof window open', icon: Camera, color: 'text-[#2DD4BF]' },
  { label: 'Court timer live', icon: Gauge, color: 'text-[#F59E0B]' },
];

export function GameplayPreviewSection() {
  return (
    <section id="gameplay-preview" className="overflow-hidden bg-brand-bg px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
        <div className="space-y-8 lg:col-start-1 lg:row-start-1">
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
                Players move through a fast challenge loop: issue the DARE, lock escrow, capture proof, and settle the winner in court mode.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div aria-hidden className="absolute -left-10 top-16 h-32 w-32 rounded-full border border-brand-primary/20" />
          <div aria-hidden className="absolute -right-8 bottom-14 h-24 w-24 rounded-full border border-[#2DD4BF]/20" />

          <div className="relative mx-auto w-full max-w-[360px] rounded-[34px] border border-white/12 bg-[#090910] p-3 shadow-2xl shadow-brand-primary/10">
            <div className="rounded-[26px] border border-white/8 bg-brand-bg p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase text-brand-primary">Live DARE</p>
                  <h3 className="mt-1 font-syne text-2xl font-extrabold text-foreground">3-point sprint</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary text-white">
                  <Zap className="h-6 w-6" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-[#19C37D]/12 px-2 py-1 font-mono text-[10px] text-[#19C37D]">
                    ESCROW LOCKED
                  </span>
                  <span className="font-mono text-sm text-foreground">00:42</span>
                </div>

                <div className="mt-5 space-y-4">
                  {PLAYER_STATS.map((player) => (
                    <div key={player.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground">{player.name}</span>
                        <span className="font-mono text-muted-foreground">{player.score} pts</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/8">
                        <div className={`${player.tone} h-full rounded-full`} style={{ width: `${player.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3 text-center">
                  <WalletCards className="mx-auto h-5 w-5 text-brand-primary" />
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">Stake</p>
                  <p className="text-sm font-bold text-foreground">12K</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3 text-center">
                  <BadgeCheck className="mx-auto h-5 w-5 text-[#19C37D]" />
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">Trust</p>
                  <p className="text-sm font-bold text-foreground">98</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3 text-center">
                  <Trophy className="mx-auto h-5 w-5 text-[#F59E0B]" />
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">Prize</p>
                  <p className="text-sm font-bold text-foreground">Win</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {LIVE_EVENTS.map((event) => (
                  <div key={event.label} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                    <event.icon className={`h-4 w-4 ${event.color}`} />
                    <span className="text-sm text-foreground">{event.label}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary font-semibold text-white"
                aria-label="Preview court mode"
              >
                <Play className="h-4 w-4 fill-white" />
                Enter court mode
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:col-start-1 lg:row-start-2">
          {GAME_STEPS.map((step) => (
            <div key={step.label} className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
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
      </div>
    </section>
  );
}
