import { useLocalSearchParams, useRouter } from 'expo-router';
import { Scale } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { DisputeFlowFrame } from '../../src/features/disputes/components/DisputeFlowFrame';
import { DisputeStepRow } from '../../src/features/disputes/components/DisputeStepRow';
import { activeCourtSession } from '../../src/mocks/court';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function DisputeStatusScreen() {
  const router = useRouter();
  const { dareId, juryCaseId } = useLocalSearchParams<{
    dareId?: string;
    juryCaseId?: string;
  }>();

  return (
    <DisputeFlowFrame
      eyebrow="Dispute status"
      onBack={() => router.back()}
      title="Review in progress."
      subtitle="Settlement remains pending while the dispute path is open."
    >
      <View style={styles.hero}>
        <Scale color={colors.purple} size={30} />
        <View style={styles.heroCopy}>
          <StatusBadge label="UNDER REVIEW" tone="neutral" />
          <Text style={styles.title}>{activeCourtSession.title}</Text>
          <Text style={styles.body}>
            {juryCaseId
              ? `Evidence has been received for case ${juryCaseId}.`
              : 'Evidence has been received. A review path will determine whether settlement can continue.'}
          </Text>
        </View>
      </View>

      <View style={styles.steps}>
        <DisputeStepRow label="Dispute filed" status="done" />
        <DisputeStepRow label="Evidence uploaded" status="done" />
        <DisputeStepRow label="Review assignment" status="active" />
        <DisputeStepRow label="Verdict and settlement" status="pending" />
      </View>

      <InlineAlert
        tone="warning"
        title="Settlement is paused"
        message="Payout and trust changes remain pending until the dispute is resolved."
      />

      <ActionButton
        accessibilityLabel="Back to court settlement"
        label="Back to settlement"
        onPress={() => router.replace({
          pathname: '/court/settlement-status',
          params: { dareId },
        })}
      />
    </DisputeFlowFrame>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    backgroundColor: colors.purpleDim,
    borderColor: colors.purple,
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
    lineHeight: typography.sectionTitle.lineHeight,
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
});
