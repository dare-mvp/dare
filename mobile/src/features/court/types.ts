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

export type CourtSession = {
  challengeType: string;
  connectionState: 'connected' | 'reconnecting' | 'offline';
  dareId?: string;
  dareType: 'skill' | 'task';
  heartbeatAgeSeconds: number;
  phase: 'ready' | 'countdown' | 'active' | 'settlement_pending';
  playerA: CourtPlayer;
  playerB: CourtPlayer;
  potKobo: number;
  question: CourtQuestion;
  resolutionType: 'answer_key' | 'witnessed' | 'evidence';
  spectators: number;
  timeRemainingSeconds: number;
  title: string;
  viewerRole: 'participant_a' | 'participant_b' | 'spectator';
  votesA: number;
  votesB: number;
};
