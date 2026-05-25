import { useMemo, useState } from 'react';

import { CreateDareDraft, DraftValidation } from '../types';

const initialDraft: CreateDareDraft = {
  category: 'knowledge',
  durationSeconds: 180,
  opponent: '',
  resolutionType: 'algorithmic',
  rules: '',
  stakeNaira: '',
  title: '',
};

export function useCreateDareDraft() {
  const [draft, setDraft] = useState<CreateDareDraft>(initialDraft);

  const validation = useMemo(() => validateDraft(draft), [draft]);
  const stakeAmount = Number(draft.stakeNaira || 0);
  const stakeKobo = Number.isFinite(stakeAmount) ? Math.max(0, Math.round(stakeAmount * 100)) : 0;
  const platformFeeKobo = Math.round(stakeKobo * 0.05);
  const escrowKobo = stakeKobo + platformFeeKobo;

  function updateDraft<Key extends keyof CreateDareDraft>(key: Key, value: CreateDareDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return {
    draft,
    escrowKobo,
    platformFeeKobo,
    stakeKobo,
    updateDraft,
    validation,
  };
}

function validateDraft(draft: CreateDareDraft): DraftValidation {
  const errors: DraftValidation['errors'] = {};
  const stake = Number(draft.stakeNaira || 0);

  if (draft.title.trim().length < 8) {
    errors.title = 'Use at least 8 characters.';
  }

  if (draft.rules.trim().length < 20) {
    errors.rules = 'Write at least 20 characters of rules.';
  }

  if (!Number.isFinite(stake) || stake < 100) {
    errors.stakeNaira = 'Minimum stake is NGN 100.';
  }

  if (!Number.isInteger(draft.durationSeconds) || draft.durationSeconds < 60 || draft.durationSeconds > 3600) {
    errors.durationSeconds = 'Choose 1 to 60 minutes.';
  }

  if (draft.opponent && !/^@?[a-zA-Z0-9_]{3,20}$/.test(draft.opponent.trim())) {
    errors.opponent = 'Use a valid username.';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
