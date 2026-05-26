import { Shield, TrendingUp, Users, Zap } from 'lucide-react';

export const MARKETING_STATS = [
  { label: 'DAREs created', value: 12400, suffix: '+', prefix: '', icon: Zap },
  { label: 'Active players', value: 8500, suffix: '+', prefix: '', icon: Users },
  { label: 'In escrow today', value: 25, suffix: 'M+', prefix: 'NGN ', icon: Shield },
  { label: 'Payout rate', value: 99.2, suffix: '%', prefix: '', icon: TrendingUp },
] as const;

export const HERO_STATS = MARKETING_STATS.slice(0, 3).map((stat) => ({
  label: stat.label === 'In escrow today' ? 'In escrow' : stat.label,
  value: `${stat.prefix}${stat.value.toLocaleString()}${stat.suffix}`,
}));
