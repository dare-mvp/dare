import { StyleSheet, Text } from 'react-native';

import { colors, fonts, typography } from '../../theme/tokens';

type MoneyTone = 'positive' | 'negative' | 'locked' | 'pending';

type MoneyAmountProps = {
  amountKobo: number;
  tone?: MoneyTone;
};

const toneColors: Record<MoneyTone, string> = {
  positive: colors.moneyPositive,
  negative: colors.moneyNegative,
  locked: colors.escrowLocked,
  pending: colors.pending,
};

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  currency: 'NGN',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
});

export function MoneyAmount({ amountKobo, tone = 'positive' }: MoneyAmountProps) {
  const amount = amountKobo / 100;

  return (
    <Text accessibilityLabel={`${amount} Nigerian naira`} style={[styles.amount, { color: toneColors[tone] }]}>
      {nairaFormatter.format(amount)}
    </Text>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontFamily: fonts.displaySemi,
    fontSize: typography.numeric.fontSize,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: typography.numeric.lineHeight,
  },
});
