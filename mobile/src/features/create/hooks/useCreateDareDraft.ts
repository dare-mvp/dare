import { useMemo, useState } from 'react';

import { parseStakeNairaToKobo } from '../createDarePayload';
import type { CreateDareDraft, DraftValidation } from '../types';

const initialDraft: CreateDareDraft = {
  answerKey: '',
  answerKeyRules: '',
  category: 'knowledge',
  dareType: 'skill',
  durationSeconds: 180,
  opponent: '',
  resolutionType: 'answer_key',
  rewardNaira: '',
  rules: '',
  stakeNaira: '',
  title: '',
};

export function useCreateDareDraft() {
  const [draft, setDraft] = useState<CreateDareDraft>(initialDraft);

  const validation = useMemo(() => validateCreateDareDraft(draft), [draft]);
  const stakeKobo = parseStakeNairaToKobo(draft.stakeNaira);
  const rewardKobo = parseStakeNairaToKobo(draft.rewardNaira);
  const escrowKobo = draft.dareType === 'task' ? rewardKobo : stakeKobo;
  const platformFeeKobo = Math.round((draft.dareType === 'task' ? rewardKobo : stakeKobo * 2) * 0.05);

  function updateDraft<Key extends keyof CreateDareDraft>(key: Key, value: CreateDareDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return {
    draft,
    escrowKobo,
    platformFeeKobo,
    rewardKobo,
    stakeKobo,
    updateDraft,
    validation,
  };
}

export function validateCreateDareDraft(draft: CreateDareDraft): DraftValidation {
  const errors: DraftValidation['errors'] = {};
  const stakeKobo = parseStakeNairaToKobo(draft.stakeNaira);
  const rewardKobo = parseStakeNairaToKobo(draft.rewardNaira);

  if (draft.title.trim().length < 8) {
    errors.title = 'Use at least 8 characters.';
  } else if (draft.title.trim().length > 140) {
    errors.title = 'Use 140 characters or fewer.';
  }

  if (draft.rules.trim().length < 20) {
    errors.rules = 'Write at least 20 characters of rules.';
  } else if (draft.rules.trim().length > 3000) {
    errors.rules = 'Use 3,000 characters or fewer.';
  }

  if (draft.dareType === 'skill' && stakeKobo < 10_000) {
    errors.stakeNaira = 'Minimum stake is NGN 100.';
  } else if (draft.dareType === 'skill' && stakeKobo > 5_000_000) {
    errors.stakeNaira = 'Maximum stake is NGN 50,000.';
  }

  if (draft.dareType === 'task' && rewardKobo < 10_000) {
    errors.rewardNaira = 'Minimum reward is NGN 100.';
  } else if (draft.dareType === 'task' && rewardKobo > 5_000_000) {
    errors.rewardNaira = 'Maximum reward is NGN 50,000.';
  }

  if (draft.resolutionType === 'answer_key' && draft.answerKey.trim().length < 1) {
    errors.answerKey = 'Add the committed answer key.';
  } else if (draft.answerKey.trim().length > 1000) {
    errors.answerKey = 'Use 1,000 characters or fewer.';
  }

  if (draft.answerKeyRules.trim().length > 1000) {
    errors.answerKeyRules = 'Use 1,000 characters or fewer.';
  }

  if (!Number.isInteger(draft.durationSeconds) || draft.durationSeconds < 60 || draft.durationSeconds > 3600) {
    errors.durationSeconds = 'Choose 1 to 60 minutes.';
  }

  if (draft.opponent && !/^@?[a-zA-Z0-9_]{3,30}$/.test(draft.opponent.trim())) {
    errors.opponent = 'Use a valid username.';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
