import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';
import { RecentChallenge } from '../types';

type RecentChallengesPanelProps = {
  challenges: RecentChallenge[];
};

const resultTone = {
  disputed: 'warning',
  live: 'danger',
  loss: 'danger',
  open: 'info',
  win: 'success',
} as const;

export function RecentChallengesPanel({ challenges }: RecentChallengesPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Recent Challenges</Text>
      {challenges.map((challenge) => (
        <View key={challenge.id} style={styles.row}>
          <View style={styles.rowCopy}>
            <Text numberOfLines={1} style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.meta}>vs {challenge.opponent} - {challenge.when} - {challenge.stakeLabel}</Text>
          </View>
          <StatusBadge label={challenge.result.toUpperCase()} tone={resultTone[challenge.result]} />
        </View>
      ))}
    </View>
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
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    paddingTop: spacing[12],
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  challengeTitle: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    marginTop: spacing[4],
  },
});
