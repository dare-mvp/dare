import { useCallback, useEffect, useState } from 'react';

import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';
import { featuredDares } from '../../mocks/home';
import { DareFeedItem } from './components/DareCard';
import { mapPublicDareFeedRows, PublicDareFeedRow } from './publicDareFeed';

type FeedSource = 'mock' | 'server';

type PublicDareFeedState = {
  error: string | null;
  items: DareFeedItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  source: FeedSource;
};

export function usePublicDareFeed(): PublicDareFeedState {
  const [items, setItems] = useState<DareFeedItem[]>(featuredDares);
  const [source, setSource] = useState<FeedSource>('mock');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(supabaseClient));

  const fetchFeed = useCallback(async () => {
    if (!supabaseClient) {
      setItems(featuredDares);
      setSource('mock');
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabaseClient
      .from('public_dare_feed')
      .select([
        'id',
        'title',
        'category',
        'resolution_type',
        'status',
        'stake_amount',
        'created_at',
        'issuer_username',
        'issuer_trust_score',
        'issuer_tier',
        'challenger_username',
        'challenger_trust_score',
        'court_phase',
      ].join(','))
      .order('created_at', { ascending: false })
      .limit(20);

    if (queryError) {
      setItems(featuredDares);
      setSource('mock');
      setError(getLoadUserMessage('DARE feed'));
      setLoading(false);
      return;
    }

    setItems(mapPublicDareFeedRows((data ?? []) as unknown as PublicDareFeedRow[]));
    setSource('server');
    setError(null);
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
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const { data, error: queryError } = await supabaseClient
        .from('public_dare_feed')
        .select([
          'id',
          'title',
          'category',
          'resolution_type',
          'status',
          'stake_amount',
          'created_at',
          'issuer_username',
          'issuer_trust_score',
          'issuer_tier',
          'challenger_username',
          'challenger_trust_score',
          'court_phase',
        ].join(','))
        .order('created_at', { ascending: false })
        .limit(20);

      if (!mounted) return;

      if (queryError) {
        setItems(featuredDares);
        setSource('mock');
        setError(getLoadUserMessage('DARE feed'));
      } else {
        setItems(mapPublicDareFeedRows((data ?? []) as unknown as PublicDareFeedRow[]));
        setSource('server');
        setError(null);
      }

      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return { error, items, loading, refresh: fetchFeed, source };
}
