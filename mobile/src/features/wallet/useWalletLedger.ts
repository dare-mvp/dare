import { useCallback, useEffect, useState } from 'react';

import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';
import { walletSummary } from '../../mocks/wallet';
import { useAuth } from '../auth/AuthProvider';
import { LedgerEntryRow, mapLedgerEntry } from './ledgerEntries';
import { WalletTransaction } from './types';

type WalletLedgerState = {
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  source: 'mock' | 'server';
  transactions: WalletTransaction[];
};

const ledgerColumns = 'id,type,direction,amount,status,metadata,created_at,dare_id,currency';

export function useWalletLedger(): WalletLedgerState {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const [state, setState] = useState<Omit<WalletLedgerState, 'refresh'>>(() =>
    auth.status === 'authenticated' || auth.status === 'loading'
      ? { error: null, loading: auth.status === 'loading', source: 'server', transactions: [] }
      : { error: null, loading: false, source: 'mock', transactions: walletSummary.transactions },
  );

  const refresh = useCallback(async () => {
    if (auth.status === 'loading') {
      setState({ error: null, loading: true, source: 'server', transactions: [] });
      return;
    }

    if (auth.status !== 'authenticated' || !supabaseClient) {
      setState({ error: null, loading: false, source: 'mock', transactions: walletSummary.transactions });
      return;
    }

    setState((current) => ({ ...current, loading: true, source: 'server', transactions: [] }));
    const { data, error } = await fetchLedgerRows();

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
  }, [auth.status]);

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
      const { data, error } = await fetchLedgerRows();

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

  useEffect(() => {
    if (auth.status !== 'authenticated' || !userId || !supabaseClient) return undefined;

    const channel = supabaseClient
      .channel(`wallet-ledger-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', filter: `user_id=eq.${userId}`, schema: 'public', table: 'ledger_entries' },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabaseClient?.removeChannel(channel);
    };
  }, [auth.status, refresh, userId]);

  return { ...state, refresh };
}

function fetchLedgerRows() {
  if (!supabaseClient) {
    return Promise.resolve({ data: null, error: new Error('Supabase is not configured.') });
  }

  return supabaseClient
    .from('ledger_entries')
    .select(ledgerColumns)
    .order('created_at', { ascending: false })
    .limit(20);
}
