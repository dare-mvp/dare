import type { ReactNode } from 'react';
import { CheckCircle2, RadioTower, TrendingUp } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../../theme/tokens';
import type { SocialProofSummary } from '../socialProof';
import type { SocialProofActivityResponse } from '../../../lib/actions/endpoints';

type SocialProofPanelProps = {
  loading: boolean;
  recentSettlements?: SocialProofActivityResponse['recentSettlements'];
  summary: SocialProofSummary | null | undefined;
};

export function SocialProofPanel({ loading, recentSettlements = [], summary }: SocialProofPanelProps) {
  const safeSummary = summary ?? {
    activeCourts: 0,
    completedDares: 0,
    openDares: 0,
    topCategory: null,
    topTrustedPlayer: null,
  };
  const latestSettlement = recentSettlements[0] ?? null;

  if (loading) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Confirmed activity</Text>
        <Text style={styles.emptyText}>Syncing public DARE activity.</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Confirmed activity</Text>
      <View style={styles.grid}>
        <ProofStat icon={<TrendingUp color={colors.success} size={15} />} label="Open" value={formatCount(safeSummary.openDares)} />
        <ProofStat icon={<RadioTower color={colors.danger} size={15} />} label="Court" value={formatCount(safeSummary.activeCourts)} />
        <ProofStat icon={<CheckCircle2 color={colors.warning} size={15} />} label="Complete" value={formatCount(safeSummary.completedDares)} />
      </View>
      <View style={styles.footer}>
        {latestSettlement ? (
          <Text numberOfLines={1} style={styles.footerText}>
            {`${latestSettlement.label}: ${latestSettlement.title}${latestSettlement.amountLabel ? ` - ${latestSettlement.amountLabel}` : ''}`}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={styles.footerText}>
          {safeSummary.topCategory ? `Trending: ${safeSummary.topCategory}` : 'Trending categories appear after public activity.'}
        </Text>
        <Text numberOfLines={1} style={styles.footerText}>
          {safeSummary.topTrustedPlayer ? `Trusted: ${safeSummary.topTrustedPlayer.name} - ${formatCount(safeSummary.topTrustedPlayer.score)} pts` : 'Top trusted players appear after sync.'}
        </Text>
      </View>
    </View>
  );
}

function ProofStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatCount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value).toLocaleString() : '0';
}

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[4],
    paddingTop: spacing[10],
  },
  footerText: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[14],
  },
  stat: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
    padding: spacing[10],
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 17,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    fontWeight: '900',
  },
});
