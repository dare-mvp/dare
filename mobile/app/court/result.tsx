import { useLocalSearchParams, useRouter } from 'expo-router';
import { Scale, ShieldAlert, Sparkles, Trophy } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { MoneyAmount } from '../../src/components/ui/MoneyAmount';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { CourtFlowFrame } from '../../src/features/court/components/CourtFlowFrame';
import { useActiveCourtSession } from '../../src/features/court/useActiveCourtSession';
import { activeCourtSession } from '../../src/mocks/court';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function CourtResultScreen() {
  const router = useRouter();
  const { claimState, dareId, evidenceCount, evidenceObjectId, juryCaseId, scoreA, scoreB, status, winnerId } = useLocalSearchParams<{
    claimState?: string;
    dareId?: string;
    evidenceCount?: string;
    evidenceObjectId?: string;
    juryCaseId?: string;
    scoreA?: string;
    scoreB?: string;
    status?: string;
    winnerId?: string;
  }>();
  const court = useActiveCourtSession(dareId);
  const session = court.session ?? activeCourtSession;
  const nextScoreA = scoreA ? Number.parseInt(scoreA, 10) : session.playerA.score;
  const nextScoreB = scoreB ? Number.parseInt(scoreB, 10) : session.playerB.score;
  const currentStatus = status ?? session.status;
  const submittedEvidenceCount = evidenceCount ? Number.parseInt(evidenceCount, 10) : session.evidence.uploadedCount;
  const activeJuryCaseId = juryCaseId ?? session.juryCase?.id;
  const resultTitle = getResultTitle(currentStatus, claimState);
  const resultBody = getResultBody(currentStatus, claimState, session.resultClaims.claimsCount);

  return (
    <CourtFlowFrame
      eyebrow="Court result"
      onBack={() => router.back()}
      title="Result calculated."
      subtitle="The result is visible now. Payout and trust changes wait for settlement."
    >
      <View style={styles.hero}>
        <Trophy color={colors.warning} size={34} />
        <StatusBadge label={formatStatus(currentStatus)} tone={getStatusTone(currentStatus)} />
        <Text style={styles.title}>{resultTitle}</Text>
        <Text style={styles.body}>{resultBody}</Text>
        <Text style={styles.body}>Score {nextScoreA} - {nextScoreB}</Text>
        <View style={styles.revealChip}>
          <Sparkles color={colors.success} size={14} />
          <Text style={styles.revealText}>{currentStatus === 'settled' ? 'Trust update settled' : 'Trust update pending settlement'}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <ResultLine label="Winner" value={winnerId ? 'Confirmed by server' : 'Pending server confirmation'} />
        <ResultLine label="Resolution" value={formatResolution(session.resolutionType)} />
        {session.resolutionType !== 'answer_key' ? (
          <ResultLine label="Result claims" value={`${session.resultClaims.claimsCount}/2 submitted`} />
        ) : null}
        {session.resolutionType === 'evidence' || submittedEvidenceCount > 0 ? (
          <ResultLine
            label="Evidence"
            value={evidenceObjectId ? `Submitted ${shortId(evidenceObjectId)}` : `${submittedEvidenceCount} uploaded`}
          />
        ) : null}
        {activeJuryCaseId ? (
          <ResultLine label="Jury case" value={`${shortId(activeJuryCaseId)} - ${formatStatus(session.juryCase?.status ?? 'filed')}`} />
        ) : null}
        <View style={styles.moneyLine}>
          <Text style={styles.label}>Pot</Text>
          <MoneyAmount amountKobo={session.potKobo} tone="locked" />
        </View>
        <ResultLine label="Dispute window" value="Open after result" />
      </View>

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="View settlement status"
          icon={<Scale color={colors.text} size={18} />}
          label="Settlement status"
          onPress={() => router.push({
            pathname: '/court/settlement-status',
            params: { dareId },
          })}
        />
        {currentStatus === 'dispute_pending' || currentStatus === 'jury_open' || activeJuryCaseId ? (
          <ActionButton
            accessibilityLabel="View dispute status"
            icon={<ShieldAlert color={colors.text} size={18} />}
            label="Dispute status"
            onPress={() => router.push({
              pathname: '/disputes/status',
              params: { dareId, juryCaseId: activeJuryCaseId },
            })}
            variant="secondary"
          />
        ) : currentStatus !== 'settled' ? (
          <ActionButton
            accessibilityLabel="File dispute"
            icon={<ShieldAlert color={colors.text} size={18} />}
            label="File dispute"
            onPress={() => router.push({
              pathname: '/disputes/file',
              params: { dareId },
            })}
            variant="secondary"
          />
        ) : null}
      </View>
    </CourtFlowFrame>
  );
}

function formatClaimState(value: string) {
  if (value === 'agreed') return 'Claims agreed';
  if (value === 'conflicted') return 'Claims conflict';
  if (value === 'dispute_requested') return 'Dispute requested';
  return 'Claim recorded';
}

function getResultTitle(status: string, claimState?: string) {
  if (status === 'settled') return 'Settlement complete';
  if (status === 'dispute_pending') return 'Dispute opened';
  if (status === 'jury_open') return 'Jury review open';
  if (status === 'settlement_pending' || status === 'completed') return 'Server result recorded';
  if (claimState) return formatClaimState(claimState);
  return 'Awaiting final result';
}

function getResultBody(status: string, claimState: string | undefined, claimsCount: number) {
  if (status === 'dispute_pending') return 'Evidence and result claims are paused for dispute review.';
  if (status === 'jury_open') return 'Jurors are reviewing the submitted evidence packet.';
  if (status === 'settled') return 'Payout and trust updates have been finalized.';
  if (claimState === 'pending') return `Your result claim is recorded. Claims submitted: ${claimsCount}/2.`;
  return 'The result is visible now. Payout and trust changes wait for settlement.';
}

function getStatusTone(status: string) {
  if (status === 'settled' || status === 'completed' || status === 'settlement_pending') return 'success';
  if (status === 'dispute_pending' || status === 'jury_open') return 'warning';
  return 'neutral';
}

function formatStatus(value: string) {
  return value.replace(/[_-]/g, ' ').toUpperCase();
}

function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function formatResolution(value: typeof activeCourtSession.resolutionType) {
  if (value === 'answer_key') return 'Answer Key';
  if (value === 'witnessed') return 'Witnessed';
  return 'Evidence';
}

function ResultLine({ label, value }: { label: string; value: string }) {
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
    backgroundColor: colors.successDim,
    borderColor: colors.success,
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
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
  },
  revealChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[6],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
  },
  revealText: {
    color: colors.textSoft,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing[16],
  },
  line: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    minHeight: 44,
  },
  moneyLine: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    minHeight: 44,
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
  actions: {
    gap: spacing[10],
  },
});
