import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';
import { WalletFlowFrame } from '../../src/features/wallet/components/WalletFlowFrame';

export default function WithdrawalReceiptScreen() {
  const router = useRouter();
  const { amount, destination, reference } = useLocalSearchParams<{
    amount?: string;
    destination?: string;
    reference?: string;
  }>();
  const amountKobo = amount ? Number.parseInt(amount, 10) : 0;
  const receiptLines = [
    { label: 'Amount', value: amountKobo > 0 ? formatNgnFromKobo(amountKobo) : 'Pending' },
    { label: 'Destination', value: destination ?? 'Bank account' },
    { label: 'Status', value: 'Pending provider payout' },
    { label: 'Reference', value: reference ?? 'Pending reference' },
  ];

  return (
    <WalletFlowFrame
      eyebrow="Receipt"
      onBack={() => router.back()}
      title="Withdrawal requested."
      subtitle="This request is pending. Balance updates after provider payout confirmation."
    >
      <View style={styles.hero}>
        <CheckCircle2 color={colors.warning} size={32} />
        <StatusBadge label="PENDING" tone="warning" />
        <Text style={styles.title}>Request received</Text>
        <Text style={styles.body}>Your withdrawal has been queued for payout confirmation.</Text>
      </View>

      <View style={styles.receipt}>
        {receiptLines.map((line) => (
          <View key={line.label} style={styles.line}>
            <Text style={styles.label}>{line.label}</Text>
            <Text numberOfLines={1} style={styles.value}>{line.value}</Text>
          </View>
        ))}
      </View>

      <ActionButton accessibilityLabel="Back to wallet" label="Back to wallet" onPress={() => router.replace('/(tabs)/wallet')} />
    </WalletFlowFrame>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    backgroundColor: colors.warningDim,
    borderColor: colors.warning,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[20],
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  receipt: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  line: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[14],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});
