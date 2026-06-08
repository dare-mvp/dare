import { useEffect, useState } from 'react';

import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';
import { walletSummary } from '../../mocks/wallet';
import { useAuth } from '../auth/AuthProvider';
import { LedgerEntryRow, mapLedgerEntry } from './ledgerEntries';
import { WalletTransaction } from './types';

type WalletLedgerState = {
  error: string | null;
  loading: boolean;
  source: 'mock' | 'server';
  transactions: WalletTransaction[];
};

const ledgerColumns = 'id,type,direction,amount,status,metadata,created_at';

export function useWalletLedger(): WalletLedgerState {
  const auth = useAuth();
  const [state, setState] = useState<WalletLedgerState>(() =>
    auth.status === 'authenticated' || auth.status === 'loading'
      ? { error: null, loading: auth.status === 'loading', source: 'server', transactions: [] }
      : { error: null, loading: false, source: 'mock', transactions: walletSummary.transactions },
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (auth.status === 'loading') {
        if (mounted) setState({ error: null, loading: true, source: 'server', transactions: [] });
        return;
      }

      if (auth.status !== 'authenticated' || !supabaseClient) {
        if (mounted) {
          setState({ error: null, loading: false, source: 'mock', transactions: walletSummary.transactions });
        }
        return;
      }

      setState((current) => ({ ...current, loading: true, source: 'server', transactions: [] }));
      const { data, error } = await supabaseClient
        .from('ledger_entries')
        .select(ledgerColumns)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!mounted) return;

      if (error) {
        setState({
          error: getLoadUserMessage('wallet ledger'),
          loading: false,
          source: 'server',
          transactions: [],
        });
        return;
      }

      setState({
        error: null,
        loading: false,
        source: 'server',
        transactions: ((data ?? []) as LedgerEntryRow[]).map(mapLedgerEntry),
      });
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [auth.status]);

  return state;
}
