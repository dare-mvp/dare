import { StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from './MoneyAmount';
import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type EscrowBreakdownProps = {
  platformFeeKobo: number;
  stakeKobo: number;
  title?: string;
};

export function EscrowBreakdown({ platformFeeKobo, stakeKobo, title = 'Escrow breakdown' }: EscrowBreakdownProps) {
  const totalKobo = stakeKobo + platformFeeKobo;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      <Line label="Stake" valueKobo={stakeKobo} />
      <Line label="Platform fee" valueKobo={platformFeeKobo} />
      <Line emphasis label="Total to lock" valueKobo={totalKobo} />
    </View>
  );
}

function Line({ emphasis = false, label, valueKobo }: { emphasis?: boolean; label: string; valueKobo: number }) {
  return (
    <View style={[styles.line, emphasis && styles.emphasisLine]}>
      <Text style={[styles.label, emphasis && styles.emphasisText]}>{label}</Text>
      <MoneyAmount amountKobo={valueKobo} tone={emphasis ? 'locked' : 'pending'} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  line: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  emphasisLine: {
    borderTopColor: colors.borderStrong,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  emphasisText: {
    color: colors.text,
    fontWeight: '900',
  },
});
