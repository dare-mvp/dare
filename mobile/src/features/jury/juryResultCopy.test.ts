import { getJuryResultCopy } from './juryResultCopy';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testPendingTallyCopy() {
  const copy = getJuryResultCopy({ status: 'jury_voting' });

  assert(copy.resultLabel === 'Vote pending tally', 'Open jury cases should remain pending tally.');
  assert(copy.settlementLabel === 'Awaiting verdict', 'Open jury cases should not imply settlement.');
}

function testVerdictSettlementCopy() {
  const copy = getJuryResultCopy({ status: 'settlement_pending', verdict: 'A' });

  assert(copy.resultLabel === 'Packet A verdict reached', 'Packet A verdict should be shown.');
  assert(copy.settlementLabel === 'Payout pending', 'Winning verdict should show payout pending.');
}

function testVoidAndEscalationCopy() {
  const voidCopy = getJuryResultCopy({ status: 'settlement_pending', verdict: 'void' });
  const escalateCopy = getJuryResultCopy({ status: 'escalated', verdict: 'escalate' });

  assert(voidCopy.settlementLabel === 'Refund pending', 'Void verdict should show refund pending.');
  assert(escalateCopy.settlementLabel === 'Settlement held', 'Escalation should keep settlement held.');
}

testPendingTallyCopy();
testVerdictSettlementCopy();
testVoidAndEscalationCopy();
