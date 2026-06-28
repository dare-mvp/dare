import { getAcceptMoneyPreview, getCreateMoneyPreview } from './moneyPreview';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function findLine(lines: ReturnType<typeof getCreateMoneyPreview>['lines'], label: string) {
  return lines.find((line) => line.label === label);
}

function testSkillCreatePreviewShowsBothLocksAndPayout() {
  const preview = getCreateMoneyPreview({
    dareType: 'skill',
    platformFeeKobo: 5_000,
    rewardKobo: 0,
    stakeKobo: 50_000,
  });

  assert(findLine(preview.lines, 'You lock')?.valueKobo === 50_000, 'Skill create preview should show creator lock.');
  assert(findLine(preview.lines, 'They lock')?.valueKobo === 50_000, 'Skill create preview should show opponent lock.');
  assert(findLine(preview.lines, 'Winner receives')?.valueKobo === 95_000, 'Skill create preview should show estimated payout.');
}

function testTaskAcceptPreviewShowsZeroPerformerStake() {
  const preview = getAcceptMoneyPreview({
    dareType: 'task',
    issuerEscrowKobo: 100_000,
    platformFeeKobo: 5_000,
    rewardKobo: 100_000,
    totalDueKobo: 0,
    winnerPayoutKobo: 95_000,
  });

  assert(findLine(preview.lines, 'Performer stake')?.valueKobo === 0, 'Task accept preview should show zero performer stake.');
  assert(findLine(preview.lines, 'You lock')?.valueKobo === 0, 'Task accept preview should not lock performer money.');
  assert(
    findLine(preview.lines, 'Performer receives after valid completion')?.valueKobo === 95_000,
    'Task accept preview should show server payout amount.',
  );
}

function testAcceptPreviewCanShowEstimatedFallback() {
  const preview = getAcceptMoneyPreview({
    dareType: 'skill',
    issuerEscrowKobo: 50_000,
    platformFeeKobo: 0,
    rewardKobo: 0,
    source: 'estimated',
    totalDueKobo: 50_000,
    winnerPayoutKobo: 100_000,
  });

  assert(
    preview.footnote.includes('Estimated from cached DARE details'),
    'Accept preview should label fallback values as estimated.',
  );
}

testSkillCreatePreviewShowsBothLocksAndPayout();
testTaskAcceptPreviewShowsZeroPerformerStake();
testAcceptPreviewCanShowEstimatedFallback();
