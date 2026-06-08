import type { CreateDarePayload } from '../../lib/actions/endpoints';
import type { CreateDareDraft, DareCategory, ResolutionType } from './types';

type RouteDraftParams = {
  answerKey?: string;
  answerKeyRules?: string;
  category?: string;
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
    category: draft.category,
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

  return {
    category: draft.category,
    constitution: {
      answerKey: draft.resolutionType === 'answer_key' ? draft.answerKey.trim() : null,
      answerKeyRules: draft.resolutionType === 'answer_key' ? draft.answerKeyRules.trim() || null : null,
      edgeCases: 'Ties, late entry, abandoned sessions, and disputes follow DARE platform rules.',
      proofMethod: resolutionProofMethod(draft.resolutionType),
      rules: draft.rules.trim(),
      test: draft.title.trim(),
    },
    currency: 'NGN',
    dareType: draft.dareType,
    description: `${draft.dareType} ${draft.resolutionType} DARE`,
    durationSeconds: draft.durationSeconds,
    resolutionType: toBackendResolutionType(draft.resolutionType),
    rewardAmount: draft.dareType === 'task' ? rewardAmount : 0,
    stakeAmount: draft.dareType === 'skill' ? stakeAmount : 0,
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
