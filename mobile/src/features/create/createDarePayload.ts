import { CreateDarePayload } from '../../lib/actions/endpoints';
import { CreateDareDraft, DareCategory } from './types';

type RouteDraftParams = {
  category?: string;
  durationSeconds?: string;
  opponent?: string;
  resolutionType?: string;
  rules?: string;
  stakeNaira?: string;
  title?: string;
};

export function draftToRouteParams(draft: CreateDareDraft) {
  return {
    category: draft.category,
    durationSeconds: String(draft.durationSeconds),
    opponent: draft.opponent,
    resolutionType: draft.resolutionType,
    rules: draft.rules,
    stakeNaira: draft.stakeNaira,
    title: draft.title,
  };
}

export function routeParamsToDraft(params: RouteDraftParams): CreateDareDraft {
  return {
    category: parseCategory(params.category),
    durationSeconds: parseDuration(params.durationSeconds),
    opponent: params.opponent ?? '',
    resolutionType: params.resolutionType === 'jury' || params.resolutionType === 'evidence'
      ? params.resolutionType
      : 'algorithmic',
    rules: params.rules ?? '',
    stakeNaira: params.stakeNaira ?? '',
    title: params.title ?? '',
  };
}

export function draftToCreateDarePayload(draft: CreateDareDraft): CreateDarePayload {
  const targetUsername = normalizeUsername(draft.opponent);
  const stakeAmount = Math.round(Number(draft.stakeNaira || 0) * 100);

  return {
    category: mapCategory(draft.category),
    constitution: {
      edgeCases: 'Ties, late entry, abandoned sessions, and disputes follow DARE platform rules.',
      proofMethod: draft.resolutionType,
      rules: draft.rules.trim(),
      test: draft.title.trim(),
    },
    currency: 'NGN',
    description: `${draft.resolutionType} challenge`,
    durationSeconds: draft.durationSeconds,
    stakeAmount,
    targetUsername,
    title: draft.title.trim(),
  };
}

function parseCategory(value: string | undefined): DareCategory {
  if (
    value === 'knowledge' ||
    value === 'sports' ||
    value === 'music' ||
    value === 'finance' ||
    value === 'creative' ||
    value === 'other'
  ) {
    return value;
  }

  return 'knowledge';
}

function parseDuration(value: string | undefined) {
  const duration = Number.parseInt(value ?? '', 10);
  return Number.isFinite(duration) && duration >= 60 && duration <= 3600 ? duration : 180;
}

function mapCategory(category: DareCategory): CreateDarePayload['category'] {
  if (category === 'knowledge' || category === 'sports' || category === 'creative' || category === 'other') {
    return category;
  }

  return 'other';
}

function normalizeUsername(value: string) {
  const username = value.trim().replace(/^@+/, '');
  return username ? username : null;
}
