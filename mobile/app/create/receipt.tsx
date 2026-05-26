import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { MoneyAmount } from '../../src/components/ui/MoneyAmount';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { CreateFlowFrame } from '../../src/features/create/components/CreateFlowFrame';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function CreateReceiptScreen() {
  const router = useRouter();
  const { category, dareId, opponent, resolutionType, stakeAmount, status, title } = useLocalSearchParams<{
    category?: string;
    dareId?: string;
    opponent?: string;
    resolutionType?: string;
    stakeAmount?: string;
    status?: string;
    title?: string;
  }>();
  const stakeKobo = stakeAmount ? Number.parseInt(stakeAmount, 10) : 0;
  const platformFeeKobo = Math.round(stakeKobo * 0.05);
  const escrowKobo = stakeKobo + platformFeeKobo;
  const receiptLines = [
    { label: 'Category', value: (category ?? 'knowledge').toUpperCase() },
    { label: 'Resolution', value: (resolutionType ?? 'algorithmic').toUpperCase() },
    { label: 'Opponent', value: opponent ?? 'Open challenge' },
    { label: 'Reference', value: dareId ?? 'Pending reference' },
  ];

  return (
    <CreateFlowFrame
      eyebrow="Receipt"
      onBack={() => router.back()}
      title="DARE created."
      subtitle="Escrow remains pending until creation and wallet confirmation are complete."
    >
      <View style={styles.hero}>
        <CheckCircle2 color={colors.warning} size={32} />
        <StatusBadge label={(status ?? 'PENDING ESCROW').toUpperCase()} tone="warning" />
        <Text style={styles.heroTitle}>Challenge submitted</Text>
        <Text style={styles.heroText}>The DARE becomes open after escrow and eligibility checks are confirmed.</Text>
      </View>

      <View style={styles.receipt}>
        <Text style={styles.receiptTitle}>{title ?? 'DARE created'}</Text>
        {receiptLines.map((line) => (
          <ReceiptLine key={line.label} label={line.label} value={line.value} />
        ))}
        <View style={styles.moneyLine}>
          <Text style={styles.label}>Escrow requested</Text>
          <MoneyAmount amountKobo={escrowKobo} tone="locked" />
        </View>
      </View>

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="View feed"
          label="View feed"
          onPress={() => router.replace('/(tabs)')}
        />
        <ActionButton
          accessibilityLabel="Create another DARE"
          label="Create another"
          onPress={() => router.replace('/(tabs)/create')}
          variant="secondary"
        />
      </View>
    </CreateFlowFrame>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text numberOfLines={1} style={styles.value}>{value}</Text>
    </View>
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
  heroTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroText: {
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
    gap: spacing[10],
    padding: spacing[16],
  },
  receiptTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  line: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  moneyLine: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    paddingTop: spacing[10],
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
    fontWeight: '900',
    textAlign: 'right',
  },
  actions: {
    gap: spacing[10],
  },
});
