import { useEffect, useState } from 'react';

import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';
import { jurySummary } from '../../mocks/jury';
import { useAuth } from '../auth/AuthProvider';
import { useMe } from '../me/useMe';

type JurySummaryState = {
  activeAssignments: number;
  categories: string[];
  completedVotes: number;
  eligibility: string;
  error: string | null;
  loading: boolean;
  source: 'mock' | 'server';
  trustEarned: number;
};

export function useJurySummary(): JurySummaryState {
  const auth = useAuth();
  const { data } = useMe();
  const [state, setState] = useState<JurySummaryState>(() => ({
    ...(auth.status === 'authenticated' || auth.status === 'loading' ? emptyJurySummary : jurySummary),
    categories: auth.status === 'authenticated' || auth.status === 'loading' ? [] : data.profile.juryCategories,
    error: null,
    loading: auth.status === 'loading',
    source: auth.status === 'authenticated' || auth.status === 'loading' ? 'server' : 'mock',
  }));

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!supabaseClient || auth.status !== 'authenticated') {
        if (mounted) {
          setState({
            ...jurySummary,
            categories: data.profile.juryCategories,
            eligibility: data.capabilities.canJury ? 'Eligible' : 'Locked',
            error: null,
            loading: false,
            source: 'mock',
          });
        }
        return;
      }

      setState((current) => ({ ...current, loading: true }));

      const [activeResult, completedResult] = await Promise.all([
        supabaseClient
          .from('jury_assignments')
          .select('id', { count: 'exact', head: true })
          .in('status', ['assigned', 'claimed']),
        supabaseClient
          .from('jury_votes')
          .select('id', { count: 'exact', head: true }),
      ]);

      if (!mounted) return;

      const error = activeResult.error || completedResult.error ? getLoadUserMessage('jury activity') : null;
      if (error) {
        setState({
          ...emptyJurySummary,
          categories: data.profile.juryCategories,
          eligibility: data.capabilities.canJury ? 'Eligible' : 'Locked',
          error,
          loading: false,
          source: 'server',
        });
        return;
      }

      const completedVotes = completedResult.count ?? 0;
      setState({
        activeAssignments: activeResult.count ?? 0,
        categories: data.profile.juryCategories,
        completedVotes,
        eligibility: data.capabilities.canJury ? 'Eligible' : 'Locked',
        error: null,
        loading: false,
        source: 'server',
        trustEarned: completedVotes * 5,
      });
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [auth.status, data.capabilities.canJury, data.profile.juryCategories]);

  return state;
}

const emptyJurySummary = {
  activeAssignments: 0,
  categories: [],
  completedVotes: 0,
  eligibility: 'Locked',
  trustEarned: 0,
};
