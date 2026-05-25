import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock3 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { CourtFlowFrame } from '../../src/features/court/components/CourtFlowFrame';
import { activeCourtSession } from '../../src/mocks/court';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

const settlementSteps = [
  { label: 'Result recorded', status: 'Done' },
  { label: 'Dispute window', status: 'Open' },
  { label: 'Payout release', status: 'Pending' },
  { label: 'Trust update', status: 'Pending' },
];

export default function CourtSettlementStatusScreen() {
  const router = useRouter();
  const { dareId } = useLocalSearchParams<{ dareId?: string }>();
  const session = { ...activeCourtSession, phase: 'settlement_pending' as const };

  return (
    <CourtFlowFrame
      eyebrow="Settlement"
      onBack={() => router.back()}
      title="Settlement pending."
      subtitle="Payout and trust changes become final only after the settlement path completes."
    >
      <View style={styles.hero}>
        <Clock3 color={colors.warning} size={30} />
        <View style={styles.heroCopy}>
          <StatusBadge label="PENDING" tone="warning" />
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.body}>The result is recorded. Settlement waits for the dispute window and payout confirmation.</Text>
        </View>
      </View>

      <View style={styles.steps}>
        {settlementSteps.map((step) => (
          <View key={step.label} style={styles.stepRow}>
            <Text style={styles.stepLabel}>{step.label}</Text>
            <StatusBadge label={step.status.toUpperCase()} tone={step.status === 'Done' ? 'success' : 'warning'} />
          </View>
        ))}
      </View>

      <InlineAlert
        tone="info"
        title="Dispute window active"
        message={dareId ? `If there is a valid dispute for ${dareId}, file it before settlement is finalized.` : 'If there is a valid dispute, file it before settlement is finalized.'}
      />

      <ActionButton
        accessibilityLabel="Back to court"
        label="Back to court"
        onPress={() => router.replace('/(tabs)/court')}
      />
    </CourtFlowFrame>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    backgroundColor: colors.warningDim,
    borderColor: colors.warning,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[16],
  },
  heroCopy: {
    flex: 1,
    gap: spacing[8],
    minWidth: 0,
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
  },
  steps: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  stepRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[14],
  },
  stepLabel: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
  },
});
