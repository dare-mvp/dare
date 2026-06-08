import { Check, CircleAlert, Trophy } from 'lucide-react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { CourtSession } from '../types';

type ResultClaimOutcome = 'challenger_won' | 'dispute' | 'issuer_won' | 'performer_completed' | 'void';

type ResultClaimPanelProps = {
  onChangeRationale: (value: string) => void;
  onSubmit: (outcome: ResultClaimOutcome) => void;
  rationale: string;
  session: CourtSession;
  submitting: boolean;
};

export function ResultClaimPanel({
  onChangeRationale,
  onSubmit,
  rationale,
  session,
  submitting,
}: ResultClaimPanelProps) {
  const isTask = session.dareType === 'task';
  const isEvidence = session.resolutionType === 'evidence';

  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>{formatResolution(session.resolutionType)}</Text>
      <Text style={styles.title}>{getTitle(session)}</Text>
      <Text style={styles.body}>{getBody(session)}</Text>

      {session.resolutionType === 'witnessed' ? (
        <View style={styles.voteRow}>
          <Text style={styles.voteText}>Witness votes A: {session.votesA}</Text>
          <Text style={styles.voteText}>B: {session.votesB}</Text>
        </View>
      ) : null}

      <TextInput
        accessibilityLabel="Result rationale"
        multiline
        onChangeText={onChangeRationale}
        placeholder={isEvidence ? 'Summarize what your evidence proves' : 'Summarize the witnessed outcome'}
        placeholderTextColor={colors.textGhost}
        style={styles.input}
        textAlignVertical="top"
        value={rationale}
      />

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel={isTask ? 'Claim performer completed task' : 'Claim player A won'}
          disabled={submitting}
          icon={<Trophy color={colors.text} size={18} />}
          label={isTask ? 'Performer completed' : 'Player A won'}
          onPress={() => onSubmit(isTask ? 'performer_completed' : 'issuer_won')}
        />
        {!isTask ? (
          <ActionButton
            accessibilityLabel="Claim player B won"
            disabled={submitting}
            icon={<Check color={colors.text} size={18} />}
            label="Player B won"
            onPress={() => onSubmit('challenger_won')}
            variant="secondary"
          />
        ) : null}
        <ActionButton
          accessibilityLabel="Claim no valid result"
          disabled={submitting}
          icon={<CircleAlert color={colors.text} size={18} />}
          label="No valid result"
          onPress={() => onSubmit('void')}
          variant="secondary"
        />
        <ActionButton
          accessibilityLabel="Dispute result"
          disabled={submitting}
          icon={<CircleAlert color={colors.text} size={18} />}
          label="Dispute"
          onPress={() => onSubmit('dispute')}
          variant="secondary"
        />
      </View>
    </View>
  );
}

function getTitle(session: CourtSession) {
  if (session.resolutionType === 'evidence') return 'Submit the result with evidence.';
  return 'Submit the participant result claim.';
}

function getBody(session: CourtSession) {
  if (session.resolutionType === 'evidence') {
    return 'Upload evidence first when claiming completion or a winner. Conflicting claims move to dispute review.';
  }
  return 'Use this only if you are one of the DARE participants. Witnesses should vote from the audience controls.';
}

function formatResolution(value: CourtSession['resolutionType']) {
  if (value === 'answer_key') return 'Answer Key';
  if (value === 'evidence') return 'Evidence';
  return 'Witnessed';
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
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    minHeight: 74,
    padding: spacing[12],
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
  title: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '900',
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
