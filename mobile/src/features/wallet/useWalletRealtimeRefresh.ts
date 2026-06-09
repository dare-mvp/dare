import { useEffect } from 'react';

import { supabaseClient } from '../../lib/supabase/client';
import { uniqueRealtimeChannelName } from '../../lib/supabase/realtimeChannel';
import { useAuth } from '../auth/AuthProvider';

export function useWalletRealtimeRefresh(onRefresh: () => void) {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;

  useEffect(() => {
    if (auth.status !== 'authenticated' || !userId || !supabaseClient) return undefined;

    const channel = supabaseClient
      .channel(uniqueRealtimeChannelName(`wallet-summary-${userId}`))
      .on(
        'postgres_changes',
        { event: '*', filter: `user_id=eq.${userId}`, schema: 'public', table: 'wallet_accounts' },
        onRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', filter: `user_id=eq.${userId}`, schema: 'public', table: 'ledger_entries' },
        onRefresh,
      )
      .subscribe();

    return () => {
      void supabaseClient?.removeChannel(channel);
    };
  }, [auth.status, onRefresh, userId]);
}
