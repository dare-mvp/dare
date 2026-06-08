import { MeResponse } from '../../lib/actions/endpoints';
import { profileSummary } from '../../mocks/profile';
import { walletSummary } from '../../mocks/wallet';
import { ProfileSummary } from '../profile/types';
import { WalletSummary } from '../wallet/types';
import { formatNgnCompactFromKobo, formatNgnFromKobo } from './format';
import { MeState } from './types';

const previewCapabilities = {
  canAcceptDare: true,
  canCreateDare: true,
  canDeposit: true,
  canJury: true,
  canUpdateProfile: true,
  canWithdraw: true,
};

const emptyCapabilities = {
  canAcceptDare: false,
  canCreateDare: false,
  canDeposit: false,
  canJury: false,
  canUpdateProfile: false,
  canWithdraw: false,
};

const emptyWalletSummary: WalletSummary = {
  activeChallenges: 0,
  availableKobo: 0,
  dareCoins: 0,
  escrowKobo: 0,
  heldKobo: 0,
  maxStakeLabel: 'No stake limit set',
  pendingWithdrawalKobo: 0,
  tier: 'Newcomer',
  totalEarnedKobo: 0,
  trustScore: 0,
  transactions: [],
};

const emptyProfileSummary: ProfileSummary = {
  accountStatus: 'limited',
  avatarInitial: 'D',
  displayName: 'DARE account',
  disputes: 0,
  earnedLabel: formatNgnCompactFromKobo(0),
  juryCategories: [],
  juryOptIn: false,
  kycStatus: 'not_started',
  kycTier: 'KYC not started',
  limits: [
    {
      currentLabel: 'No daily limit set',
      label: 'Daily deposit limit',
    },
    {
      currentLabel: 'No stake limit set',
      label: 'Max stake per DARE',
    },
    {
      currentLabel: 'Not active',
      label: 'Self-exclusion',
    },
  ],
  maxStakeLabel: 'No stake limit set',
  pointsToNextTier: 0,
  recentChallenges: [],
  specialties: [],
  tier: 'Newcomer',
  trustScore: 0,
  winRate: '0%',
  wins: 0,
};

export function createPreviewMeState(): MeState {
  return {
    capabilities: previewCapabilities,
    profile: profileSummary,
    source: 'mock',
    user: null,
    wallet: walletSummary,
  };
}

export function createEmptyMeState(): MeState {
  return {
    capabilities: emptyCapabilities,
    profile: emptyProfileSummary,
    source: 'server',
    user: null,
    wallet: emptyWalletSummary,
  };
}

export function normalizeMeResponse(payload: MeResponse): MeState {
  const wallet = normalizeWallet(payload);
  const profile = normalizeProfile(payload, wallet);

  return {
    capabilities: {
      ...payload.capabilities,
      canDeposit: payload.capabilities.canDeposit ?? payload.capabilities.canCreateDare,
    },
    profile,
    source: 'server',
    user: payload.user,
    wallet,
  };
}

function normalizeWallet(payload: MeResponse): WalletSummary {
  const wallet = payload.wallet;

  if (!wallet) {
    return {
      ...emptyWalletSummary,
      maxStakeLabel: formatMaxStake(payload.responsibleGaming.maxStakePerDare),
      tier: payload.user.tier,
      trustScore: payload.user.trustScore,
    };
  }

  return {
    ...emptyWalletSummary,
    availableKobo: wallet.available,
    escrowKobo: wallet.escrowed,
    heldKobo: wallet.held,
    maxStakeLabel: formatMaxStake(payload.responsibleGaming.maxStakePerDare),
    pendingWithdrawalKobo: wallet.pendingWithdrawal,
    tier: payload.user.tier,
    trustScore: payload.user.trustScore,
  };
}

function normalizeProfile(payload: MeResponse, wallet: WalletSummary): ProfileSummary {
  const user = payload.user;
  const completed = user.wins + user.losses;
  const displayName = user.displayName || user.username || emptyProfileSummary.displayName;
  const juryCategories = user.juryCategories;

  return {
    ...emptyProfileSummary,
    accountStatus: normalizeAccountStatus(user.accountStatus),
    avatarInitial: getInitial(displayName),
    displayName,
    disputes: user.disputes,
    earnedLabel: formatNgnCompactFromKobo(wallet.totalEarnedKobo),
    juryCategories,
    juryOptIn: user.juryOptIn,
    kycStatus: normalizeKycStatus(user.kycTier),
    kycTier: formatKycTier(user.kycTier),
    limits: [
      {
        currentLabel: formatLimit(payload.responsibleGaming.dailyDepositLimit, 'No daily limit set'),
        label: 'Daily deposit limit',
      },
      {
        currentLabel: formatLimit(payload.responsibleGaming.maxStakePerDare, 'No stake limit set'),
        label: 'Max stake per DARE',
      },
      {
        currentLabel: payload.responsibleGaming.selfExcluded ? 'Active' : 'Not active',
        label: 'Self-exclusion',
      },
    ],
    maxStakeLabel: formatMaxStake(payload.responsibleGaming.maxStakePerDare),
    specialties: juryCategories.map(formatCategory),
    tier: user.tier,
    trustScore: user.trustScore,
    winRate: formatWinRate(user.wins, completed),
    wins: user.wins,
  };
}

function formatLimit(amountKobo: number | null, fallback: string) {
  return amountKobo === null ? fallback : formatNgnFromKobo(amountKobo);
}

function formatMaxStake(amountKobo: number | null) {
  return amountKobo === null ? emptyWalletSummary.maxStakeLabel : formatNgnCompactFromKobo(amountKobo);
}

function formatWinRate(wins: number, total: number) {
  if (total <= 0) return emptyProfileSummary.winRate;
  return `${Math.round((wins / total) * 100)}%`;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || emptyProfileSummary.avatarInitial;
}

function normalizeAccountStatus(status: string): ProfileSummary['accountStatus'] {
  if (status === 'active') return 'active';
  if (['blocked', 'restricted', 'suspended'].includes(status)) return 'restricted';
  return 'limited';
}

function normalizeKycStatus(kycTier: string): ProfileSummary['kycStatus'] {
  if (kycTier === 'kyc0') return 'not_started';
  if (kycTier.includes('pending')) return 'pending';
  return 'verified';
}

function formatKycTier(kycTier: string) {
  if (kycTier === 'kyc0') return 'KYC not started';
  return kycTier.replace(/^kyc/i, 'Tier ');
}

function formatCategory(category: string) {
  return category.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
