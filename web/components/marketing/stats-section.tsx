'use client';

import { useEffect, useRef, useState } from 'react';
import { MARKETING_STATS } from '@/lib/marketing-stats';

function CountUp({
  target,
  suffix = '',
  prefix = '',
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || animated.current) return;
        animated.current = true;

        const duration = 1400;
        const start = performance.now();
        const isDecimal = !Number.isInteger(target);

        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const raw = target * eased;
          setCurrent(isDecimal ? Math.round(raw * 10) / 10 : Math.round(raw));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  const display = Number.isInteger(target) ? current.toLocaleString() : current.toFixed(1);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  return (
    <section className="border-y border-white/8 bg-brand-surface px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {MARKETING_STATS.map((stat) => (
            <div key={stat.label} className="space-y-3 text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <stat.icon className="h-6 w-6" />
              </div>
              <p className="font-syne text-3xl font-extrabold text-foreground">
                <CountUp
                  target={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                />
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
