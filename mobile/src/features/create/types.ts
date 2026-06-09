export type DareCategory = 'knowledge' | 'physical' | 'verbal' | 'sports' | 'creative' | 'other';

export type ResolutionType = 'answer_key' | 'witnessed' | 'evidence';
export type DareType = 'skill' | 'task';

export type CreateDareDraft = {
  answerKey: string;
  answerKeyRules: string;
  category: DareCategory;
  description: string;
  dareType: DareType;
  durationSeconds: number;
  opponent: string;
  resolutionType: ResolutionType;
  rules: string;
  rewardNaira: string;
  stakeNaira: string;
  title: string;
};

export type DraftValidation = {
  isValid: boolean;
  errors: Partial<Record<keyof CreateDareDraft, string>>;
};
