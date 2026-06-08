import { useEffect, useState } from 'react';

import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';
import { walletSummary } from '../../mocks/wallet';
import { useAuth } from '../auth/AuthProvider';
import { LedgerEntryRow, mapLedgerEntry } from './ledgerEntries';
import { WalletTransaction } from './types';

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
    loading: auth.status === 'loading',
    source: auth.status === 'authenticated' || auth.status === 'loading' ? 'server' : 'mock',
    transaction: auth.status === 'authenticated' || auth.status === 'loading' ? null : getPreviewTransaction(id),
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

      if (auth.status === 'authenticated' && (!supabaseClient || !isUuid(id))) {
        if (mounted) {
          setState({
            error: isUuid(id) ? getLoadUserMessage('transaction details') : null,
            loading: false,
            source: 'server',
            transaction: null,
          });
        }
        return;
      }

      if (auth.status !== 'authenticated') {
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

      const client = supabaseClient;
      if (!client) {
        if (mounted) {
          setState({
            error: getLoadUserMessage('transaction details'),
            loading: false,
            source: 'server',
            transaction: null,
          });
        }
        return;
      }

      setState((current) => ({ ...current, loading: true }));

      const { data, error } = await client
        .from('ledger_entries')
        .select('id,type,direction,amount,status,metadata,created_at,dare_id,currency')
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
