import { ReactNode } from 'react';
import { ShieldCheck, TrendingUp, Users } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';
import type { LivePulseStats } from '../livePulseStats';

type LivePulsePanelProps = {
  loading: boolean;
  stats: LivePulseStats;
};

export function LivePulsePanel({ loading, stats }: LivePulsePanelProps) {
  const badge = getPulseBadge(stats, loading);
  const hasLiveActivity = !loading && stats.liveCount > 0;

  return (
    <View style={styles.livePanel}>
      <View style={styles.liveHeader}>
        <View style={styles.liveTitleRow}>
          <View style={[styles.liveDot, hasLiveActivity ? styles.liveDotActive : styles.liveDotIdle]} />
          <Text style={styles.liveTitle}>Live pulse</Text>
        </View>
        <StatusBadge label={badge.label} tone={badge.tone} />
      </View>
      <View style={styles.pulseGrid}>
        <PulseStat icon={<Users color={colors.info} size={16} />} label="Live" value={formatCount(stats.liveCount)} />
        <PulseStat icon={<TrendingUp color={colors.success} size={16} />} label="Open" value={formatCount(stats.openCount)} />
        <PulseStat icon={<ShieldCheck color={colors.warning} size={16} />} label="Resolved" value={formatCount(stats.resolvedCount)} />
      </View>
      {!loading && stats.totalCount === 0 ? (
        <Text style={styles.emptyText}>No public DARE activity yet.</Text>
      ) : null}
    </View>
  );
}

function PulseStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.pulseStat}>
      {icon}
      <Text style={styles.pulseValue}>{value}</Text>
      <Text style={styles.pulseLabel}>{label}</Text>
    </View>
  );
}

function getPulseBadge(stats: LivePulseStats, loading: boolean): { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' } {
  if (loading) return { label: 'SYNC', tone: 'info' };
  if (stats.liveCount > 0) return { label: 'LIVE', tone: 'danger' };
  if (stats.openCount > 0) return { label: 'OPEN', tone: 'success' };
  if (stats.totalCount > 0) return { label: 'HISTORY', tone: 'neutral' };
  return { label: 'QUIET', tone: 'neutral' };
}

function formatCount(value: number) {
  return value.toLocaleString();
}

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  liveDot: {
    borderRadius: radius.pill,
    height: 9,
    width: 9,
  },
  liveDotActive: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  liveDotIdle: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  liveHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  livePanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[14],
  },
  liveTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    fontWeight: '900',
  },
  liveTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  pulseGrid: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  pulseLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 9,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  pulseStat: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
    padding: spacing[10],
  },
  pulseValue: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    fontWeight: '900',
  },
});
