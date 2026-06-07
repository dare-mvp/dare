import { useEffect, useState } from 'react';

import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';
import { walletSummary } from '../../mocks/wallet';
import { useAuth } from '../auth/AuthProvider';
import { WalletTransaction, WalletTransactionType } from './types';

type LedgerEntryRow = {
  amount: number;
  created_at: string;
  direction: 'credit' | 'debit';
  id: string;
  metadata: Record<string, unknown> | null;
  status: string;
  type: string;
};

type WalletTransactionState = {
  error: string | null;
  loading: boolean;
  source: 'mock' | 'server';
  transaction: WalletTransaction | null;
};

export function useWalletTransaction(id?: string): WalletTransactionState {
  const auth = useAuth();
  const [state, setState] = useState<WalletTransactionState>(() => ({
    error: null,
    loading: false,
    source: 'mock',
    transaction: getPreviewTransaction(id),
  }));

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        if (mounted) {
          setState({ error: null, loading: false, source: 'mock', transaction: null });
        }
        return;
      }

      if (!supabaseClient || auth.status !== 'authenticated' || !isUuid(id)) {
        if (mounted) {
          setState({
            error: null,
            loading: false,
            source: 'mock',
            transaction: getPreviewTransaction(id),
          });
        }
        return;
      }

      setState((current) => ({ ...current, loading: true }));

      const { data, error } = await supabaseClient
        .from('ledger_entries')
        .select('id,type,direction,amount,status,metadata,created_at')
        .eq('id', id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setState({
          error: getLoadUserMessage('transaction details'),
          loading: false,
          source: 'server',
          transaction: null,
        });
        return;
      }

      setState({
        error: null,
        loading: false,
        source: 'server',
        transaction: data ? mapLedgerEntry(data as LedgerEntryRow) : null,
      });
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [auth.status, id]);

  return state;
}

function getPreviewTransaction(id?: string) {
  return walletSummary.transactions.find((item) => item.id === id) ?? null;
}

function mapLedgerEntry(row: LedgerEntryRow): WalletTransaction {
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
