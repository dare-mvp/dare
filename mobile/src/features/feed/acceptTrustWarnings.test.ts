import { getAcceptTrustWarnings, hasBlockingAcceptWarning, requiresAcceptRiskAcknowledgement } from './acceptTrustWarnings';
import type { DareFeedItem } from './components/DareCard';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baseDare: DareFeedItem = {
  actionLabel: 'Accept this DARE',
  category: 'Knowledge',
  createdAgo: 'Now',
  dareType: 'skill',
  fundingModel: 'two_sided_stake',
  id: 'dare-1',
  playerA: {
    accent: 'ember',
    name: 'issuer',
    tier: 'Bronze',
    trustScore: 80,
  },
  resolution: 'Answer Key',
  rules: 'Winner has more correct answers. If tied, void and refund.',
  stakeKobo: 50_000,
  status: 'open',
  title: 'Capital city answer challenge',
};

function testLowTrustRequiresAcknowledgement() {
  const warnings = getAcceptTrustWarnings({
    dare: {
      ...baseDare,
      playerA: { ...baseDare.playerA, trustScore: 240 },
    },
    quote: null,
  });

  assert(requiresAcceptRiskAcknowledgement(warnings), 'Low trust warning should require acknowledgement.');
  assert(!hasBlockingAcceptWarning(warnings), 'Low trust warning should not block by itself.');
}

function testIncompleteRulesBlockAccept() {
  const warnings = getAcceptTrustWarnings({
    dare: {
      ...baseDare,
      rules: '',
    },
    quote: null,
  });

  assert(hasBlockingAcceptWarning(warnings), 'Incomplete rules should block accept.');
}

testLowTrustRequiresAcknowledgement();
testIncompleteRulesBlockAccept();
