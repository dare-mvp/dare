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
      state: liveState ? getServerParticipantState(liveState.issuerLive) : getParticipantState(session, session.playerA.isReady, session.playerA.isYou),
    },
    {
      isYou: session.playerB.isYou,
      label: session.playerB.name,
      role: session.dareType === 'task' ? 'performer' : 'challenger',
      state: liveState ? getServerParticipantState(liveState.challengerLive) : getParticipantState(session, session.playerB.isReady, session.playerB.isYou),
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
    ),
    requirementMet,
    roomId,
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

function getServerParticipantState(isLive: boolean): CourtLiveParticipant['state'] {
  return isLive ? 'live' : 'waiting';
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
) {
  if (status === 'closed') return 'Live room is closed for this Court state.';
  if (status === 'reconnecting') return 'Result actions locked until the live video room reconnects.';
  if (liveState && !liveState.viewerJoined) return 'Join the live video Court before taking Court actions.';
  if (status === 'initializing' && bothParticipantsLive) return 'Live room ready for countdown.';
  if (!bothParticipantsLive) return 'Result actions locked until both participants are live on video.';
  if (recordingRequired && !recordingActive) return 'Evidence actions locked until Court recording is active.';
  return 'Live video requirement met.';
}

function isEnterablePhase(phase: CourtSession['phase']) {
  return phase === 'ready' || phase === 'countdown' || phase === 'active' || phase === 'awaiting_result';
}

function isPerformancePhase(phase: CourtSession['phase']) {
  return phase === 'active' || phase === 'awaiting_result';
}
