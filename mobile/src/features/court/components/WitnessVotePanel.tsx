import { CheckCircle2, Radio } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { CourtSession } from '../types';

type WitnessVote = 'A' | 'B';

type WitnessVotePanelProps = {
  disabled: boolean;
  onVote: (vote: WitnessVote) => void;
  session: CourtSession;
  submitting: boolean;
  witnessEligible: boolean;
  votedFor: WitnessVote | null;
};

export function WitnessVotePanel({
  disabled,
  onVote,
  session,
  submitting,
  witnessEligible,
  votedFor,
}: WitnessVotePanelProps) {
  const hasVoted = votedFor !== null;
  const voteDisabled = disabled || !witnessEligible || hasVoted || submitting;
  const playerALabel = formatPlayerLabel(session.playerA.name, 'Player A');
  const playerBLabel = formatPlayerLabel(session.playerB.name, 'Player B');

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Radio color={colors.primary} size={18} />
        <Text style={styles.kicker}>Witness vote</Text>
      </View>
      <Text style={styles.title}>Confirm what you watched.</Text>
      <Text style={styles.body}>
        Vote only if you were present for the live attempt. Your vote helps resolve the DARE under the witnessed rules.
      </Text>
      {!witnessEligible && !hasVoted ? (
        <Text style={styles.waitingText}>Stay in the live Court a little longer before voting.</Text>
      ) : null}

      <View style={styles.voteRow}>
        <Text style={styles.voteText}>Player A votes: {session.votesA}</Text>
        <Text style={styles.voteText}>Player B votes: {session.votesB}</Text>
      </View>

      {hasVoted ? (
        <View style={styles.submittedBox}>
          <CheckCircle2 color={colors.success} size={16} />
          <Text style={styles.submittedText}>
            Vote submitted for {votedFor === 'A' ? playerALabel : playerBLabel}.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel={`Vote for ${playerALabel}`}
          disabled={voteDisabled}
          icon={<CheckCircle2 color={colors.text} size={18} />}
          label={submitting ? 'Submitting' : 'Vote Player A'}
          onPress={() => onVote('A')}
        />
        <ActionButton
          accessibilityLabel={`Vote for ${playerBLabel}`}
          disabled={voteDisabled}
          icon={<CheckCircle2 color={colors.text} size={18} />}
          label="Vote Player B"
          onPress={() => onVote('B')}
          variant="secondary"
        />
      </View>
    </View>
  );
}

function formatPlayerLabel(name: string, fallback: string) {
  const trimmed = name.trim();
  return trimmed && trimmed !== 'You' ? trimmed : fallback;
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing[8],
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  kicker: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  panel: {
    backgroundColor: colors.black,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  submittedBox: {
    alignItems: 'center',
    backgroundColor: colors.successDim,
    borderColor: colors.success,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    padding: spacing[10],
  },
  submittedText: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '900',
  },
  waitingText: {
    color: colors.warning,
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  voteRow: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing[10],
  },
  voteText: {
    color: colors.textSoft,
    fontFamily: fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
});
