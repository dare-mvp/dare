import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock3, Scale } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { CourtFlowFrame } from '../../src/features/court/components/CourtFlowFrame';
import { useActiveCourtSession } from '../../src/features/court/useActiveCourtSession';
import {
  formatSettlementDeadline,
  SettlementSummaryLine,
  settlementStatusPartStyles,
} from '../../src/features/feed/components/SettlementStatusParts';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { getSettlementStatus, settleDare, type SettlementStatusResponse } from '../../src/lib/actions/endpoints';
import { isUuid } from '../../src/lib/ids';
import { activeCourtSession } from '../../src/mocks/court';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function CourtSettlementStatusScreen() {
  const router = useRouter();
  const { dareId } = useLocalSearchParams<{ dareId?: string }>();
  const court = useActiveCourtSession(dareId);
  const [settlement, setSettlement] = useState<SettlementStatusResponse | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const session = { ...(court.session ?? activeCourtSession), phase: 'settlement_pending' as const };
  const displayStatus = settlement?.dareStatus ?? session.status;
  const steps = getSettlementSteps(displayStatus, settlement);
  const isReview = settlement?.jury.blockingSettlement ?? (session.status === 'dispute_pending' || session.status === 'jury_open');

  const refreshSettlement = useCallback(async () => {
    if (!dareId || !isUuid(dareId)) {
      setSettlement(null);
      setSettlementError(null);
      setSettlementLoading(false);
      return;
    }

    setSettlementLoading(true);
    const result = await getSettlementStatus(dareId);
    if (result.ok) {
      setSettlement(result.data);
      setSettlementError(null);
    } else {
      setSettlement(null);
      setSettlementError(result.error.message);
    }
    setSettlementLoading(false);
  }, [dareId]);

  useEffect(() => {
    void refreshSettlement();
  }, [refreshSettlement]);

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
          <StatusBadge label={formatStatus(displayStatus)} tone={getStatusTone(displayStatus)} />
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.body}>{settlement?.copyReady.body ?? getStatusBody(displayStatus, session.juryCase?.id)}</Text>
        </View>
      </View>

      <View style={styles.steps}>
        {steps.map((step) => (
          <View key={step.label} style={styles.stepRow}>
            <Text style={styles.stepLabel}>{step.label}</Text>
            <StatusBadge label={step.status.toUpperCase()} tone={step.status === 'Done' ? 'success' : 'warning'} />
          </View>
        ))}
      </View>

      {court.error ? (
        <InlineAlert
          tone="danger"
          title="Settlement state unavailable"
          message={court.error}
        />
      ) : null}

      {settlementError ? (
        <InlineAlert
          tone="danger"
          title="Settlement status unavailable"
          message={settlementError}
        />
      ) : null}

      {settleError ? (
        <InlineAlert
          tone="danger"
          title="Settlement failed"
          message={settleError}
        />
      ) : null}

      {settlement ? (
        <View style={settlementStatusPartStyles.summary}>
          <SettlementSummaryLine label="Held escrow" value={formatNgnFromKobo(settlement.money.heldAmount)} />
          <SettlementSummaryLine label="Expected payout" value={formatNgnFromKobo(settlement.money.expectedPayoutAmount)} />
          <SettlementSummaryLine label="Expected refund" value={formatNgnFromKobo(settlement.money.expectedRefundAmount)} />
          <SettlementSummaryLine label="Dispute deadline" value={formatSettlementDeadline(settlement.dispute.deadlineAt, settlement.dispute.status)} />
          <SettlementSummaryLine label="Jury status" value={formatStatus(settlement.jury.status)} />
        </View>
      ) : null}

      <InlineAlert
        tone={isReview || settlement?.copyReady.state === 'blocked' ? 'warning' : 'info'}
        title={settlement?.copyReady.title ?? (isReview ? 'Review is blocking settlement' : 'Dispute window active')}
        message={settlement?.copyReady.body ?? getAlertMessage(displayStatus, dareId, session.juryCase?.evidenceCount)}
      />

      {isReview ? (
        <ActionButton
          accessibilityLabel="View dispute status"
          icon={<Scale color={colors.text} size={18} />}
          label="Dispute status"
          onPress={() => router.push({
            pathname: '/disputes/status',
            params: { dareId, juryCaseId: session.juryCase?.id },
          })}
          variant="secondary"
        />
      ) : null}

      {settlement?.settlement.eligible ? (
        <ActionButton
          accessibilityLabel="Settle DARE now"
          disabled={settling}
          label={settling ? 'Settling' : settlement.copyReady.ctaLabel}
          onPress={() => {
            void handleSettle();
          }}
        />
      ) : null}

      <ActionButton
        accessibilityLabel="Back to court"
        label={settlementLoading ? 'Refreshing status' : 'Back to court'}
        onPress={() => router.replace('/(tabs)/court')}
      />
    </CourtFlowFrame>
  );

  async function handleSettle() {
    if (!dareId || !isUuid(dareId)) return;
    setSettling(true);
    setSettleError(null);
    const result = await settleDare(dareId);
    if (!result.ok) {
      setSettleError(result.error.message);
      setSettling(false);
      return;
    }
    setSettling(false);
    await refreshSettlement();
  }
}

function getSettlementSteps(status: string, settlement: SettlementStatusResponse | null) {
  if (status === 'settled') {
    return [
      { label: 'Result recorded', status: 'Done' },
      { label: 'Dispute window', status: 'Done' },
      { label: 'Payout release', status: 'Done' },
      { label: 'Trust update', status: 'Done' },
    ];
  }

  if (settlement?.jury.blockingSettlement || status === 'dispute_pending' || status === 'jury_open') {
    return [
      { label: 'Result recorded', status: 'Done' },
      { label: 'Evidence packet', status: 'Done' },
      {
        label: settlement?.jury.status === 'jury_voting' || status === 'jury_open'
          ? 'Jury voting'
          : 'Review assignment',
        status: 'Open',
      },
      { label: 'Verdict and settlement', status: 'Pending' },
    ];
  }

  return [
    { label: 'Result recorded', status: 'Done' },
    { label: 'Dispute window', status: 'Open' },
    { label: 'Payout release', status: 'Pending' },
    { label: 'Trust update', status: 'Pending' },
  ];
}

function getStatusTone(status: string) {
  if (status === 'settled') return 'success';
  if (status === 'dispute_pending' || status === 'jury_open') return 'warning';
  return 'warning';
}

function getStatusBody(status: string, juryCaseId?: string) {
  if (status === 'settled') return 'Settlement is complete. Payout and trust updates have finalized.';
  if (status === 'dispute_pending') return juryCaseId
    ? `Dispute case ${juryCaseId} is open. Settlement is paused.`
    : 'A dispute is open. Settlement is paused.';
  if (status === 'jury_open') return 'Jurors are reviewing submitted evidence before settlement can continue.';
  return 'The result is recorded. Settlement waits for the dispute window and payout confirmation.';
}

function getAlertMessage(status: string, dareId?: string, evidenceCount = 0) {
  if (status === 'dispute_pending' || status === 'jury_open') {
    return `${evidenceCount} evidence file${evidenceCount === 1 ? '' : 's'} attached. Payout and trust changes remain paused until review resolves.`;
  }
  return dareId
    ? `If there is a valid dispute for ${dareId}, file it before settlement is finalized.`
    : 'If there is a valid dispute, file it before settlement is finalized.';
}

function formatStatus(value: string) {
  return value.replace(/[_-]/g, ' ').toUpperCase();
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
