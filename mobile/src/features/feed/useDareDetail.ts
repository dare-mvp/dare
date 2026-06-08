import { useCallback, useEffect, useState } from 'react';

import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { isUuid } from '../../lib/ids';
import { supabaseClient } from '../../lib/supabase/client';
import { getFeaturedDareById } from '../../mocks/home';
import { formatResolutionLabel } from '../create/createLabels';
import type { DareFeedItem } from './components/DareCard';
import { mapPublicDareFeedRow, type PublicDareFeedRow } from './publicDareFeed';

type DetailSource = 'mock' | 'server';

type DareDetailState = {
  dare: DareFeedItem | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  source: DetailSource;
};

const detailColumns = [
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

type ParticipantDareRow = {
  category: string;
  challenger_id: string | null;
  created_at: string;
  id: string;
  issuer_id: string;
  dare_type?: 'skill' | 'task';
  funding_model?: 'two_sided_stake' | 'darer_reward';
  resolution_type: string;
  reward_amount?: number;
  stake_amount: number;
  status: string;
  title: string;
};

type ParticipantCourtRow = {
  phase: string | null;
  score_a: number | null;
  score_b: number | null;
};

export function useDareDetail(id?: string): DareDetailState {
  const [dare, setDare] = useState<DareFeedItem | null>(() => getInitialDare(id));
  const [source, setSource] = useState<DetailSource>(() => (supabaseClient || isUuid(id) ? 'server' : 'mock'));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(id && isUuid(id) && supabaseClient));

  const load = useCallback(async () => {
    if (!id) {
      setDare(null);
      setSource('mock');
      setError('Missing DARE id.');
      setLoading(false);
      return;
    }

    if (!isUuid(id) && !supabaseClient) {
      setDare(getFeaturedDareById(id) ?? null);
      setSource('mock');
      setError(null);
      setLoading(false);
      return;
    }

    if (!isUuid(id)) {
      setDare(null);
      setSource(supabaseClient ? 'server' : 'mock');
      setError('This DARE is not available right now.');
      setLoading(false);
      return;
    }

    if (!supabaseClient) {
      setDare(null);
      setSource('mock');
      setError(getLoadUserMessage('DARE details'));
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabaseClient
      .from('public_dare_feed')
      .select(detailColumns)
      .eq('id', id)
      .maybeSingle();

    if (queryError) {
      setDare(null);
      setSource('server');
      setError(getLoadUserMessage('DARE details'));
      setLoading(false);
      return;
    }

    if (data) {
      setDare(mapPublicDareFeedRow(data as unknown as PublicDareFeedRow));
      setSource('server');
      setError(null);
      setLoading(false);
      return;
    }

    const participantDare = await fetchParticipantDare(id);
    if (!participantDare.ok) {
      setDare(null);
      setSource('server');
      setError(participantDare.error);
      setLoading(false);
      return;
    }

    setDare(participantDare.dare);
    setSource('server');
    setError(participantDare.dare ? null : 'This DARE is not available right now.');
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let mounted = true;

    async function loadMounted() {
      if (!mounted) return;
      await load();
    }

    void loadMounted();

    return () => {
      mounted = false;
    };
  }, [load]);

  useEffect(() => {
    if (!supabaseClient || !isUuid(id)) return undefined;

    const channel = supabaseClient
      .channel(`dare-detail-${id}`)
      .on(
        'postgres_changes',
        { event: '*', filter: `id=eq.${id}`, schema: 'public', table: 'dares' },
        () => {
          void load();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', filter: `dare_id=eq.${id}`, schema: 'public', table: 'court_sessions' },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabaseClient?.removeChannel(channel);
    };
  }, [id, load]);

  return { dare, error, loading, refresh: load, source };
}

function getInitialDare(id?: string) {
  if (!id || isUuid(id) || supabaseClient) return null;
  return getFeaturedDareById(id) ?? null;
}

async function fetchParticipantDare(id: string) {
  if (!supabaseClient) {
    return { dare: null, error: getLoadUserMessage('DARE details'), ok: false as const };
  }

  const { data: dare, error: dareError } = await supabaseClient
    .from('dares')
    .select('id,title,category,dare_type,funding_model,resolution_type,status,stake_amount,reward_amount,created_at,issuer_id,challenger_id')
    .eq('id', id)
    .maybeSingle();

  if (dareError) return { dare: null, error: getLoadUserMessage('DARE details'), ok: false as const };
  if (!dare) return { dare: null, error: null, ok: true as const };

  const { data: court } = await supabaseClient
    .from('court_sessions')
    .select('phase,score_a,score_b')
    .eq('dare_id', id)
    .maybeSingle();

  return {
    dare: mapParticipantDare(dare as unknown as ParticipantDareRow, court as ParticipantCourtRow | null),
    error: null,
    ok: true as const,
  };
}

function mapParticipantDare(row: ParticipantDareRow, court: ParticipantCourtRow | null): DareFeedItem {
  const status = court?.phase === 'disputed' || row.status === 'dispute_pending' || row.status === 'jury_open'
    ? 'disputed'
    : row.status === 'active'
    ? 'active'
    : row.status === 'open'
    ? 'open'
    : row.status === 'targeted_pending'
    ? 'live'
    : row.status === 'ready_check'
    ? 'live'
    : 'completed';

  return {
    actionLabel: status === 'disputed' ? 'Review dispute' : 'View DARE',
    category: formatLabel(row.category),
    createdAgo: row.created_at ? 'Created' : '',
    id: row.id,
    dareType: row.dare_type ?? 'skill',
    fundingModel: row.funding_model ?? (row.dare_type === 'task' ? 'darer_reward' : 'two_sided_stake'),
    playerA: {
      accent: 'ember',
      name: 'Issuer',
      tier: 'Player A',
      trustScore: 0,
    },
    playerB: row.challenger_id ? {
      accent: 'ice',
      name: 'Challenger',
      tier: 'Player B',
      trustScore: 0,
    } : undefined,
    resolution: formatResolutionLabel(row.resolution_type),
    scoreA: court?.score_a ?? undefined,
    scoreB: court?.score_b ?? undefined,
    rewardKobo: row.reward_amount ?? 0,
    stakeKobo: row.stake_amount,
    status,
    title: row.title,
  };
}

function formatLabel(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
