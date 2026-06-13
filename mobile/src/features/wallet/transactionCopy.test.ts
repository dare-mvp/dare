import { getWalletTransactionCopy } from './transactionCopy';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testSkillStakeRolesHaveDistinctCopy() {
  const creator = getWalletTransactionCopy({
    amountKobo: 50_000,
    dareId: 'dare-1',
    direction: 'debit',
    id: 'tx-creator',
    metadata: { dare_type: 'skill', funding_model: 'two_sided_stake', role: 'issuer' },
    rawType: 'escrow_hold',
    status: 'posted',
  });
  const challenger = getWalletTransactionCopy({
    amountKobo: 50_000,
    dareId: 'dare-1',
    direction: 'debit',
    id: 'tx-challenger',
    metadata: { dare_type: 'skill', funding_model: 'two_sided_stake', role: 'challenger' },
    rawType: 'escrow_hold',
    status: 'posted',
  });

  assert(creator.label === 'Skill creator stake locked', 'Creator stake copy should name creator role.');
  assert(challenger.label === 'Skill challenger stake locked', 'Challenger stake copy should name challenger role.');
}

function testTaskRewardAndSettlementCopy() {
  const taskReward = getWalletTransactionCopy({
    amountKobo: 75_000,
    dareId: 'dare-2',
    direction: 'debit',
    id: 'tx-task',
    metadata: { dare_type: 'task', funding_model: 'darer_reward', role: 'issuer' },
    rawType: 'escrow_hold',
    status: 'posted',
  });
  const payout = getWalletTransactionCopy({
    amountKobo: 75_000,
    dareId: 'dare-2',
    direction: 'credit',
    id: 'tx-payout',
    metadata: { dare_type: 'task' },
    rawType: 'payout',
    status: 'posted',
  });

  assert(taskReward.label === 'Task creator reward locked', 'Task reward should not imply performer stake.');
  assert(payout.label === 'Winner payout', 'Payout should use winner payout copy.');
}

function testRefundAndDisputeHoldCopy() {
  const refund = getWalletTransactionCopy({
    amountKobo: 50_000,
    dareId: 'dare-3',
    direction: 'credit',
    id: 'tx-refund',
    metadata: { reason: 'void_or_no_valid_completion' },
    rawType: 'escrow_release',
    status: 'posted',
  });
  const disputeHold = getWalletTransactionCopy({
    amountKobo: 50_000,
    dareId: 'dare-3',
    direction: 'debit',
    id: 'tx-hold',
    metadata: { reason: 'dispute_pending' },
    rawType: 'escrow_hold',
    status: 'pending',
  });

  assert(refund.label === 'Void/refund returned', 'Void settlement should show refund copy.');
  assert(disputeHold.label === 'Dispute hold', 'Dispute hold should show frozen escrow copy.');
}

testSkillStakeRolesHaveDistinctCopy();
testTaskRewardAndSettlementCopy();
testRefundAndDisputeHoldCopy();
