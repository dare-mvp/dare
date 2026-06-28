import type { CreateDareDraft, DareCategory, DareType, ResolutionType } from './types';

export type DareTemplate = {
  allowedDareTypes: DareType[];
  allowedResolutionTypes: ResolutionType[];
  defaultDraft: Pick<
    CreateDareDraft,
    | 'answerKey'
    | 'answerKeyRules'
    | 'category'
    | 'description'
    | 'dareType'
    | 'durationSeconds'
    | 'opponent'
    | 'resolutionType'
    | 'rules'
    | 'rewardNaira'
    | 'stakeNaira'
    | 'title'
    | 'visibility'
  >;
  description: string;
  id: string;
  name: string;
  recommendedCategories: DareCategory[];
  recommendedRangeLabel: string;
  safetyWarning: string;
  version: number;
};

export const dareTemplates: DareTemplate[] = [
  {
    allowedDareTypes: ['skill'],
    allowedResolutionTypes: ['answer_key'],
    defaultDraft: {
      answerKey: '',
      answerKeyRules: 'Answers must match the committed answer key before the timer ends.',
      category: 'knowledge',
      dareType: 'skill',
      description: 'Answer the creator-authored questions live in Court before the timer expires.',
      durationSeconds: 180,
      opponent: '',
      resolutionType: 'answer_key',
      rewardNaira: '',
      rules: 'Winner is the player with more correct answers when the timer ends. If scores are tied, the DARE is voided and escrow follows platform refund rules.',
      stakeNaira: '500',
      title: 'Fastest answer wins',
      visibility: 'open',
    },
    description: 'Quick knowledge or verbal DARE with a committed answer key.',
    id: 'fastest_answer_wins',
    name: 'Fastest Answer Wins',
    recommendedCategories: ['knowledge', 'verbal'],
    recommendedRangeLabel: 'NGN 100 - 5,000',
    safetyWarning: 'Keep prompts fair, answerable, and committed before Court starts.',
    version: 1,
  },
  {
    allowedDareTypes: ['task'],
    allowedResolutionTypes: ['evidence'],
    defaultDraft: {
      answerKey: '',
      answerKeyRules: '',
      category: 'creative',
      dareType: 'task',
      description: 'I dare you to: complete the task exactly as described and submit clear proof.',
      durationSeconds: 1800,
      opponent: '',
      resolutionType: 'evidence',
      rewardNaira: '1000',
      rules: 'Performer must submit unedited proof that clearly shows the completed task. If proof is unclear, edited, late, or missing required details, the result can be rejected or sent to review.',
      stakeNaira: '',
      title: 'Proof upload task',
      visibility: 'open',
    },
    description: 'Darer-funded task where the performer proves completion with media.',
    id: 'proof_upload_task',
    name: 'Proof Upload Task',
    recommendedCategories: ['creative', 'physical', 'other'],
    recommendedRangeLabel: 'NGN 100 - 10,000',
    safetyWarning: 'Do not request unsafe, illegal, private, or location-sensitive proof.',
    version: 1,
  },
  {
    allowedDareTypes: ['skill', 'task'],
    allowedResolutionTypes: ['witnessed'],
    defaultDraft: {
      answerKey: '',
      answerKeyRules: '',
      category: 'sports',
      dareType: 'skill',
      description: 'Perform the agreed skill live in Court while witnesses can see the full attempt.',
      durationSeconds: 300,
      opponent: '',
      resolutionType: 'witnessed',
      rewardNaira: '',
      rules: 'The full attempt must stay visible during the live Court window. Winner is decided by the witnessed performance against these rules. If the result is unclear or tied, the DARE is voided or sent to review.',
      stakeNaira: '500',
      title: 'Live witnessed task',
      visibility: 'open',
    },
    description: 'Live skill or task judged by witnessed performance.',
    id: 'live_witnessed_task',
    name: 'Live Witnessed Task',
    recommendedCategories: ['physical', 'sports', 'verbal', 'creative'],
    recommendedRangeLabel: 'NGN 100 - 5,000',
    safetyWarning: 'Only choose safe tasks that can be judged without leaving the app.',
    version: 1,
  },
  {
    allowedDareTypes: ['skill'],
    allowedResolutionTypes: ['witnessed', 'evidence', 'answer_key'],
    defaultDraft: {
      answerKey: '',
      answerKeyRules: '',
      category: 'verbal',
      dareType: 'skill',
      description: 'Challenge a specific opponent to complete the agreed DARE under these rules.',
      durationSeconds: 300,
      opponent: '',
      resolutionType: 'witnessed',
      rewardNaira: '',
      rules: 'Both players must accept the same rules before Court. Winner is the player who completes the agreed challenge better within the timer. If either player cannot complete or the result is tied, the DARE is voided or reviewed.',
      stakeNaira: '500',
      title: 'Friend challenge',
      visibility: 'targeted',
    },
    description: 'A structured one-to-one DARE for a known opponent.',
    id: 'friend_challenge',
    name: 'Friend Challenge',
    recommendedCategories: ['verbal', 'sports', 'knowledge', 'creative'],
    recommendedRangeLabel: 'NGN 100 - 5,000',
    safetyWarning: 'Targeted invites are still validated server-side before accept.',
    version: 1,
  },
  {
    allowedDareTypes: ['task'],
    allowedResolutionTypes: ['evidence', 'witnessed'],
    defaultDraft: {
      answerKey: '',
      answerKeyRules: '',
      category: 'other',
      dareType: 'task',
      description: 'I dare you to: complete this open reward task and submit valid proof before the deadline.',
      durationSeconds: 3600,
      opponent: '',
      resolutionType: 'evidence',
      rewardNaira: '1000',
      rules: 'First eligible performer with valid proof can receive the reward after review. Performer stake is NGN 0. If no valid proof is submitted before expiry, reward escrow follows platform refund rules.',
      stakeNaira: '',
      title: 'Open reward task',
      visibility: 'open',
    },
    description: 'Public task where the Darer funds the reward and performer stakes nothing.',
    id: 'open_reward_task',
    name: 'Open Reward Task',
    recommendedCategories: ['creative', 'other', 'physical'],
    recommendedRangeLabel: 'NGN 100 - 10,000',
    safetyWarning: 'Reward tasks must be specific, verifiable, and safe to perform.',
    version: 1,
  },
];

export function applyDareTemplate(template: DareTemplate): CreateDareDraft {
  return {
    ...template.defaultDraft,
    templateId: template.id,
    templateVersion: template.version,
  };
}
