export type CourtPlayer = {
  accent: 'ember' | 'info' | 'ice' | 'win';
  isReady: boolean;
  isYou?: boolean;
  name: string;
  score: number;
  tier: string;
  trustScore: number;
};

export type CourtQuestion = {
  id: string;
  options: string[];
  prompt: string;
  selectedOption?: string;
};

export type CourtDareStatus =
  | 'active'
  | 'awaiting_result'
  | 'completed'
  | 'dispute_pending'
  | 'forfeited'
  | 'jury_open'
  | 'open'
  | 'ready_check'
  | 'settled'
  | 'settlement_pending'
  | 'targeted_pending';

export type CourtEvidenceSummary = {
  latestSubmittedAt: string | null;
  submittedCount: number;
  totalCount: number;
  uploadedCount: number;
  viewerSubmittedCount: number;
};

export type CourtResultClaimSummary = {
  claimsCount: number;
  evidenceObjectCount: number;
  latestClaimedOutcome: string | null;
  latestSubmittedAt: string | null;
  viewerClaimed: boolean;
};

export type CourtJuryCaseSummary = {
  evidenceCount: number;
  id: string;
  openedAt: string;
  status: string;
  verdict: string | null;
  votesNeeded: number;
};

export type CourtLivePresenceState = 'camera_missing' | 'live' | 'waiting' | 'reconnecting';

export type CourtLiveParticipant = {
  isYou?: boolean;
  label: string;
  role: 'issuer' | 'challenger' | 'performer';
  state: CourtLivePresenceState;
};

export type CourtLiveRoom = {
  audienceCount: number;
  audienceState: 'watching' | 'waiting' | 'closed';
  canEnter: boolean;
  participants: [CourtLiveParticipant, CourtLiveParticipant];
  providerLabel: string;
  recording: {
    active: boolean;
    label: string;
    required: boolean;
  };
  requirementLabel: string;
  requirementMet: boolean;
  roomId: string | null;
  statusReason:
    | 'camera_not_detected'
    | 'closed'
    | 'participant_not_joined'
    | 'ready'
    | 'recording_consent_missing'
    | 'recording_pending'
    | 'reconnecting'
    | 'requirement_met'
    | 'viewer_not_joined'
    | 'waiting_participants'
    | 'webhook_pending';
  status: 'initializing' | 'live' | 'reconnecting' | 'closed';
  viewerJoined: boolean;
};

export type CourtSession = {
  challengeType: string;
  connectionState: 'connected' | 'reconnecting' | 'offline';
  dareId?: string;
  dareType: 'skill' | 'task';
  evidence: CourtEvidenceSummary;
  heartbeatAgeSeconds: number;
  juryCase: CourtJuryCaseSummary | null;
  liveRoom: CourtLiveRoom;
  phase: 'ready' | 'countdown' | 'active' | 'awaiting_result' | 'disputed' | 'settlement_pending' | 'settled';
  playerA: CourtPlayer;
  playerB: CourtPlayer;
  potKobo: number;
  question: CourtQuestion;
  resolutionType: 'answer_key' | 'witnessed' | 'evidence';
  resultClaims: CourtResultClaimSummary;
  status: CourtDareStatus;
  spectators: number;
  timeRemainingSeconds: number;
  title: string;
  viewerRole: 'participant_a' | 'participant_b' | 'spectator';
  votesA: number;
  votesB: number;
};
