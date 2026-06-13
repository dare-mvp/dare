import { CircleDot, Radio, Users, Video, VideoOff } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { LiveCourtStateResponse, RecordLiveCourtPresencePayload } from '../../../lib/actions/endpoints';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import type { CourtLiveParticipant, CourtLiveRoom } from '../types';
import { CourtLiveKitRoom } from './CourtLiveKitRoom';

type CourtLiveRoomPanelProps = {
  liveRoom: CourtLiveRoom;
  liveState?: LiveCourtStateResponse | null;
  onConnectionStatus?: (status: RecordLiveCourtPresencePayload['connectionStatus']) => void;
};

export function CourtLiveRoomPanel({ liveRoom, liveState, onConnectionStatus }: CourtLiveRoomPanelProps) {
  const statusCopy = getStatusCopy(liveRoom);
  const iconColor = liveRoom.status === 'live' ? colors.success : liveRoom.status === 'reconnecting' ? colors.warning : colors.textMuted;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Live video Court</Text>
          <Text style={styles.title}>{statusCopy.title}</Text>
        </View>
        <StatusBadge label={statusCopy.badge} tone={statusCopy.tone} />
      </View>

      <View style={styles.videoSurface} accessibilityLabel="Live video room surface">
        <View style={styles.videoHeader}>
          <View style={styles.roomIdRow}>
            {liveRoom.status === 'live' ? <Video color={iconColor} size={16} /> : <VideoOff color={iconColor} size={16} />}
            <Text numberOfLines={1} style={styles.roomId}>{liveRoom.roomId ?? 'Room pending'}</Text>
          </View>
          <Text style={styles.provider}>{liveRoom.providerLabel}</Text>
        </View>

        <CourtLiveKitRoom liveState={liveState ?? null} onConnectionStatus={onConnectionStatus} />

        <View style={styles.tileRow}>
          {liveRoom.participants.map((participant) => (
            <ParticipantTile key={participant.role} participant={participant} />
          ))}
        </View>
      </View>

      <View style={styles.stateGrid}>
        <StateCell
          icon={<Users color={colors.info} size={16} />}
          label="Audience"
          value={formatAudience(liveRoom)}
        />
        <StateCell
          icon={<CircleDot color={liveRoom.recording.active ? colors.danger : colors.textMuted} size={16} />}
          label="Court rec"
          value={liveRoom.recording.label}
        />
      </View>

      <View
        accessibilityRole="summary"
        style={[
          styles.requirementBox,
          liveRoom.requirementMet ? styles.requirementMet : styles.requirementWaiting,
        ]}
      >
        <Radio color={liveRoom.requirementMet ? colors.success : colors.warning} size={15} />
        <Text style={styles.requirementText}>{liveRoom.requirementLabel}</Text>
      </View>
    </View>
  );
}

function ParticipantTile({ participant }: { participant: CourtLiveParticipant }) {
  const stateCopy = getPresenceCopy(participant.state);

  return (
    <View style={styles.tile}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{participant.label.charAt(0).toUpperCase()}</Text>
      </View>
      <Text numberOfLines={1} style={styles.participantName}>
        {participant.label}{participant.isYou ? ' (You)' : ''}
      </Text>
      <Text style={styles.participantRole}>{formatRole(participant.role)}</Text>
      <StatusBadge label={stateCopy.label} tone={stateCopy.tone} />
    </View>
  );
}

function StateCell({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.stateCell}>
      <View style={styles.stateLabelRow}>
        {icon}
        <Text style={styles.stateLabel}>{label}</Text>
      </View>
      <Text style={styles.stateValue}>{value}</Text>
    </View>
  );
}

function getStatusCopy(liveRoom: CourtLiveRoom): {
  badge: string;
  title: string;
  tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning';
} {
  if (liveRoom.statusReason === 'requirement_met') return { badge: 'LIVE', title: 'Room active', tone: 'success' };
  if (liveRoom.statusReason === 'reconnecting') return { badge: 'RECONNECT', title: 'Room reconnecting', tone: 'warning' };
  if (liveRoom.statusReason === 'closed') return { badge: 'CLOSED', title: 'Room closed', tone: 'neutral' };
  if (liveRoom.statusReason === 'viewer_not_joined') return { badge: 'JOIN', title: 'Join required', tone: 'warning' };
  if (liveRoom.statusReason === 'participant_not_joined') return { badge: 'WAITING', title: 'Waiting for players', tone: 'warning' };
  if (liveRoom.statusReason === 'webhook_pending') return { badge: 'SYNCING', title: 'Provider confirming', tone: 'info' };
  if (liveRoom.statusReason === 'camera_not_detected') return { badge: 'CAMERA', title: 'Camera needed', tone: 'warning' };
  if (liveRoom.statusReason === 'waiting_participants') return { badge: 'WAITING', title: 'Waiting for both players', tone: 'warning' };
  if (liveRoom.statusReason === 'recording_consent_missing') return { badge: 'CONSENT', title: 'Recording consent needed', tone: 'warning' };
  if (liveRoom.statusReason === 'recording_pending') return { badge: 'REC', title: 'Recording pending', tone: 'warning' };
  return { badge: 'READY', title: 'Room ready', tone: 'info' };
}

function getPresenceCopy(state: CourtLiveParticipant['state']): {
  label: string;
  tone: 'success' | 'warning';
} {
  if (state === 'live') return { label: 'VIDEO LIVE', tone: 'success' };
  if (state === 'reconnecting') return { label: 'RECONNECTING', tone: 'warning' };
  if (state === 'camera_missing') return { label: 'CAMERA OFF', tone: 'warning' };
  return { label: 'WAITING', tone: 'warning' };
}

function formatAudience(liveRoom: CourtLiveRoom) {
  if (liveRoom.audienceState === 'closed') return 'Closed';
  if (liveRoom.audienceState === 'watching') return `${liveRoom.audienceCount} watching`;
  return 'Waiting';
}

function formatRole(role: CourtLiveParticipant['role']) {
  if (role === 'issuer') return 'Issuer';
  if (role === 'performer') return 'Performer';
  return 'Challenger';
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 17,
    fontWeight: '900',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
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
  participantName: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
    maxWidth: '100%',
  },
  participantRole: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  provider: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  requirementBox: {
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    padding: spacing[10],
  },
  requirementMet: {
    backgroundColor: colors.successDim,
    borderColor: colors.success,
  },
  requirementText: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  requirementWaiting: {
    backgroundColor: colors.warningDim,
    borderColor: colors.warning,
  },
  roomId: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  roomIdRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing[6],
    minWidth: 0,
  },
  stateCell: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flex: 1,
    gap: spacing[6],
    padding: spacing[10],
  },
  stateGrid: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  stateLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  stateLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[6],
  },
  stateValue: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flex: 1,
    gap: spacing[6],
    minWidth: 0,
    padding: spacing[10],
  },
  tileRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  title: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '900',
    marginTop: spacing[4],
  },
  videoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'space-between',
  },
  videoSurface: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    minHeight: 176,
    padding: spacing[12],
  },
});
