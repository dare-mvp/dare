export type WalletTransactionType =
  | 'deposit'
  | 'adjustment'
  | 'bonus_credit'
  | 'platform_fee'
  | 'reversal'
  | 'withdrawal_pending'
  | 'stake_lock'
  | 'stake_release'
  | 'payout'
  | 'jury_reward';

export type WalletTransactionStatus = 'confirmed' | 'failed' | 'pending' | 'reversed' | 'voided';

export type WalletTransactionDetail = {
  label: string;
  value: string;
};

export type WalletTransaction = {
  amountKobo: number;
  createdLabel: string;
  description: string;
  details: WalletTransactionDetail[];
  direction: 'credit' | 'debit';
  id: string;
  label: string;
  referenceLabel: string;
  rawType: string;
  status: WalletTransactionStatus;
  type: WalletTransactionType;
};

export type WalletSummary = {
  activeChallenges: number;
  availableKobo: number;
  dareCoins: number;
  escrowKobo: number;
  heldKobo: number;
  maxStakeLabel: string;
  pendingWithdrawalKobo: number;
  tier: string;
  totalEarnedKobo: number;
  trustScore: number;
  transactions: WalletTransaction[];
};
