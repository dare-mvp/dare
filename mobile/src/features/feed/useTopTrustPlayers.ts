import { useCallback, useEffect, useState } from 'react';

import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';

export type TopTrustPlayer = {
  avatarColor: string | null;
  avatarEmoji: string | null;
  completedDares: number;
  lastActiveAt: string | null;
  rankingScore: number;
  recentDares: number;
  tier: string;
  topCategory: string | null;
  trustScore: number;
  userId: string;
  username: string;
};

type PublicActivePlayerRow = {
  avatar_color: string | null;
  avatar_emoji: string | null;
  completed_dares: number | null;
  last_active_at: string | null;
  ranking_score: number | null;
  recent_dares: number | null;
  tier: string;
  top_category: string | null;
  trust_score: number;
  user_id: string;
  username: string;
};

type TopTrustPlayersState = {
  error: string | null;
  loading: boolean;
  players: TopTrustPlayer[];
  refresh: () => Promise<void>;
};

const topTrustColumns = [
  'user_id',
  'username',
  'avatar_emoji',
  'avatar_color',
  'trust_score',
  'tier',
  'recent_dares',
  'completed_dares',
  'last_active_at',
  'top_category',
  'ranking_score',
].join(',');

export function useTopTrustPlayers(limit = 5): TopTrustPlayersState {
  const [players, setPlayers] = useState<TopTrustPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(supabaseClient));

  const load = useCallback(async () => {
    if (!supabaseClient) {
      setPlayers([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabaseClient
      .from('public_active_players')
      .select(topTrustColumns)
      .order('ranking_score', { ascending: false })
      .order('last_active_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (queryError) {
      setPlayers([]);
      setError(getLoadUserMessage('active players'));
      setLoading(false);
      return;
    }

    setPlayers(((data ?? []) as unknown as PublicActivePlayerRow[]).map(mapTopTrustPlayer));
    setError(null);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    let mounted = true;

    async function loadMounted() {
      await load();
      if (!mounted) return;
    }

    void loadMounted();

    return () => {
      mounted = false;
    };
  }, [load]);

  return { error, loading, players, refresh: load };
}

function mapTopTrustPlayer(row: PublicActivePlayerRow): TopTrustPlayer {
  return {
    avatarColor: row.avatar_color,
    avatarEmoji: row.avatar_emoji,
    completedDares: row.completed_dares ?? 0,
    lastActiveAt: row.last_active_at,
    rankingScore: row.ranking_score ?? row.trust_score,
    recentDares: row.recent_dares ?? 0,
    tier: row.tier,
    topCategory: row.top_category,
    trustScore: row.trust_score,
    userId: row.user_id,
    username: row.username,
  };
}
