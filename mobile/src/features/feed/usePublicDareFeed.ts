import { useCallback, useEffect, useState } from 'react';

import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';
import { featuredDares } from '../../mocks/home';
import type { DareFeedItem } from './components/DareCard';
import { mapPublicDareFeedRows, type PublicDareFeedRow } from './publicDareFeed';

type FeedSource = 'mock' | 'server';

type PublicDareFeedState = {
  error: string | null;
  items: DareFeedItem[];
  lastSyncedAt: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  source: FeedSource;
};

const feedColumns = [
  'id',
  'title',
  'category',
  'dare_type',
  'funding_model',
  'resolution_type',
  'status',
  'stake_amount',
  'reward_amount',
  'created_at',
  'issuer_username',
  'issuer_trust_score',
  'issuer_tier',
  'challenger_username',
  'challenger_trust_score',
  'score_a',
  'score_b',
  'court_phase',
].join(',');

export function usePublicDareFeed(): PublicDareFeedState {
  const [items, setItems] = useState<DareFeedItem[]>(() => (supabaseClient ? [] : featuredDares));
  const [source, setSource] = useState<FeedSource>(() => (supabaseClient ? 'server' : 'mock'));
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(supabaseClient));

  const fetchFeed = useCallback(async () => {
    if (!supabaseClient) {
      setItems(featuredDares);
      setSource('mock');
      setError(null);
      setLastSyncedAt(new Date().toISOString());
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await fetchPublicDareRows();

    if (queryError) {
      setItems([]);
      setSource('server');
      setError(getLoadUserMessage('DARE feed'));
      setLoading(false);
      return;
    }

    setItems(mapPublicDareFeedRows((data ?? []) as unknown as PublicDareFeedRow[]));
    setSource('server');
    setError(null);
    setLastSyncedAt(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!supabaseClient) {
        if (mounted) {
          setItems(featuredDares);
          setSource('mock');
          setError(null);
          setLastSyncedAt(new Date().toISOString());
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const { data, error: queryError } = await fetchPublicDareRows();

      if (!mounted) return;

      if (queryError) {
        setItems([]);
        setSource('server');
        setError(getLoadUserMessage('DARE feed'));
      } else {
        setItems(mapPublicDareFeedRows((data ?? []) as unknown as PublicDareFeedRow[]));
        setSource('server');
        setError(null);
        setLastSyncedAt(new Date().toISOString());
      }

      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!supabaseClient) return undefined;

    const channel = supabaseClient
      .channel('public-dare-feed-refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dares' },
        () => {
          void fetchFeed();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'court_sessions' },
        () => {
          void fetchFeed();
        },
      )
      .subscribe();

    return () => {
      void supabaseClient?.removeChannel(channel);
    };
  }, [fetchFeed]);

  return { error, items, lastSyncedAt, loading, refresh: fetchFeed, source };
}

function fetchPublicDareRows() {
  if (!supabaseClient) {
    return Promise.resolve({ data: null, error: new Error('Supabase is not configured.') });
  }

  return supabaseClient
    .from('public_dare_feed')
    .select(feedColumns)
    .order('created_at', { ascending: false })
    .limit(20);
}
