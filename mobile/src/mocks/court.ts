import { CourtSession } from '../features/court/types';
import { withCourtLiveRoom } from '../features/court/liveRoom';

const activeCourtSessionBase: Omit<CourtSession, 'liveRoom'> = {
  challengeType: 'Answer Key court - Issuer vs Challenger',
  connectionState: 'connected',
  dareType: 'skill',
  evidence: {
    latestSubmittedAt: null,
    submittedCount: 0,
    totalCount: 0,
    uploadedCount: 0,
    viewerSubmittedCount: 0,
  },
  heartbeatAgeSeconds: 4,
  juryCase: null,
  phase: 'active',
  playerA: {
    accent: 'ember',
    isReady: true,
    isYou: true,
    name: 'Kade',
    score: 3,
    tier: 'Champion',
    trustScore: 820,
  },
  playerB: {
    accent: 'ice',
    isReady: true,
    name: 'Tomi',
    score: 2,
    tier: 'Riser',
    trustScore: 240,
  },
  potKobo: 500000,
  question: {
    id: 'q1',
    options: [],
    prompt: 'Creator prompt: name the Nigerian city known as the Centre of Excellence.',
    selectedOption: undefined,
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
  spectators: 18,
  timeRemainingSeconds: 72,
  title: 'Premier League knowledge DARE in court mode',
  viewerRole: 'participant_a',
  votesA: 0,
  votesB: 0,
};

export const activeCourtSession: CourtSession = withCourtLiveRoom(activeCourtSessionBase);
