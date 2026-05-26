export type ProfileStat = {
  label: string;
  tone: 'default' | 'primary' | 'success' | 'warning';
  value: string;
};

export type RecentChallenge = {
  id: string;
  opponent: string;
  result: 'win' | 'loss' | 'live' | 'open' | 'disputed';
  stakeLabel: string;
  title: string;
  when: string;
};

export type ResponsibleGamingLimit = {
  currentLabel: string;
  label: string;
  pendingIncreaseLabel?: string;
};

export type ProfileSummary = {
  accountStatus: 'active' | 'limited' | 'restricted';
  avatarInitial: string;
  displayName: string;
  disputes: number;
  earnedLabel: string;
  juryCategories: string[];
  juryOptIn: boolean;
  kycStatus: 'not_started' | 'pending' | 'verified';
  kycTier: string;
  limits: ResponsibleGamingLimit[];
  maxStakeLabel: string;
  pointsToNextTier: number;
  recentChallenges: RecentChallenge[];
  specialties: string[];
  tier: string;
  trustScore: number;
  winRate: string;
  wins: number;
};
