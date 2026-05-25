import { ProfileSummary } from '../features/profile/types';

export const profileSummary: ProfileSummary = {
  accountStatus: 'limited',
  avatarInitial: 'K',
  displayName: 'Kade',
  disputes: 0,
  earnedLabel: 'NGN 340K',
  juryCategories: ['knowledge', 'sports', 'finance'],
  juryOptIn: true,
  kycStatus: 'pending',
  kycTier: 'Tier 1 pending',
  limits: [
    {
      currentLabel: 'NGN 50,000 / day',
      label: 'Daily deposit limit',
      pendingIncreaseLabel: 'NGN 100,000 after cooling-off',
    },
    {
      currentLabel: 'NGN 250,000 / DARE',
      label: 'Max stake per DARE',
    },
    {
      currentLabel: 'Not active',
      label: 'Self-exclusion',
    },
  ],
  maxStakeLabel: 'NGN 500K',
  pointsToNextTier: 76,
  recentChallenges: [
    {
      id: 'recent-1',
      opponent: 'Tomi',
      result: 'win',
      stakeLabel: 'NGN 5,000',
      title: 'Premier League quiz in court mode',
      when: 'Today',
    },
    {
      id: 'recent-2',
      opponent: 'Ada',
      result: 'live',
      stakeLabel: 'NGN 3,500',
      title: 'Security scenarios speed run',
      when: 'Now',
    },
    {
      id: 'recent-3',
      opponent: 'Ikenna',
      result: 'disputed',
      stakeLabel: 'NGN 10,000',
      title: 'Fintech trivia verdict review',
      when: 'Yesterday',
    },
  ],
  specialties: ['Knowledge', 'Sports', 'Finance'],
  tier: 'Champion',
  trustScore: 724,
  winRate: '91%',
  wins: 47,
};
