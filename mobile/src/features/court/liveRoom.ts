import type { LiveCourtStateResponse } from '../../lib/actions/endpoints';
import type { CourtLiveParticipant, CourtLiveRoom, CourtSession } from './types';

type CourtSessionLiveInput = Omit<CourtSession, 'liveRoom'> & {
  liveRoom?: CourtLiveRoom;
};

const providerLabels: Record<LiveCourtStateResponse['provider'], string> = {
  agora: 'Agora video',
  custom: 'Custom video',
  daily: 'Daily video',
  livekit: 'LiveKit video',
  mux: 'Mux live video',
  provider_pending: 'Video provider pending',
};

export function withCourtLiveRoom<TSession extends CourtSessionLiveInput>(
  session: TSession,
  liveState?: LiveCourtStateResponse | null,
): TSession & { liveRoom: CourtLiveRoom } {
  return {
    ...session,
    liveRoom: getCourtLiveRoom(session, liveState),
  };
}

export function getCourtLiveRoom(
  session: CourtSessionLiveInput,
  liveState?: LiveCourtStateResponse | null,
): CourtLiveRoom {
  const canEnter = isEnterablePhase(session.phase) && session.connectionState !== 'offline';
  const participants: [CourtLiveParticipant, CourtLiveParticipant] = [
    {
      isYou: session.playerA.isYou,
      label: session.playerA.name,
      role: 'issuer',
      state: liveState
        ? getServerParticipantState(liveState.issuerLive, liveState.roomStatus)
        : getParticipantState(session, session.playerA.isReady, session.playerA.isYou),
    },
    {
      isYou: session.playerB.isYou,
      label: session.playerB.name,
      role: session.dareType === 'task' ? 'performer' : 'challenger',
      state: liveState
        ? getServerParticipantState(liveState.challengerLive, liveState.roomStatus)
        : getParticipantState(session, session.playerB.isReady, session.playerB.isYou),
    },
  ];
  const bothParticipantsLive = participants.every((participant) => participant.state === 'live');
  const roomId = liveState?.providerRoomId ?? (session.dareId ? `court-${session.dareId.slice(0, 8)}` : 'court-preview');
  const status = liveState ? getServerRoomStatus(liveState, session) : getRoomStatus(session, canEnter, bothParticipantsLive);
  const recordingRequired = liveState?.recordingRequired ?? session.resolutionType === 'evidence';
  const recordingActive = liveState
    ? liveState.recordingStatus === 'recording' || liveState.recordingStatus === 'available'
    : recordingRequired && status === 'live' && isPerformancePhase(session.phase);
  const requirementMet = liveState
    ? liveState.liveRequirementMet
    : status === 'live' && bothParticipantsLive && (!recordingRequired || recordingActive);
  const statusReason = getStatusReason({
    bothParticipantsLive,
    liveState,
    recordingActive,
    recordingRequired,
    requirementMet,
    session,
    status,
  });

  return {
    audienceCount: liveState?.spectatorCount ?? session.spectators,
    audienceState: getAudienceState(session, liveState),
    canEnter,
    participants,
    providerLabel: liveState ? providerLabels[liveState.provider] : 'Preview video room',
    recording: {
      active: recordingActive,
      label: getRecordingLabel(recordingRequired, recordingActive, status, liveState?.recordingStatus),
      required: recordingRequired,
    },
    requirementLabel: getRequirementLabel(
      session,
      status,
      bothParticipantsLive,
      recordingRequired,
      recordingActive,
      liveState,
      statusReason,
    ),
    requirementMet,
    roomId,
    statusReason,
    status,
    viewerJoined: liveState?.viewerJoined ?? canEnter,
  };
}

function getParticipantState(
  session: CourtSessionLiveInput,
  isReady: boolean,
  isYou?: boolean,
): CourtLiveParticipant['state'] {
  if (isYou && session.connectionState !== 'connected') return 'reconnecting';
  if (isPerformancePhase(session.phase) || session.phase === 'countdown') return 'live';
  return isReady ? 'live' : 'waiting';
}

function getRoomStatus(
  session: CourtSessionLiveInput,
  canEnter: boolean,
  bothParticipantsLive: boolean,
): CourtLiveRoom['status'] {
  if (!canEnter) return 'closed';
  if (session.connectionState !== 'connected') return 'reconnecting';
  if (bothParticipantsLive && (session.phase === 'countdown' || isPerformancePhase(session.phase))) return 'live';
  return 'initializing';
}

function getServerParticipantState(
  isLive: boolean,
  roomStatus: LiveCourtStateResponse['roomStatus'],
): CourtLiveParticipant['state'] {
  if (isLive) return 'live';
  if (roomStatus === 'live') return 'camera_missing';
  return 'waiting';
}

function getServerRoomStatus(
  liveState: LiveCourtStateResponse,
  session: CourtSessionLiveInput,
): CourtLiveRoom['status'] {
  if (liveState.roomStatus === 'cancelled' || liveState.roomStatus === 'ended') return 'closed';
  if (session.connectionState !== 'connected') return 'reconnecting';
  if (liveState.roomStatus === 'live') return 'live';
  return 'initializing';
}

