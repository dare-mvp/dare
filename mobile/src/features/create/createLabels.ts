import type { DareType, ResolutionType } from './types';

export type FundingModel = 'two_sided_stake' | 'darer_reward';

export function formatDareTypeLabel(dareType: DareType) {
  return dareType === 'task' ? 'Task-Based' : 'Skill-Based';
}

export function formatFundingModelLabel(fundingModel: FundingModel | undefined, dareType: DareType) {
  if (fundingModel === 'darer_reward') return 'Darer-funded reward';
  if (fundingModel === 'two_sided_stake') return 'Two-sided stake';
  return dareType === 'task' ? 'Darer-funded reward' : 'Two-sided stake';
}

export function formatResolutionLabel(resolutionType: ResolutionType | string) {
  if (resolutionType === 'answer_key') return 'Answer Key';
  if (resolutionType === 'witnessed') return 'Witnessed';
  if (resolutionType === 'evidence') return 'Evidence';
  return resolutionType.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
