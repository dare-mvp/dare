import { getDisplayedSocialProofSummary, getSocialProofSummary } from './socialProof';
import type { DareFeedItem } from './components/DareCard';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baseDare: DareFeedItem = {
  actionLabel: 'Accept this DARE',
  category: 'Knowledge',
  createdAgo: 'now',
  id: 'dare-1',
  playerA: {
    accent: 'ember',
    name: 'Ada',
    tier: 'Champion',
    trustScore: 700,
  },
  resolution: 'Evidence',
  stakeKobo: 10000,
  status: 'open',
  title: 'Base DARE',
};

function testSocialProofUsesConfirmedPublicStatuses() {
  const summary = getSocialProofSummary([
    baseDare,
    { ...baseDare, id: 'dare-2', status: 'active' },
    { ...baseDare, category: 'Sports', id: 'dare-3', status: 'completed' },
    { ...baseDare, id: 'dare-4', status: 'disputed' },
  ]);

  assert(summary.openDares === 1, 'Summary should count open DAREs.');
  assert(summary.activeCourts === 1, 'Summary should count active courts.');
  assert(summary.completedDares === 1, 'Summary should count completed DAREs without treating disputes as settled.');
  assert(summary.topCategory === 'Knowledge', 'Summary should derive the top public category.');
}

function testSocialProofFindsTopTrustedPlayer() {
  const summary = getSocialProofSummary([
    {
      ...baseDare,
      playerB: {
        accent: 'info',
        name: 'Bayo',
        tier: 'Elite',
        trustScore: 930,
      },
    },
  ]);

  assert(summary.topTrustedPlayer?.name === 'Bayo', 'Summary should find the highest public trust score.');
  assert(summary.topTrustedPlayer.score === 930, 'Summary should keep the public trust score.');
}

function testSocialProofIgnoresMalformedRows() {
  const summary = getSocialProofSummary([
    null,
    baseDare,
    { ...baseDare, category: '', id: 'dare-2', playerA: { ...baseDare.playerA, trustScore: Number.NaN } },
    { status: 'open' },
  ]);

  assert(summary.openDares === 3, 'Summary should count valid open statuses.');
  assert(summary.topCategory === 'Knowledge', 'Summary should ignore missing categories.');
  assert(summary.topTrustedPlayer?.name === 'Ada', 'Summary should ignore malformed trust scores.');
}

function testServerConfirmedSocialProofOverridesFeedFallback() {
  const fallback = getSocialProofSummary([baseDare]);
  const summary = getDisplayedSocialProofSummary({
    generatedAt: '2026-06-28T12:00:00.000Z',
    liveCourts: [],
    recentSettlements: [
      {
        amountLabel: 'NGN 9,500',
        dareId: 'dare-settled',
        label: 'Payout confirmed',
        settledAt: '2026-06-28T11:55:00.000Z',
        title: 'Fastest answer wins',
        winnerName: 'Bayo',
      },
    ],
    source: 'server',
    summary: {
      activeCourts: 2,
      completedDares: 8,
      confirmedPayouts: 4,
      openDares: 3,
      topCategory: 'Sports',
      topTrustedPlayer: { name: 'Bayo', score: 930 },
    },
  }, fallback);

  assert(summary.completedDares === 8, 'Server confirmed completed count should override feed-derived fallback.');
  assert(summary.openDares === 3, 'Server confirmed open count should override feed-derived fallback.');
  assert(summary.topTrustedPlayer?.name === 'Bayo', 'Server confirmed trusted player should be displayed.');
}

testSocialProofUsesConfirmedPublicStatuses();
testSocialProofFindsTopTrustedPlayer();
testSocialProofIgnoresMalformedRows();
testServerConfirmedSocialProofOverridesFeedFallback();