function getAudienceState(
  session: CourtSessionLiveInput,
  liveState?: LiveCourtStateResponse | null,
): CourtLiveRoom['audienceState'] {
  if (liveState?.viewerRole === 'spectator' && liveState.viewerJoined) return 'watching';
  if (!isEnterablePhase(session.phase)) return 'closed';
  if (session.viewerRole === 'spectator' && session.connectionState === 'connected') return 'watching';
  const audienceCount = liveState?.spectatorCount ?? session.spectators;
  return audienceCount > 0 ? 'watching' : 'waiting';
}

function getRecordingLabel(
  required: boolean,
  active: boolean,
  status: CourtLiveRoom['status'],
  recordingStatus?: LiveCourtStateResponse['recordingStatus'],
) {
  if (!required) return 'Not required';
  if (recordingStatus === 'disabled') return 'Consent missing';
  if (recordingStatus === 'available') return 'Recording available';
  if (recordingStatus === 'processing') return 'Recording processing';
  if (recordingStatus === 'failed') return 'Recording needs review';
  if (active) return 'Court recording live';
  if (status === 'reconnecting') return 'Recording paused';
  return 'Recording standby';
}

function getRequirementLabel(
  session: CourtSessionLiveInput,
  status: CourtLiveRoom['status'],
  bothParticipantsLive: boolean,
  recordingRequired: boolean,
  recordingActive: boolean,
  liveState?: LiveCourtStateResponse | null,
  statusReason?: CourtLiveRoom['statusReason'],
) {
  if (status === 'closed') return 'Live room is closed for this Court state.';
  if (status === 'reconnecting') return 'Result actions locked until the live video room reconnects.';
  if (statusReason === 'viewer_not_joined') {
    return 'LiveKit room is created, but this device has not joined yet.';
  }
  if (statusReason === 'participant_not_joined') {
    return 'LiveKit room is created. Waiting for both participants to join.';
  }
  if (statusReason === 'webhook_pending') {
    return 'LiveKit is connected. Waiting for provider confirmation before Court actions unlock.';
  }
  if (statusReason === 'camera_not_detected') {
    return `Camera not detected for ${formatMissingParticipants(liveState, session)}.`;
  }
  if (statusReason === 'waiting_participants') {
    return 'Waiting for both participants to be live on video.';
  }
  if (statusReason === 'recording_consent_missing') {
    return 'Recording consent is missing, so evidence actions remain locked.';
  }
  if (statusReason === 'recording_pending') {
    return 'Evidence actions locked until Court recording is active.';
  }
  if (statusReason === 'ready') return 'Live room ready for countdown.';
  if (!bothParticipantsLive) return 'Waiting for both participants to be live on video.';
  if (recordingRequired && !recordingActive) return 'Evidence actions locked until Court recording is active.';
  return 'Live video requirement met.';
}

function getStatusReason({
  bothParticipantsLive,
  liveState,
  recordingActive,
  recordingRequired,
  requirementMet,
  session,
  status,
}: {
  bothParticipantsLive: boolean;
  liveState?: LiveCourtStateResponse | null;
  recordingActive: boolean;
  recordingRequired: boolean;
  requirementMet: boolean;
  session: CourtSessionLiveInput;
  status: CourtLiveRoom['status'];
}): CourtLiveRoom['statusReason'] {
  if (status === 'closed') return 'closed';
  if (status === 'reconnecting') return 'reconnecting';
  if (requirementMet) return 'requirement_met';
  if (liveState?.provider === 'livekit' && liveState.roomStatus === 'created' && !liveState.viewerJoined) {
    return 'viewer_not_joined';
  }
  if (liveState?.provider === 'livekit' && liveState.roomStatus === 'created' && liveState.participantCount < 2) {
    return 'participant_not_joined';
  }
  if (liveState?.provider === 'livekit' && liveState.roomStatus === 'created' && liveState.viewerJoined) {
    return 'webhook_pending';
  }
  if (liveState?.roomStatus === 'live' && !bothParticipantsLive) return 'camera_not_detected';
  if (!bothParticipantsLive) return 'waiting_participants';
  if (recordingRequired && liveState?.recordingStatus === 'disabled') return 'recording_consent_missing';
  if (recordingRequired && !recordingActive) return 'recording_pending';
  if (status === 'initializing' && bothParticipantsLive) return 'ready';
  if (isEnterablePhase(session.phase)) return 'ready';
  return 'waiting_participants';
}

function formatMissingParticipants(
  liveState: LiveCourtStateResponse | null | undefined,
  session: CourtSessionLiveInput,
) {
  const missing = [
    liveState?.issuerLive ? null : session.playerA.isYou ? 'you' : session.playerA.name,
    liveState?.challengerLive ? null : session.playerB.isYou ? 'you' : session.playerB.name,
  ].filter(Boolean);

  if (missing.length === 0) return 'a participant';
  if (missing.length === 1) return missing[0];
  return 'both participants';
}

function isEnterablePhase(phase: CourtSession['phase']) {
  return phase === 'ready' || phase === 'countdown' || phase === 'active' || phase === 'awaiting_result';
}

function isPerformancePhase(phase: CourtSession['phase']) {
  return phase === 'active' || phase === 'awaiting_result';
}
