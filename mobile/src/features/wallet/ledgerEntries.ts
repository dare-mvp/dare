import { WalletTransaction, WalletTransactionType } from './types';

export type LedgerEntryRow = {
  amount: number;
  created_at: string;
  direction: 'credit' | 'debit';
  id: string;
  metadata: Record<string, unknown> | null;
  status: string;
  type: string;
};

export function mapLedgerEntry(row: LedgerEntryRow): WalletTransaction {
  return {
    amountKobo: row.amount,
    createdLabel: formatCreatedLabel(row.created_at),
    direction: row.direction,
    id: row.id,
    label: getLedgerLabel(row),
    status: mapLedgerStatus(row.status),
    type: mapLedgerType(row.type),
  };
}

function getLedgerLabel(row: LedgerEntryRow) {
  const metadataLabel = typeof row.metadata?.label === 'string' ? row.metadata.label : null;
  if (metadataLabel) return metadataLabel;

  return row.type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mapLedgerStatus(status: string): WalletTransaction['status'] {
  if (status === 'posted') return 'confirmed';
  if (status === 'reversed') return 'reversed';
  return 'pending';
}

function mapLedgerType(type: string): WalletTransactionType {
  if (type === 'deposit_confirmed') return 'deposit';
  if (type === 'withdrawal_pending' || type === 'withdrawal_completed') return 'withdrawal_pending';
  if (type === 'escrow_hold') return 'stake_lock';
  if (type === 'escrow_release') return 'stake_release';
  if (type === 'juror_reward') return 'jury_reward';
  return 'payout';
}

function formatCreatedLabel(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}
