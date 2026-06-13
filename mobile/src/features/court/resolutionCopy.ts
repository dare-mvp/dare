import { CourtSession } from './types';

type ResolutionProgress = {
  roundIndex: number;
  totalRounds: number;
};

export function getResolutionNoticeTitle(
  resolutionType: CourtSession['resolutionType'],
  progress: ResolutionProgress,
) {
  if (resolutionType === 'answer_key') {
    return progress.totalRounds > 0
      ? `Answer prompt ${progress.roundIndex + 1} of ${progress.totalRounds}`
      : 'Answer key resolution';
  }

  if (resolutionType === 'witnessed') return 'Witnessed resolution';
  return 'Evidence resolution';
}

export function getResolutionNoticeMessage(resolutionType: CourtSession['resolutionType']) {
  if (resolutionType === 'answer_key') {
    return 'The prompt is loaded without exposing the committed answer key.';
  }

  if (resolutionType === 'witnessed') {
    return 'Stay present while the attempt is witnessed.';
  }

  return 'Preserve and submit evidence according to the DARE rules.';
}
