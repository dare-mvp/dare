import { draftToCreateDarePayload } from './createDarePayload';
import { getConstitutionHealth } from './constitutionHealth';
import { applyDareTemplate, dareTemplates } from './dareTemplates';
import { TASK_DESCRIPTION_PREFIX, validateCreateDareDraft } from './hooks/useCreateDareDraft';
import type { CreateDareDraft } from './types';

const baseDraft: CreateDareDraft = {
  answerKey: 'Paris',
  answerKeyRules: 'Case insensitive',
  category: 'knowledge',
  description: 'Answer this creator-authored geography prompt during the court session.',
  dareType: 'skill',
  durationSeconds: 180,
  opponent: '@player_two',
  resolutionType: 'answer_key',
  rewardNaira: '',
  rules: 'Answer the prompt before the timer expires.',
  stakeNaira: '500',
  title: 'Name the capital of France',
  visibility: 'targeted',
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testSkillPayloadUsesStake() {
  const payload = draftToCreateDarePayload(baseDraft);

  assert(payload.dareType === 'skill', 'Skill payload should use skill dareType.');
  assert(payload.stakeAmount === 50_000, 'Skill payload should send stake amount.');
  assert(payload.rewardAmount === 0, 'Skill payload should not send a reward amount.');
  assert(payload.description === baseDraft.description, 'Payload should include the DARE description.');
  assert(payload.constitution.test === baseDraft.description, 'Constitution test should use the DARE description.');
  assert(payload.constitution.answerKey === 'Paris', 'Answer Key payload should include answer key.');
  assert(payload.constitution.answerKeyRules === 'Case insensitive', 'Answer Key payload should include judging rules.');
  assert(payload.targetUsername === 'player_two', 'Targeted payload should normalize the target username.');
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

function testOpenPayloadOmitsTargetUsername() {
  const payload = draftToCreateDarePayload({
    ...baseDraft,
    opponent: '@player_two',
    visibility: 'open',
  });

  assert(payload.targetUsername === null, 'Open DARE payload should not send a target username.');
}

function testOpenValidationIgnoresStaleTargetUsername() {
  const validation = validateCreateDareDraft({
    ...baseDraft,
    opponent: '@@bad username',
    visibility: 'open',
  });

  assert(!validation.errors.opponent, 'Open DARE validation should ignore stale target usernames.');
}

function testTargetedValidationRejectsMalformedUsername() {
  const validation = validateCreateDareDraft({
    ...baseDraft,
    opponent: '@@bad username',
    visibility: 'targeted',
  });

  assert(validation.errors.opponent === 'Use a valid username.', 'Targeted DARE validation should reject malformed usernames.');
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

function testTaskDescriptionPrefixAloneIsIncomplete() {
  const validation = validateCreateDareDraft({
    ...baseDraft,
    dareType: 'task',
    description: TASK_DESCRIPTION_PREFIX,
    rewardNaira: '750',
  });

  assert(!validation.isValid, 'Task description prefix alone should not be valid.');
  assert(Boolean(validation.errors.description), 'Task prefix-only description should show a description error.');
}

function testTemplateMappingPreservesVersion() {
  const template = dareTemplates.find((item) => item.id === 'proof_upload_task');
  assert(Boolean(template), 'Proof upload template should exist.');
  const draft = applyDareTemplate(template!);

  assert(draft.templateId === 'proof_upload_task', 'Template draft should include template ID.');
  assert(draft.templateVersion === 1, 'Template draft should include template version.');
  assert(draft.dareType === 'task', 'Proof upload template should create a Task-Based DARE.');
  assert(draft.resolutionType === 'evidence', 'Proof upload template should use evidence resolution.');
}

function testConstitutionHealthBlocksMissingProofRule() {
  const health = getConstitutionHealth({
    ...baseDraft,
    answerKey: '',
    resolutionType: 'answer_key',
  });

  assert(health.status === 'blocking', 'Missing answer key should block publishing.');
  assert(
    health.issues.some((issue) => issue.code === 'MISSING_ANSWER_KEY' && issue.severity === 'blocking'),
    'Health issues should include blocking answer-key issue.',
  );
}

function testConstitutionHealthWarnsBroadWording() {
  const health = getConstitutionHealth({
    ...baseDraft,
    rules: 'Winner has more correct answers. If tied, void and refund. Normal rules apply to anything else.',
  });

  assert(health.status === 'warning', 'Broad wording should warn but not block.');
  assert(
    health.issues.some((issue) => issue.code === 'BROAD_WORDING' && issue.severity === 'warning'),
    'Health issues should include broad wording warning.',
  );
}

testSkillPayloadUsesStake();
testTaskPayloadUsesReward();
testOpenPayloadOmitsTargetUsername();
testOpenValidationIgnoresStaleTargetUsername();
testTargetedValidationRejectsMalformedUsername();
testNonAnswerKeyPayloadOmitsAnswerKey();
testTaskDescriptionPrefixAloneIsIncomplete();
testTemplateMappingPreservesVersion();
testConstitutionHealthBlocksMissingProofRule();
testConstitutionHealthWarnsBroadWording();
