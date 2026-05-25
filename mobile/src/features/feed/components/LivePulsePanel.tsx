import { ReactNode } from 'react';
import { ShieldCheck, TrendingUp, Users } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';

export function LivePulsePanel() {
  return (
    <View style={styles.livePanel}>
      <View style={styles.liveHeader}>
        <View style={styles.liveTitleRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTitle}>Live pulse</Text>
        </View>
        <StatusBadge label="HOT" tone="danger" />
      </View>
      <View style={styles.pulseGrid}>
        <PulseStat icon={<Users color={colors.info} size={16} />} label="Watching" value="60" />
        <PulseStat icon={<TrendingUp color={colors.success} size={16} />} label="Rising" value="3" />
        <PulseStat icon={<ShieldCheck color={colors.warning} size={16} />} label="Clean streak" value="7d" />
      </View>
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

const styles = StyleSheet.create({
  liveDot: {
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    height: 9,
    shadowColor: colors.danger,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    width: 9,
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
