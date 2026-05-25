import {
  BadgeHelp,
  Banknote,
  Bot,
  Brain,
  Clock3,
  FileCheck2,
  Gavel,
  Landmark,
  ListChecks,
  Mic2,
  Palette,
  Scale,
  Trophy,
} from 'lucide-react-native';
import { ReactNode } from 'react';

import { colors } from '../../theme/tokens';
import { DareCategory, ResolutionType } from './types';

export type IconOption<T> = {
  body?: string;
  icon: ReactNode;
  label: string;
  value: T;
};

export const resolutionOptions: Array<IconOption<ResolutionType>> = [
  {
    body: 'Auto-scored quiz or timed challenge.',
    icon: <Bot color={colors.primary} size={20} />,
    label: 'Algorithmic',
    value: 'algorithmic',
  },
  {
    body: 'Community verdict after evidence review.',
    icon: <Gavel color={colors.purple} size={20} />,
    label: 'Jury',
    value: 'jury',
  },
  {
    body: 'Proof upload, then opponent review.',
    icon: <FileCheck2 color={colors.info} size={20} />,
    label: 'Evidence',
    value: 'evidence',
  },
];

export const categoryOptions: Array<IconOption<DareCategory>> = [
  { icon: <Brain color={colors.info} size={15} />, label: 'Knowledge', value: 'knowledge' },
  { icon: <Trophy color={colors.warning} size={15} />, label: 'Sports', value: 'sports' },
  { icon: <Mic2 color={colors.purple} size={15} />, label: 'Music', value: 'music' },
  { icon: <Landmark color={colors.success} size={15} />, label: 'Finance', value: 'finance' },
  { icon: <Palette color={colors.danger} size={15} />, label: 'Creative', value: 'creative' },
  { icon: <BadgeHelp color={colors.textMuted} size={15} />, label: 'Other', value: 'other' },
];

export const durationOptions: Array<IconOption<number>> = [
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '60s', value: 60 },
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '3 min', value: 180 },
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '5 min', value: 300 },
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '10 min', value: 600 },
];

export const createSectionIcons = {
  category: <Trophy color={colors.primary} size={17} />,
  stake: <Banknote color={colors.warning} size={17} />,
  terms: <ListChecks color={colors.info} size={17} />,
  type: <Scale color={colors.primary} size={17} />,
};
