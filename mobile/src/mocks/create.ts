import { CreateDareDraft } from '../features/create/types';

export const createReviewDraft: CreateDareDraft = {
  category: 'knowledge',
  durationSeconds: 180,
  opponent: '@tomi',
  resolutionType: 'algorithmic',
  rules: 'Both players answer the same 12-question quiz. Highest score wins. Ties go to fastest total answer time.',
  stakeNaira: '2500',
  title: 'Beat a 12-question Premier League quiz in court mode',
};

export const createReviewMoney = {
  platformFeeKobo: 12500,
  stakeKobo: 250000,
};
