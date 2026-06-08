import {
  BadgeHelp,
  Banknote,
  Brain,
  Clock3,
  Dumbbell,
  FileCheck2,
  Gavel,
  KeyRound,
  ListChecks,
  MessageCircle,
  Palette,
  Scale,
  Trophy,
} from 'lucide-react-native';
import { ReactNode } from 'react';

import { colors } from '../../theme/tokens';
import { DareCategory, ResolutionType } from './types';
import type { DareType } from './types';

export type IconOption<T> = {
  body?: string;
  icon: ReactNode;
  label: string;
  value: T;
};

export const resolutionOptions: Array<IconOption<ResolutionType>> = [
  {
    body: 'Creator-authored objective task with a committed answer key for settlement.',
    icon: <KeyRound color={colors.primary} size={20} />,
    label: 'Answer Key',
    value: 'answer_key',
  },
  {
    body: 'Live challenge judged by witness signals and jury review when needed.',
    icon: <Gavel color={colors.warning} size={20} />,
    label: 'Witnessed',
    value: 'witnessed',
  },
  {
    body: 'Proof upload and review for real-world tasks that need submitted evidence.',
    icon: <FileCheck2 color={colors.info} size={20} />,
    label: 'Evidence',
    value: 'evidence',
  },
];

export const dareTypeOptions: Array<IconOption<DareType>> = [
  {
    body: 'Two participants compete. Both stakes lock in escrow before Court.',
    icon: <Trophy color={colors.primary} size={20} />,
    label: 'Skill-Based',
    value: 'skill',
  },
  {
    body: 'The Darer funds a reward. The performer accepts without staking money.',
    icon: <Banknote color={colors.warning} size={20} />,
    label: 'Task-Based',
    value: 'task',
  },
];

export const categoryOptions: Array<IconOption<DareCategory>> = [
  { icon: <Brain color={colors.info} size={15} />, label: 'Knowledge', value: 'knowledge' },
  { icon: <Dumbbell color={colors.warning} size={15} />, label: 'Physical', value: 'physical' },
  { icon: <MessageCircle color={colors.success} size={15} />, label: 'Verbal', value: 'verbal' },
  { icon: <Trophy color={colors.warning} size={15} />, label: 'Sports', value: 'sports' },
  { icon: <Palette color={colors.danger} size={15} />, label: 'Creative', value: 'creative' },
  { icon: <BadgeHelp color={colors.textMuted} size={15} />, label: 'Other', value: 'other' },
];

export const durationOptions: Array<IconOption<number>> = [
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '60s', value: 60 },
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '3 min', value: 180 },
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '5 min', value: 300 },
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '10 min', value: 600 },
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '15 min', value: 900 },
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '30 min', value: 1800 },
  { icon: <Clock3 color={colors.textMuted} size={14} />, label: '60 min', value: 3600 },
];

export const createSectionIcons = {
  category: <Trophy color={colors.primary} size={17} />,
  stake: <Banknote color={colors.warning} size={17} />,
  terms: <ListChecks color={colors.info} size={17} />,
  type: <Scale color={colors.primary} size={17} />,
};
