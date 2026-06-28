import { useLocalSearchParams, useRouter } from 'expo-router';
import { Scale } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { DisputeFlowFrame } from '../../src/features/disputes/components/DisputeFlowFrame';
import { DisputeStepRow } from '../../src/features/disputes/components/DisputeStepRow';
import { useDareDetail } from '../../src/features/feed/useDareDetail';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function DisputeStatusScreen() {
  const router = useRouter();
  const { dareId, evidenceObjectId, evidenceSide, juryCaseId } = useLocalSearchParams<{
    dareId?: string;
    evidenceObjectId?: string;
    evidenceSide?: string;
    juryCaseId?: string;
  }>();
  const { dare, error: dareError, loading: dareLoading, source } = useDareDetail(dareId);

  if (!dareId) {
    return (
      <DisputeFlowFrame
        eyebrow="Dispute status"
        onBack={() => router.back()}
        title="Dispute reference missing."
        subtitle="Open a dispute from a DARE, Court result, or a complete notification."
      >
        <ErrorState
          body="This status screen needs a DARE reference before it can show evidence, jury, or settlement state."
          onRetry={() => router.replace('/notifications')}
          retryLabel="Back to notifications"
          title="Unable to load dispute"
        />
        <ActionButton
          accessibilityLabel="Back to feed"
          label="Back to feed"
          onPress={() => router.replace('/(tabs)')}
          variant="secondary"
        />
      </DisputeFlowFrame>
    );
  }

  return (
    <DisputeFlowFrame
      eyebrow="Dispute status"
      onBack={() => router.back()}
      title="Review in progress."
      subtitle="Settlement remains pending while the dispute path is open."
    >
      {source === 'mock' && !dareError ? (
        <InlineAlert
          tone="info"
          title={dareLoading ? 'Loading DARE' : 'Preview dispute'}
          message={dareLoading ? 'Fetching dispute details.' : 'Live dispute status appears after sign-in and sync.'}
        />
      ) : null}

      {dareError ? (
        <InlineAlert
          tone="danger"
          title="DARE details unavailable"
          message={dareError}
        />
      ) : null}

      <View style={styles.hero}>
        <Scale color={colors.purple} size={30} />
        <View style={styles.heroCopy}>
          <StatusBadge label="UNDER REVIEW" tone="neutral" />
          <Text style={styles.title}>{dare?.title ?? 'DARE unavailable'}</Text>
          <Text style={styles.body}>
            {juryCaseId
              ? `Evidence has been received for case ${shortId(juryCaseId)}.`
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

      <View style={styles.receipt}>
        <ReceiptLine label="Action" value="Dispute evidence submitted" />
        <ReceiptLine label="Status" value="Under review" />
        <ReceiptLine label="Timestamp" value={new Date().toLocaleString()} />
        <ReceiptLine label="DARE reference" value={dareId ?? 'Pending'} />
        {evidenceObjectId ? <ReceiptLine label="Evidence reference" value={evidenceObjectId} /> : null}
        {juryCaseId ? <ReceiptLine label="Jury case" value={juryCaseId} /> : null}
        <ReceiptLine label="Next action" value="Wait for review assignment" />
      </View>

      <InlineAlert
        tone="warning"
        title="Settlement is paused"
        message="Payout and trust changes remain pending until the dispute is resolved."
      />

      {evidenceObjectId ? (
        <InlineAlert
          tone="success"
          title="Evidence submitted"
          message={`Evidence ${shortId(evidenceObjectId)} is attached${evidenceSide === 'A' || evidenceSide === 'B' ? ` to side ${evidenceSide}` : ''}.`}
        />
      ) : null}

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

function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.receiptLine}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.receiptValue}>{value}</Text>
    </View>
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
  receipt: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  receiptLine: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  receiptLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  receiptValue: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});
