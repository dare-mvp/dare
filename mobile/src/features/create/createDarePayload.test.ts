import { draftToCreateDarePayload } from './createDarePayload';
import type { CreateDareDraft } from './types';

const baseDraft: CreateDareDraft = {
  answerKey: 'Paris',
  answerKeyRules: 'Case insensitive',
  category: 'knowledge',
  dareType: 'skill',
  durationSeconds: 180,
  opponent: '@player_two',
  resolutionType: 'answer_key',
  rewardNaira: '',
  rules: 'Answer the prompt before the timer expires.',
  stakeNaira: '500',
  title: 'Name the capital of France',
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testSkillPayloadUsesStake() {
  const payload = draftToCreateDarePayload(baseDraft);

  assert(payload.dareType === 'skill', 'Skill payload should use skill dareType.');
  assert(payload.stakeAmount === 50_000, 'Skill payload should send stake amount.');
  assert(payload.rewardAmount === 0, 'Skill payload should not send a reward amount.');
  assert(payload.constitution.answerKey === 'Paris', 'Answer Key payload should include answer key.');
  assert(payload.constitution.answerKeyRules === 'Case insensitive', 'Answer Key payload should include judging rules.');
}

function testTaskPayloadUsesReward() {
  const payload = draftToCreateDarePayload({
    ...baseDraft,
    dareType: 'task',
    rewardNaira: '750',
    stakeNaira: '500',
  });

  assert(payload.dareType === 'task', 'Task payload should use task dareType.');
  assert(payload.stakeAmount === 0, 'Task payload should not lock performer stake.');
  assert(payload.rewardAmount === 75_000, 'Task payload should send Darer reward.');
}

function testNonAnswerKeyPayloadOmitsAnswerKey() {
  const payload = draftToCreateDarePayload({
    ...baseDraft,
    answerKey: 'hidden',
    answerKeyRules: 'hidden rules',
    resolutionType: 'evidence',
  });

  assert(payload.resolutionType === 'evidence', 'Evidence payload should keep evidence resolution.');
  assert(payload.constitution.answerKey === null, 'Evidence payload should omit answer key.');
  assert(payload.constitution.answerKeyRules === null, 'Evidence payload should omit answer-key rules.');
}

testSkillPayloadUsesStake();
testTaskPayloadUsesReward();
testNonAnswerKeyPayloadOmitsAnswerKey();
