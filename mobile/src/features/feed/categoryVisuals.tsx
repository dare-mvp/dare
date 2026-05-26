import {
  Brain,
  Dumbbell,
  LucideIcon,
  MessageCircle,
  Palette,
  Trophy,
  Zap,
} from 'lucide-react-native';

import { colors } from '../../theme/tokens';

type CategoryVisual = {
  color: string;
  Icon: LucideIcon;
  label: string;
};

const fallbackVisual: CategoryVisual = { color: colors.primary, Icon: Zap, label: 'Other' };

const visuals: Record<string, CategoryVisual> = {
  creative: { color: colors.primary, Icon: Palette, label: 'Creative' },
  knowledge: { color: colors.info, Icon: Brain, label: 'Knowledge' },
  other: fallbackVisual,
  physical: { color: colors.warning, Icon: Dumbbell, label: 'Physical' },
  sports: { color: colors.warning, Icon: Trophy, label: 'Sports' },
  verbal: { color: colors.success, Icon: MessageCircle, label: 'Verbal' },
};

export function getCategoryVisual(category: string): CategoryVisual {
  return visuals[category.trim().toLowerCase()] ?? fallbackVisual;
}
