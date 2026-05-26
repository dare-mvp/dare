import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { CourtSession } from '../types';

type CourtStatusPanelProps = {
  session: CourtSession;
};

export function CourtStatusPanel({ session }: CourtStatusPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <Text style={styles.label}>Connection</Text>
        <StatusBadge label={connectionLabel[session.connectionState]} tone={connectionTone[session.connectionState]} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Heartbeat</Text>
        <Text style={styles.value}>{session.heartbeatAgeSeconds}s ago</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Court phase</Text>
        <Text style={styles.value}>{phaseLabel[session.phase]}</Text>
      </View>
      <Text style={styles.note}>
        If heartbeat stops, the match may move into reconnect or forfeit review. Payouts and trust changes stay pending until settlement is confirmed.
      </Text>
    </View>
  );
}

const connectionLabel = {
  connected: 'ONLINE',
  offline: 'OFFLINE',
  reconnecting: 'SYNCING',
} as const;

const connectionTone = {
  connected: 'success',
  offline: 'danger',
  reconnecting: 'warning',
} as const;

const phaseLabel = {
  active: 'Active challenge',
  countdown: 'Countdown',
  ready: 'Ready-up',
  settlement_pending: 'Settlement pending',
} as const;

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '900',
  },
  note: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    paddingTop: spacing[12],
  },
});
