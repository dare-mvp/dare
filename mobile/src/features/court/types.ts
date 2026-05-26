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
  heartbeatAgeSeconds: number;
  phase: 'ready' | 'countdown' | 'active' | 'settlement_pending';
  playerA: CourtPlayer;
  playerB: CourtPlayer;
  potKobo: number;
  question: CourtQuestion;
  spectators: number;
  timeRemainingSeconds: number;
  title: string;
};
