import { getCourtLiveRoom } from './liveRoom';
import type { LiveCourtStateResponse } from '../../lib/actions/endpoints';
import type { CourtSession } from './types';

const baseSession: Omit<CourtSession, 'liveRoom'> = {
  challengeType: 'Skill DARE - Answer Key',
  connectionState: 'connected',
  dareId: '12345678-1234-1234-1234-123456789012',
  dareType: 'skill',
  evidence: {
    latestSubmittedAt: null,
    submittedCount: 0,
    totalCount: 0,
    uploadedCount: 0,
    viewerSubmittedCount: 0,
  },
  heartbeatAgeSeconds: 2,
  juryCase: null,
  phase: 'active',
  playerA: {
    accent: 'ember',
    isReady: true,
    isYou: true,
    name: 'You',
    score: 1,
    tier: 'Player A',
    trustScore: 0,
  },
  playerB: {
    accent: 'ice',
    isReady: true,
    name: 'Challenger',
    score: 0,
    tier: 'Player B',
    trustScore: 0,
  },
  potKobo: 100000,
  question: {
    id: 'question-1',
    options: [],
    prompt: 'Prompt',
  },
  resolutionType: 'answer_key',
  resultClaims: {
    claimsCount: 0,
    evidenceObjectCount: 0,
    latestClaimedOutcome: null,
    latestSubmittedAt: null,
    viewerClaimed: false,
  },
  status: 'active',
  spectators: 4,
  timeRemainingSeconds: 60,
  title: 'Court title',
  viewerRole: 'participant_a',
  votesA: 0,
  votesB: 0,
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testActiveRoomMeetsRequirement() {
  const liveRoom = getCourtLiveRoom(baseSession);

  assert(liveRoom.status === 'live', 'Active Court should expose a live room.');
  assert(liveRoom.requirementMet, 'Active Court with both players live should meet the requirement.');
}

function testReconnectingRoomLocksRequirement() {
  const liveRoom = getCourtLiveRoom({
    ...baseSession,
    connectionState: 'reconnecting',
  });

  assert(liveRoom.status === 'reconnecting', 'Reconnecting Court should show reconnecting room status.');
  assert(!liveRoom.requirementMet, 'Reconnecting Court should lock result actions.');
}

function testEvidenceRecordingIsRequired() {
  const liveRoom = getCourtLiveRoom({
    ...baseSession,
    resolutionType: 'evidence',
  });

  assert(liveRoom.recording.required, 'Evidence Court should require recording.');
  assert(liveRoom.recording.active, 'Evidence recording should be active during live play.');
  assert(liveRoom.requirementMet, 'Evidence Court should pass once live recording is active.');
}

function testLiveKitCreatedWithoutViewerJoinUsesJoinCopy() {
  const liveRoom = getCourtLiveRoom(baseSession, {
    ...baseLiveState,
    participantCount: 0,
    roomStatus: 'created',
    viewerJoined: false,
  });

  assert(liveRoom.statusReason === 'viewer_not_joined', 'Unjoined viewer should get explicit join state.');
  assert(
    liveRoom.requirementLabel.includes('this device has not joined'),
    'Unjoined viewer copy should explain the local join requirement.',
  );
  assert(!liveRoom.requirementMet, 'Unjoined live room should not meet requirements.');
}

function testLiveKitCreatedWithJoinedViewerWaitsForWebhook() {
  const liveRoom = getCourtLiveRoom(baseSession, {
    ...baseLiveState,
    challengerLive: false,
    issuerLive: false,
    participantCount: 2,
    roomStatus: 'created',
    viewerJoined: true,
  });

  assert(liveRoom.statusReason === 'webhook_pending', 'Created LiveKit room should wait for provider confirmation.');
  assert(
    liveRoom.requirementLabel.includes('provider confirmation'),
    'Webhook pending copy should mention provider confirmation.',
  );
}

function testLiveRoomCameraMissingCopy() {
  const liveRoom = getCourtLiveRoom(baseSession, {
    ...baseLiveState,
    challengerLive: false,
    issuerLive: true,
    liveRequirementMet: false,
    participantCount: 2,
    roomStatus: 'live',
  });

  assert(liveRoom.statusReason === 'camera_not_detected', 'Live room with missing participant video should show camera state.');
  assert(liveRoom.participants[1].state === 'camera_missing', 'Missing participant video should mark camera state.');
  assert(liveRoom.requirementLabel.includes('Camera not detected'), 'Requirement copy should mention the camera issue.');
}

function testRecordingConsentMissingCopy() {
  const liveRoom = getCourtLiveRoom({
    ...baseSession,
    resolutionType: 'evidence',
  }, {
    ...baseLiveState,
    liveRequirementMet: false,
    recordingRequired: true,
    recordingStatus: 'disabled',
  });

  assert(liveRoom.statusReason === 'recording_consent_missing', 'Disabled required recording should show consent state.');
  assert(liveRoom.recording.label === 'Consent missing', 'Recording label should explain missing consent.');
  assert(liveRoom.requirementLabel.includes('Recording consent'), 'Requirement copy should mention consent.');
}

const baseLiveState: LiveCourtStateResponse = {
  challengerLive: true,
  courtSessionId: 'court-session-1',
  dareId: '12345678-1234-1234-1234-123456789012',
  issuerLive: true,
  liveCourtRoomId: 'live-room-1',
  liveRequirementMet: true,
  participantCount: 2,
  provider: 'livekit',
  providerRoomId: 'court-room-1',
  providerToken: 'token',
  providerUrl: null,
  recordingRequired: false,
  recordingStatus: 'disabled',
  roomStatus: 'live',
  spectatorCount: 4,
  viewerJoined: true,
  viewerRole: 'participant_a',
};

testActiveRoomMeetsRequirement();
testReconnectingRoomLocksRequirement();
testEvidenceRecordingIsRequired();
testLiveKitCreatedWithoutViewerJoinUsesJoinCopy();
testLiveKitCreatedWithJoinedViewerWaitsForWebhook();
testLiveRoomCameraMissingCopy();
testRecordingConsentMissingCopy();
