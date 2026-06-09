import type { CreateDarePayload } from '../../lib/actions/endpoints';
import type { CreateDareDraft, DareCategory, ResolutionType } from './types';

type RouteDraftParams = {
  answerKey?: string;
  answerKeyRules?: string;
  category?: string;
  description?: string;
  dareType?: string;
  durationSeconds?: string;
  opponent?: string;
  resolutionType?: string;
  rewardNaira?: string;
  rules?: string;
  stakeNaira?: string;
  title?: string;
};

export function draftToRouteParams(draft: CreateDareDraft) {
  return {
    answerKey: draft.answerKey,
    answerKeyRules: draft.answerKeyRules,
    category: draft.category,
    description: draft.description,
    dareType: draft.dareType,
    durationSeconds: String(draft.durationSeconds),
    opponent: draft.opponent,
    resolutionType: draft.resolutionType,
    rewardNaira: draft.rewardNaira,
    rules: draft.rules,
    stakeNaira: draft.stakeNaira,
    title: draft.title,
  };
}

export function routeParamsToDraft(params: RouteDraftParams): CreateDareDraft {
  return {
    answerKey: params.answerKey ?? '',
    answerKeyRules: params.answerKeyRules ?? '',
    category: parseCategory(params.category),
    description: params.description ?? '',
    dareType: parseDareType(params.dareType),
    durationSeconds: parseDuration(params.durationSeconds),
    opponent: params.opponent ?? '',
    resolutionType: parseResolutionType(params.resolutionType),
    rewardNaira: params.rewardNaira ?? '',
    rules: params.rules ?? '',
    stakeNaira: params.stakeNaira ?? '',
    title: params.title ?? '',
  };
}

export function draftToCreateDarePayload(draft: CreateDareDraft): CreateDarePayload {
  const targetUsername = normalizeUsername(draft.opponent);
  const stakeAmount = parseStakeNairaToKobo(draft.stakeNaira);
  const rewardAmount = parseStakeNairaToKobo(draft.rewardNaira);
  const isAnswerKey = draft.resolutionType === 'answer_key';
  const isTask = draft.dareType === 'task';
  const description = draft.description.trim();

  return {
    category: draft.category,
    constitution: {
      answerKey: isAnswerKey ? draft.answerKey.trim() : null,
      answerKeyRules: isAnswerKey ? draft.answerKeyRules.trim() || null : null,
      edgeCases: 'Ties, late entry, abandoned sessions, and disputes follow DARE platform rules.',
      proofMethod: resolutionProofMethod(draft.resolutionType),
      rules: draft.rules.trim(),
      test: description,
    },
    currency: 'NGN',
    dareType: draft.dareType,
    description,
    durationSeconds: draft.durationSeconds,
    resolutionType: toBackendResolutionType(draft.resolutionType),
    rewardAmount: isTask ? rewardAmount : 0,
    stakeAmount: isTask ? 0 : stakeAmount,
    targetUsername,
    title: draft.title.trim(),
  };
}

function parseCategory(value: string | undefined): DareCategory {
  if (
    value === 'knowledge' ||
    value === 'physical' ||
    value === 'verbal' ||
    value === 'sports' ||
    value === 'creative' ||
    value === 'other'
  ) {
    return value;
  }

  return 'knowledge';
}

function parseResolutionType(value: string | undefined): ResolutionType {
  if (value === 'answer_key' || value === 'witnessed' || value === 'evidence') {
    return value;
  }

  return 'answer_key';
}

function parseDareType(value: string | undefined): CreateDareDraft['dareType'] {
  if (value === 'skill' || value === 'task') return value;
  return 'skill';
}

function toBackendResolutionType(
  value: ResolutionType,
): CreateDarePayload['resolutionType'] {
  return value;
}

function resolutionProofMethod(value: ResolutionType) {
  if (value === 'witnessed') return 'Witnessed live session';
  if (value === 'evidence') return 'Evidence review';
  return 'Committed answer key';
}

function parseDuration(value: string | undefined) {
  const duration = Number.parseInt(value ?? '', 10);
  return Number.isFinite(duration) && duration >= 60 && duration <= 3600 ? duration : 180;
}

export function parseStakeNairaToKobo(value: string) {
  const stake = Number(value || 0);
  return Number.isFinite(stake) ? Math.max(0, Math.round(stake * 100)) : 0;
}

function normalizeUsername(value: string) {
  const username = value.trim().replace(/^@+/, '');
  return username ? username : null;
}
