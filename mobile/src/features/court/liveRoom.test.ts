import { getCourtLiveRoom } from './liveRoom';
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

testActiveRoomMeetsRequirement();
testReconnectingRoomLocksRequirement();
testEvidenceRecordingIsRequired();
