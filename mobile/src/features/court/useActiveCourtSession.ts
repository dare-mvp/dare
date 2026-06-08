import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../auth/AuthProvider';
import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';
import { isUuid } from '../../lib/ids';
import { activeCourtSession } from '../../mocks/court';
import { CourtSession } from './types';

type CourtSource = 'mock' | 'server';

type ActiveCourtSessionState = {
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  session: CourtSession | null;
  source: CourtSource;
};

type DareRow = {
  challenger_id: string | null;
  category: string;
  duration_seconds: number;
  dare_type?: 'skill' | 'task';
  id: string;
  issuer_id: string;
  resolution_type?: 'answer_key' | 'witnessed' | 'evidence';
  reward_amount?: number;
  stake_amount: number;
  status: string;
  title: string;
  updated_at: string;
};

type CourtSessionRow = {
  phase: string;
  player_a_heartbeat_at: string | null;
  player_a_ready: boolean;
  player_b_heartbeat_at: string | null;
  player_b_ready: boolean;
  score_a: number;
  score_b: number;
  server_end_time: string | null;
  votes_a: number;
  votes_b: number;
};

const activeStatuses = [
  'ready_check',
  'active',
  'awaiting_result',
  'completed',
  'dispute_pending',
  'forfeited',
];

export function useActiveCourtSession(dareId?: string): ActiveCourtSessionState {
  const auth = useAuth();
  const [session, setSession] = useState<CourtSession | null>(() =>
    auth.status === 'authenticated' || auth.status === 'loading' ? null : activeCourtSession,
  );
  const [source, setSource] = useState<CourtSource>(() =>
    auth.status === 'authenticated' || auth.status === 'loading' ? 'server' : 'mock',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(auth.status === 'loading');

  const load = useCallback(async () => {
    if (auth.status === 'loading') {
      setSession(null);
      setSource('server');
      setLoading(true);
      return;
    }

    const userId = auth.user?.id;
    if (auth.status !== 'authenticated' || !supabaseClient || !userId) {
      setSession(activeCourtSession);
      setSource('mock');
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const dareResult = await fetchCourtDare(userId, dareId);
    if (!dareResult.ok) {
      setSession(null);
      setSource('server');
      setError(dareResult.error);
      setLoading(false);
      return;
    }

    if (!dareResult.dare) {
      setSession(null);
      setSource('server');
      setError(null);
      setLoading(false);
      return;
    }

    const courtResult = await fetchCourtSession(dareResult.dare.id);
    if (!courtResult.ok) {
      setSession(null);
      setSource('server');
      setError(courtResult.error);
      setLoading(false);
      return;
    }

    setSession(courtResult.court ? mapCourtSession(dareResult.dare, courtResult.court, userId) : null);
    setSource('server');
    setError(null);
    setLoading(false);
  }, [auth.status, auth.user?.id, dareId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { error, loading, refresh: load, session, source };
}

async function fetchCourtDare(userId: string, dareId?: string) {
  if (!supabaseClient) return { dare: null, error: getLoadUserMessage('court session'), ok: false as const };

  let query = supabaseClient
    .from('dares')
    .select('id,title,category,status,dare_type,resolution_type,stake_amount,reward_amount,duration_seconds,issuer_id,challenger_id,updated_at');

  if (isUuid(dareId)) {
    query = query.eq('id', dareId);
  } else {
    query = query
      .or(`issuer_id.eq.${userId},challenger_id.eq.${userId}`)
      .in('status', activeStatuses)
      .order('updated_at', { ascending: false })
      .limit(1);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { dare: null, error: getLoadUserMessage('court session'), ok: false as const };
  return { dare: data as DareRow | null, error: null, ok: true as const };
}

async function fetchCourtSession(dareId: string) {
  if (!supabaseClient) return { court: null, error: getLoadUserMessage('court session'), ok: false as const };

  const { data, error } = await supabaseClient
    .from('court_sessions')
    .select([
      'phase',
      'player_a_ready',
      'player_b_ready',
      'score_a',
      'score_b',
      'votes_a',
      'votes_b',
      'server_end_time',
      'player_a_heartbeat_at',
      'player_b_heartbeat_at',
    ].join(','))
    .eq('dare_id', dareId)
    .maybeSingle();

  if (error) return { court: null, error: getLoadUserMessage('court session'), ok: false as const };
  return { court: data as CourtSessionRow | null, error: null, ok: true as const };
}

function mapCourtSession(dare: DareRow, court: CourtSessionRow, userId: string): CourtSession {
  const isIssuer = dare.issuer_id === userId;
  const isChallenger = dare.challenger_id === userId;
  const currentHeartbeat = isIssuer ? court.player_a_heartbeat_at : court.player_b_heartbeat_at;

  return {
    ...activeCourtSession,
    challengeType: `${dare.dare_type === 'task' ? 'Task-Based' : 'Skill-Based'} ${formatLabel(dare.category)} DARE - ${formatResolution(dare.resolution_type)}`,
    connectionState: court.phase === 'active' ? 'connected' : 'reconnecting',
    dareType: dare.dare_type ?? 'skill',
    dareId: dare.id,
    heartbeatAgeSeconds: getHeartbeatAgeSeconds(currentHeartbeat),
    phase: mapPhase(court.phase),
    playerA: {
      ...activeCourtSession.playerA,
      isReady: court.player_a_ready,
      isYou: isIssuer,
      name: isIssuer ? 'You' : 'Issuer',
      score: court.score_a,
      tier: isIssuer ? 'Your side' : 'Player A',
      trustScore: 0,
    },
    playerB: {
      ...activeCourtSession.playerB,
      isReady: court.player_b_ready,
      isYou: isChallenger,
      name: isChallenger ? 'You' : dare.dare_type === 'task' ? 'Performer' : 'Challenger',
      score: court.score_b,
      tier: isChallenger ? 'Your side' : 'Player B',
      trustScore: 0,
    },
    potKobo: dare.dare_type === 'task' ? dare.reward_amount ?? 0 : dare.stake_amount * 2,
    resolutionType: dare.resolution_type ?? 'answer_key',
    timeRemainingSeconds: getTimeRemainingSeconds(court.server_end_time, dare.duration_seconds),
    title: dare.title,
    viewerRole: isIssuer ? 'participant_a' : isChallenger ? 'participant_b' : 'spectator',
    votesA: court.votes_a,
    votesB: court.votes_b,
  };
}

function mapPhase(phase: string): CourtSession['phase'] {
  if (phase === 'ready_check' || phase === 'waiting') return 'ready';
  if (phase === 'countdown') return 'countdown';
  if (phase === 'active') return 'active';
  return 'settlement_pending';
}

function getHeartbeatAgeSeconds(value: string | null) {
  if (!value) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
}

function getTimeRemainingSeconds(serverEndTime: string | null, fallbackSeconds: number) {
  if (!serverEndTime) return fallbackSeconds;
  return Math.max(0, Math.round((new Date(serverEndTime).getTime() - Date.now()) / 1000));
}

function formatLabel(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatResolution(value: DareRow['resolution_type']) {
  if (value === 'answer_key') return 'Answer Key';
  if (value === 'witnessed') return 'Witnessed';
  if (value === 'evidence') return 'Evidence';
  return 'Answer Key';
}
