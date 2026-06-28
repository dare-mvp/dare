import { parseStakeNairaToKobo } from './createDarePayload';
import type { CreateDareDraft } from './types';

export type ConstitutionHealthIssue = {
  actionLabel: string;
  code:
    | 'BROAD_WORDING'
    | 'HIGH_AMOUNT'
    | 'MISSING_ANSWER_KEY'
    | 'MISSING_COMPLETION_RULE'
    | 'MISSING_DESCRIPTION'
    | 'MISSING_DURATION'
    | 'MISSING_MONEY'
    | 'MISSING_PROOF_METHOD'
    | 'MISSING_RULES'
    | 'MISSING_TIE_RULE'
    | 'MISSING_TITLE'
    | 'MISSING_WIN_CONDITION'
    | 'POTENTIALLY_UNSAFE';
  field: keyof CreateDareDraft;
  message: string;
  severity: 'blocking' | 'warning';
};

export type ConstitutionHealth = {
  blockingCount: number;
  issues: ConstitutionHealthIssue[];
  status: 'blocking' | 'valid' | 'warning';
  warningCount: number;
};

const winConditionPattern = /\b(win|winner|wins|complete|completion|score|correct|finish|valid proof|accepted proof)\b/i;
const tieRulePattern = /\b(tie|draw|void|refund|sudden[- ]death|replay|extension)\b/i;
const proofPattern = /\b(proof|evidence|record|video|photo|image|witness|answer key|court)\b/i;
const unsafePattern = /\b(fight|weapon|drug|alcohol|nude|sexual|self[- ]harm|steal|illegal|dangerous|road|traffic)\b/i;
const broadPattern = /\b(anything|whatever|somehow|try your best|do it|make it happen|normal rules)\b/i;

export function getConstitutionHealth(draft: CreateDareDraft): ConstitutionHealth {
  const issues: ConstitutionHealthIssue[] = [];
  const title = draft.title.trim();
  const description = draft.description.trim();
  const rules = draft.rules.trim();
  const combined = `${title} ${description} ${rules}`;

  if (title.length < 8) {
    issues.push(blocking('MISSING_TITLE', 'title', 'Add a specific DARE title.', 'Add title'));
  }

  if (description.length < 20) {
    issues.push(blocking('MISSING_DESCRIPTION', 'description', 'Describe exactly what must happen.', 'Add description'));
  }

  if (rules.length < 20) {
    issues.push(blocking('MISSING_RULES', 'rules', 'Add rules reviewers can apply.', 'Add rules'));
  }

  if (!winConditionPattern.test(combined)) {
    const field = draft.dareType === 'task' ? 'description' : 'rules';
    issues.push(blocking('MISSING_WIN_CONDITION', field, getWinConditionMessage(draft), 'Add win rule'));
  }

  if (draft.dareType === 'task' && !/\b(complete|completion|valid proof|accepted proof|submit|submitted)\b/i.test(combined)) {
    issues.push(blocking('MISSING_COMPLETION_RULE', 'description', 'Task-Based DAREs need an explicit completion rule.', 'Add completion rule'));
  }

  if (draft.dareType === 'skill' && !tieRulePattern.test(combined)) {
    issues.push(blocking('MISSING_TIE_RULE', 'rules', 'Skill-Based DAREs need tie, void, or refund handling.', 'Set tie rule'));
  }

  if (!Number.isInteger(draft.durationSeconds) || draft.durationSeconds < 60) {
    issues.push(blocking('MISSING_DURATION', 'durationSeconds', 'Set a clear duration or deadline.', 'Set time'));
  }

  if (!getProofMethod(draft)) {
    issues.push(blocking('MISSING_PROOF_METHOD', 'resolutionType', 'Select a proof or resolution method.', 'Set proof'));
  } else if (!proofPattern.test(combined) && draft.resolutionType !== 'answer_key') {
    issues.push(warning('MISSING_PROOF_METHOD', 'rules', 'Summarize what proof reviewers should expect.', 'Clarify proof'));
  }

  if (draft.resolutionType === 'answer_key' && draft.answerKey.trim().length === 0) {
    issues.push(blocking('MISSING_ANSWER_KEY', 'answerKey', 'Answer Key DAREs need a committed answer key.', 'Add answer key'));
  }

  const amountKobo = draft.dareType === 'task'
    ? parseStakeNairaToKobo(draft.rewardNaira)
    : parseStakeNairaToKobo(draft.stakeNaira);
  if (amountKobo <= 0) {
    issues.push(blocking('MISSING_MONEY', draft.dareType === 'task' ? 'rewardNaira' : 'stakeNaira', 'Set the money that will be locked before publish.', 'Set amount'));
  } else if (amountKobo >= 2_000_000) {
    issues.push(warning('HIGH_AMOUNT', draft.dareType === 'task' ? 'rewardNaira' : 'stakeNaira', 'This amount is high. Confirm account limits and risk before publishing.', 'Review amount'));
  }

  if (broadPattern.test(combined)) {
    issues.push(warning('BROAD_WORDING', 'rules', 'Some wording is broad and may be hard to judge.', 'Tighten wording'));
  }

  if (unsafePattern.test(combined)) {
    issues.push(blocking('POTENTIALLY_UNSAFE', 'description', 'This DARE may be unsafe or prohibited. Rewrite it before publishing.', 'Rewrite DARE'));
  }

  const blockingCount = issues.filter((issue) => issue.severity === 'blocking').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;

  return {
    blockingCount,
    issues,
    status: blockingCount > 0 ? 'blocking' : warningCount > 0 ? 'warning' : 'valid',
    warningCount,
  };
}

export function getFirstBlockingHealthIssue(health: ConstitutionHealth) {
  return health.issues.find((issue) => issue.severity === 'blocking') ?? null;
}

function getProofMethod(draft: CreateDareDraft) {
  if (draft.resolutionType === 'answer_key') return 'Committed answer key';
  if (draft.resolutionType === 'evidence') return 'Evidence review';
  if (draft.resolutionType === 'witnessed') return 'Witnessed live session';
  return null;
}

function getWinConditionMessage(draft: CreateDareDraft) {
  if (draft.dareType === 'task') return 'Say what valid task completion means.';
  return 'Say exactly how the winner is decided.';
}

function blocking(
  code: ConstitutionHealthIssue['code'],
  field: keyof CreateDareDraft,
  message: string,
  actionLabel: string,
): ConstitutionHealthIssue {
  return { actionLabel, code, field, message, severity: 'blocking' };
}

function warning(
  code: ConstitutionHealthIssue['code'],
  field: keyof CreateDareDraft,
  message: string,
  actionLabel: string,
): ConstitutionHealthIssue {
  return { actionLabel, code, field, message, severity: 'warning' };
}
