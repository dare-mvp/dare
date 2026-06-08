import { useRouter } from 'expo-router';
import { ArrowRight, Clock3, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { JuryFlowFrame } from '../../src/features/jury/components/JuryFlowFrame';
import { useJuryAssignment } from '../../src/features/jury/useJuryAssignment';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function JuryAssignmentScreen() {
  const router = useRouter();
  const { assignment, error, loading } = useJuryAssignment();

  return (
    <JuryFlowFrame
      eyebrow="Assignment"
      onBack={() => router.back()}
      title="Review this case?"
      subtitle="Accept only if you can vote before the assignment expires."
    >
      {assignment?.source === 'mock' && !error ? (
        <InlineAlert
          tone="info"
          title={loading ? 'Syncing assignment' : 'Preview assignment'}
          message={loading ? 'Checking for live jury assignments.' : 'Live assignment details appear after sign-in and sync.'}
        />
      ) : null}

      {error ? (
        <InlineAlert
          tone="danger"
          title="Assignment unavailable"
          message={error}
        />
      ) : null}

      {!assignment && !loading ? (
        <ErrorState
          body="No jury assignment is waiting for your vote right now."
          onRetry={() => router.replace('/jury')}
          retryLabel="Back to jury"
          title="No assignment"
        />
      ) : null}

      {assignment ? (
        <View style={styles.card}>
          <View style={styles.header}>
            <StatusBadge label={assignment.category.toUpperCase()} tone="neutral" />
            <Text style={styles.reward}>{assignment.rewardLabel}</Text>
          </View>
          <Text style={styles.title}>{assignment.title}</Text>
          <View style={styles.statusRow}>
            <StatusBadge label={formatLabel(assignment.status).toUpperCase()} tone="info" />
            <Text style={styles.votesNeeded}>{assignment.votesNeeded} votes needed</Text>
          </View>
          <View style={styles.metaRow}>
            <Clock3 color={colors.warning} size={18} />
            <Text style={styles.meta}>{assignment.dueLabel}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.panel}>
        <CheckLine text="Packets are anonymized as A and B." />
        <CheckLine text="Do not vote if you recognize a participant." />
        <CheckLine text="Expired assignments can reduce trust." />
      </View>

      <InlineAlert
        tone="warning"
        title="Collusion checks apply"
        message="Only continue if you have no relationship with either side of the case."
      />

      <ActionButton
        accessibilityLabel="Accept jury assignment"
        disabled={!assignment}
        icon={<ArrowRight color={colors.text} size={18} />}
        label="Accept assignment"
        onPress={() => {
          if (!assignment) return;
          router.push({
            pathname: '/jury/vote',
            params: { caseId: assignment.caseId },
          });
        }}
      />
    </JuryFlowFrame>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <View style={styles.checkLine}>
      <ShieldCheck color={colors.success} size={17} />
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

function formatLabel(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reward: {
    color: colors.warning,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  metaRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    paddingTop: spacing[12],
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  votesNeeded: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  checkLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
  },
  checkText: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
});
