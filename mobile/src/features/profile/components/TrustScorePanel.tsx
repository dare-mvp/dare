import { Flame, ShieldCheck, Trophy } from 'lucide-react-native';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../../theme/tokens';
import { ProgressBar } from '../../wallet/components/ProgressBar';
import { ProfileSummary } from '../types';

type TrustScorePanelProps = {
  profile: ProfileSummary;
};

export function TrustScorePanel({ profile }: TrustScorePanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Trust Score</Text>
      <Text style={styles.score}>{profile.trustScore}</Text>
      <ProgressBar color={colors.primary} value={Math.round((profile.trustScore / 999) * 100)} />
      <Text style={styles.meta}>{profile.pointsToNextTier} points to next tier - Max stake {profile.maxStakeLabel}</Text>
      <View style={styles.achievementRow}>
        <Achievement icon={<Flame color={colors.danger} size={16} />} label="Daily streak" value="7d" />
        <Achievement icon={<Trophy color={colors.warning} size={16} />} label="Wins" value={String(profile.wins)} />
        <Achievement icon={<ShieldCheck color={colors.success} size={16} />} label="Clean play" value="98%" />
      </View>
      <View style={styles.breakdown}>
        <BreakdownRow label="Court wins" value="+412" tone="positive" />
        <BreakdownRow label="Clean disputes" value="+96" tone="positive" />
        <BreakdownRow label="Forfeits" value="-12" tone="negative" />
      </View>
    </View>
  );
}

function BreakdownRow({ label, tone, value }: { label: string; tone: 'positive' | 'negative'; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, tone === 'positive' ? styles.positive : styles.negative]}>{value}</Text>
    </View>
  );
}

function Achievement({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.achievement}>
      {icon}
      <Text style={styles.achievementValue}>{value}</Text>
      <Text style={styles.achievementLabel}>{label}</Text>
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
  score: {
    color: colors.primary,
    fontFamily: fonts.display,
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 44,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  achievementRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  achievement: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
    padding: spacing[10],
  },
  achievementValue: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 15,
    fontWeight: '900',
  },
  achievementLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 9,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  breakdown: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[8],
    paddingTop: spacing[10],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  rowValue: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.danger,
  },
});
