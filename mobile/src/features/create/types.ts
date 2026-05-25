export type DareCategory = 'knowledge' | 'sports' | 'music' | 'finance' | 'creative' | 'other';

export type ResolutionType = 'algorithmic' | 'jury' | 'evidence';

export type CreateDareDraft = {
  category: DareCategory;
  durationSeconds: number;
  opponent: string;
  resolutionType: ResolutionType;
  rules: string;
  stakeNaira: string;
  title: string;
};

export type DraftValidation = {
  isValid: boolean;
  errors: Partial<Record<keyof CreateDareDraft, string>>;
};
