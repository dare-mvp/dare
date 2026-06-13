import { getWalletTransactionCopy } from './transactionCopy';
import { WalletTransaction, WalletTransactionStatus } from './types';

export type LedgerEntryRow = {
  amount: number;
  created_at: string;
  currency?: string;
  dare_id?: string | null;
  direction: 'credit' | 'debit';
  id: string;
  metadata: Record<string, unknown> | null;
  status: string;
  type: string;
};

export function mapLedgerEntry(row: LedgerEntryRow): WalletTransaction {
  const copy = getWalletTransactionCopy({
    amountKobo: row.amount,
    dareId: row.dare_id ?? null,
    direction: row.direction,
    id: row.id,
    metadata: row.metadata,
    rawType: row.type,
    status: row.status,
  });

  return {
    amountKobo: row.amount,
    createdLabel: formatCreatedLabel(row.created_at),
    description: copy.description,
    details: copy.details,
    direction: row.direction,
    id: row.id,
    label: copy.label,
    rawType: row.type,
    referenceLabel: copy.referenceLabel,
    status: mapLedgerStatus(row.status),
    type: copy.type,
  };
}

function mapLedgerStatus(status: string): WalletTransactionStatus {
  if (status === 'posted') return 'confirmed';
  if (status === 'failed') return 'failed';
  if (status === 'reversed') return 'reversed';
  if (status === 'voided') return 'voided';
  return 'pending';
}

function formatCreatedLabel(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}
