import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { Clock3 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { colors, fonts, radius, spacing } from '../../src/theme/tokens';
import { WalletFlowFrame } from '../../src/features/wallet/components/WalletFlowFrame';

export default function DepositPendingScreen() {
  const router = useRouter();
  const { amount, mode, reference } = useLocalSearchParams<{
    amount?: string;
    mode?: string;
    reference?: string;
  }>();
  const amountKobo = amount ? Number.parseInt(amount, 10) : 0;

  return (
    <WalletFlowFrame
      eyebrow="Deposit pending"
      onBack={() => router.back()}
      title="Waiting for confirmation."
      subtitle="The deposit has been started. Keep this status pending until provider confirmation arrives."
    >
      <EmptyState
        body="Your available wallet balance will update only after the payment provider confirms the deposit."
        icon={<Clock3 color={colors.warning} size={28} />}
        title="Deposit in progress"
      />

      <View style={styles.panel}>
        <StatusBadge label="PENDING" tone="warning" />
        {amountKobo > 0 ? <Text style={styles.reference}>{formatNgnFromKobo(amountKobo)}</Text> : null}
        <Text style={styles.reference}>Reference {reference ?? 'Pending checkout'}</Text>
        {mode ? <Text style={styles.mode}>Provider mode: {mode.toUpperCase()}</Text> : null}
        <Text style={styles.body}>Do not retry the same deposit unless the previous attempt expires or fails.</Text>
      </View>

      <ActionButton accessibilityLabel="Back to wallet" label="Back to wallet" onPress={() => router.replace('/(tabs)/wallet')} />
    </WalletFlowFrame>
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
  reference: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  mode: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
});
