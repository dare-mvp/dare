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

export type CourtSession = {
  challengeType: string;
  connectionState: 'connected' | 'reconnecting' | 'offline';
  dareId?: string;
  dareType: 'skill' | 'task';
  evidence: CourtEvidenceSummary;
  heartbeatAgeSeconds: number;
  juryCase: CourtJuryCaseSummary | null;
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
