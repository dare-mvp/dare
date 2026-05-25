export type WalletTransactionType =
  | 'deposit'
  | 'withdrawal_pending'
  | 'stake_lock'
  | 'stake_release'
  | 'payout'
  | 'jury_reward';

export type WalletTransaction = {
  amountKobo: number;
  createdLabel: string;
  direction: 'credit' | 'debit';
  id: string;
  label: string;
  status: 'confirmed' | 'pending' | 'reversed';
  type: WalletTransactionType;
};

export type WalletSummary = {
  activeChallenges: number;
  availableKobo: number;
  dareCoins: number;
  escrowKobo: number;
  maxStakeLabel: string;
  pendingWithdrawalKobo: number;
  tier: string;
  totalEarnedKobo: number;
  trustScore: number;
  transactions: WalletTransaction[];
};
