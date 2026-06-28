import { useMemo, useState } from 'react';

import { parseStakeNairaToKobo } from '../createDarePayload';
import type { DareTemplate } from '../dareTemplates';
import type { CreateDareDraft, DraftValidation } from '../types';

export const TASK_DESCRIPTION_PREFIX = 'I dare you to: ';

const initialDraft: CreateDareDraft = {
  answerKey: '',
  answerKeyRules: '',
  category: 'knowledge',
  description: '',
  dareType: 'skill',
  durationSeconds: 180,
  opponent: '',
  resolutionType: 'answer_key',
  rewardNaira: '',
  rules: '',
  stakeNaira: '',
  templateId: undefined,
  templateVersion: undefined,
  title: '',
  visibility: 'open',
};

export function useCreateDareDraft() {
  const [draft, setDraft] = useState<CreateDareDraft>(initialDraft);

  const validation = useMemo(() => validateCreateDareDraft(draft), [draft]);
  const stakeKobo = parseStakeNairaToKobo(draft.stakeNaira);
  const rewardKobo = parseStakeNairaToKobo(draft.rewardNaira);
  const escrowKobo = draft.dareType === 'task' ? rewardKobo : stakeKobo;
  const platformFeeKobo = Math.round((draft.dareType === 'task' ? rewardKobo : stakeKobo * 2) * 0.05);

  function updateDraft<Key extends keyof CreateDareDraft>(key: Key, value: CreateDareDraft[Key]) {
    setDraft((current) => {
      if (key === 'dareType') {
        const nextDareType = value as CreateDareDraft['dareType'];
        const description = getDescriptionForDareTypeChange(current, nextDareType);
        return { ...current, dareType: nextDareType, description };
      }

      if (key === 'visibility' && value === 'open') {
        return { ...current, visibility: 'open', opponent: '' };
      }

      return { ...current, [key]: value };
    });
  }

  function applyTemplate(template: DareTemplate) {
    setDraft({
      ...template.defaultDraft,
      templateId: template.id,
      templateVersion: template.version,
    });
  }

  return {
    applyTemplate,
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

  const descriptionMeaningfulText = getDescriptionMeaningfulText(draft);
  if (descriptionMeaningfulText.length < 5 || draft.description.trim().length < 20) {
    errors.description = draft.dareType === 'task'
      ? 'Complete the task description after "I dare you to:".'
      : 'Describe the DARE in at least 20 characters.';
  } else if (draft.description.trim().length > 1000) {
    errors.description = 'Use 1,000 characters or fewer.';
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

  if (draft.visibility === 'targeted') {
    if (!draft.opponent.trim()) {
      errors.opponent = 'Add the username receiving this invite.';
    } else if (!/^@?[a-zA-Z0-9_]{3,30}$/.test(draft.opponent.trim())) {
      errors.opponent = 'Use a valid username.';
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

function getDescriptionForDareTypeChange(
  current: CreateDareDraft,
  nextDareType: CreateDareDraft['dareType'],
) {
  const description = current.description;
  const trimmed = description.trim();

  if (nextDareType === 'task' && trimmed.length === 0) {
    return TASK_DESCRIPTION_PREFIX;
  }

  if (nextDareType === 'skill' && description === TASK_DESCRIPTION_PREFIX) {
    return '';
  }

  return description;
}

function getDescriptionMeaningfulText(draft: CreateDareDraft) {
  if (draft.dareType !== 'task') return draft.description.trim();
  return draft.description.startsWith(TASK_DESCRIPTION_PREFIX)
    ? draft.description.slice(TASK_DESCRIPTION_PREFIX.length).trim()
    : draft.description.trim();
}
