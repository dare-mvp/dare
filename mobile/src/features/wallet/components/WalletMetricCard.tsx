import { StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from '../../../components/ui/MoneyAmount';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';
import { ProgressBar } from './ProgressBar';

type WalletMetricCardProps = {
  label: string;
  meta: string;
  progressColor?: string;
  progressValue: number;
  tone: 'money' | 'score' | 'pending';
  value: number | string;
};

export function WalletMetricCard({
  label,
  meta,
  progressColor,
  progressValue,
  tone,
  value,
}: WalletMetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {typeof value === 'number' ? (
        <MoneyAmount amountKobo={value} tone={tone === 'pending' ? 'pending' : 'locked'} />
      ) : (
        <Text style={[styles.value, tone === 'score' && styles.scoreValue]}>{value}</Text>
      )}
      <Text style={styles.meta}>{meta}</Text>
      <ProgressBar color={progressColor} value={progressValue} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexBasis: 150,
    flex: 1,
    gap: spacing[6],
    minWidth: 0,
    padding: spacing[14],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.primary,
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    fontWeight: '900',
  },
  scoreValue: {
    color: colors.primary,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    minHeight: 16,
  },
});
