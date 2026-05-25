import { CourtSession } from '../features/court/types';

export const activeCourtSession: CourtSession = {
  challengeType: 'Algorithmic quiz - Issuer vs Challenger',
  connectionState: 'connected',
  heartbeatAgeSeconds: 4,
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
    options: ['Abuja', 'Port Harcourt', 'Lagos', 'Kano'],
    prompt: 'Which Nigerian city is known as the Centre of Excellence?',
    selectedOption: 'Lagos',
  },
  spectators: 18,
  timeRemainingSeconds: 72,
  title: 'Premier League quiz in court mode',
};
