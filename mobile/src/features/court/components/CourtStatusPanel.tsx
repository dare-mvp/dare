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
      <View style={styles.row}>
        <Text style={styles.label}>DARE status</Text>
        <StatusBadge label={formatStatus(session.status)} tone={getStatusTone(session.status)} />
      </View>
      {session.resolutionType === 'evidence' ? (
        <View style={styles.row}>
          <Text style={styles.label}>Evidence</Text>
          <Text style={styles.value}>{session.evidence.uploadedCount} uploaded</Text>
        </View>
      ) : null}
      {session.resolutionType !== 'answer_key' ? (
        <View style={styles.row}>
          <Text style={styles.label}>Result claims</Text>
          <Text style={styles.value}>{session.resultClaims.claimsCount}/2</Text>
        </View>
      ) : null}
      {session.juryCase ? (
        <View style={styles.row}>
          <Text style={styles.label}>Jury</Text>
          <Text style={styles.value}>{formatStatus(session.juryCase.status)}</Text>
        </View>
      ) : null}
      <Text style={styles.note}>
        {getStatusNote(session)}
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
  awaiting_result: 'Awaiting result',
  countdown: 'Countdown',
  disputed: 'Dispute review',
  ready: 'Ready-up',
  settled: 'Settled',
  settlement_pending: 'Settlement pending',
} as const;

function getStatusTone(status: CourtSession['status']) {
  if (status === 'settled' || status === 'completed') return 'success';
  if (status === 'dispute_pending' || status === 'jury_open') return 'warning';
  if (status === 'forfeited') return 'danger';
  return 'neutral';
}

function formatStatus(value: string) {
  return value.replace(/[_-]/g, ' ').toUpperCase();
}

function getStatusNote(session: CourtSession) {
  if (session.status === 'dispute_pending') {
    return 'Settlement is paused while the dispute packet is prepared for review.';
  }
  if (session.status === 'jury_open') {
    return 'Settlement is paused while jurors review the submitted evidence.';
  }
  if (session.status === 'settlement_pending' || session.status === 'completed') {
    return 'The result is recorded. Payouts and trust changes stay pending until settlement is confirmed.';
  }
  if (session.status === 'settled') {
    return 'Settlement is complete. Payout and trust updates have moved out of Court review.';
  }
  return 'If heartbeat stops, the match may move into reconnect or forfeit review. Payouts and trust changes stay pending until settlement is confirmed.';
}

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
