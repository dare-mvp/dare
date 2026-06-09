import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../auth/AuthProvider';
import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';
import { isUuid } from '../../lib/ids';
import { activeCourtSession } from '../../mocks/court';
import { withCourtLiveRoom } from './liveRoom';
import { CourtDareStatus, CourtEvidenceSummary, CourtJuryCaseSummary, CourtResultClaimSummary, CourtSession } from './types';

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
  status: CourtDareStatus;
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

type EvidenceObjectRow = {
  byte_size: number | null;
  created_at: string;
  id: string;
  status: string;
  uploaded_at: string | null;
  user_id: string;
};

type ResultClaimRow = {
  claimed_outcome: string;
  created_at: string;
  evidence_object_ids: string[] | null;
  id: string;
  user_id: string;
};

type JuryCaseRow = {
  evidence_a_id: string | null;
  evidence_b_id: string | null;
  id: string;
  opened_at: string;
  status: string;
  verdict: string | null;
  votes_needed: number;
};

type CourtMetadata = {
  evidence: CourtEvidenceSummary;
  juryCase: CourtJuryCaseSummary | null;
  resultClaims: CourtResultClaimSummary;
};

const activeStatuses = [
  'ready_check',
  'active',
  'awaiting_result',
  'completed',
  'dispute_pending',
  'forfeited',
  'jury_open',
  'settled',
  'settlement_pending',
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

    const metadata = await fetchCourtMetadata(dareResult.dare.id, userId);
    setSession(courtResult.court ? mapCourtSession(dareResult.dare, courtResult.court, userId, metadata) : null);
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

async function fetchCourtMetadata(dareId: string, userId: string): Promise<CourtMetadata> {
  if (!supabaseClient) return createEmptyMetadata();

  const [evidenceResult, claimsResult, juryResult] = await Promise.all([
    supabaseClient
      .from('evidence_objects')
      .select('id,user_id,status,byte_size,uploaded_at,created_at')
      .eq('dare_id', dareId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false }),
    supabaseClient
      .from('dare_result_claims')
      .select('id,user_id,claimed_outcome,evidence_object_ids,created_at')
      .eq('dare_id', dareId)
      .order('created_at', { ascending: false }),
    supabaseClient
      .from('jury_cases')
      .select('id,status,verdict,votes_needed,opened_at,evidence_a_id,evidence_b_id')
      .eq('dare_id', dareId)
      .not('status', 'in', '("closed","voided")')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const evidenceRows = evidenceResult.error ? [] : (evidenceResult.data as EvidenceObjectRow[] | null) ?? [];
  const claimRows = claimsResult.error ? [] : (claimsResult.data as ResultClaimRow[] | null) ?? [];
  const juryRow = juryResult.error ? null : juryResult.data as JuryCaseRow | null;

  return {
    evidence: mapEvidenceSummary(evidenceRows, userId),
    juryCase: juryRow ? mapJuryCaseSummary(juryRow) : null,
    resultClaims: mapResultClaimSummary(claimRows, userId),
  };
}

function mapCourtSession(
  dare: DareRow,
  court: CourtSessionRow,
  userId: string,
  metadata: CourtMetadata,
): CourtSession {
  const isIssuer = dare.issuer_id === userId;
  const isChallenger = dare.challenger_id === userId;
  const currentHeartbeat = isIssuer ? court.player_a_heartbeat_at : court.player_b_heartbeat_at;
  const heartbeatAgeSeconds = getHeartbeatAgeSeconds(currentHeartbeat);

  return withCourtLiveRoom({
    ...activeCourtSession,
    challengeType: `${dare.dare_type === 'task' ? 'Task-Based' : 'Skill-Based'} ${formatLabel(dare.category)} DARE - ${formatResolution(dare.resolution_type)}`,
    connectionState: court.phase === 'active' && heartbeatAgeSeconds > 30 ? 'reconnecting' : 'connected',
    dareType: dare.dare_type ?? 'skill',
    dareId: dare.id,
    evidence: metadata.evidence,
    heartbeatAgeSeconds,
    juryCase: metadata.juryCase,
    phase: mapPhase(court.phase, dare.status),
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
    resultClaims: metadata.resultClaims,
    status: dare.status,
    timeRemainingSeconds: getTimeRemainingSeconds(court.server_end_time, dare.duration_seconds),
    title: dare.title,
    viewerRole: isIssuer ? 'participant_a' : isChallenger ? 'participant_b' : 'spectator',
    votesA: court.votes_a,
    votesB: court.votes_b,
  });
}

function mapPhase(phase: string, status: CourtDareStatus): CourtSession['phase'] {
  if (status === 'settled') return 'settled';
  if (status === 'jury_open') return 'disputed';
  if (status === 'dispute_pending') return 'disputed';
  if (status === 'settlement_pending' || status === 'completed') return 'settlement_pending';
  if (phase === 'ready_check' || phase === 'waiting') return 'ready';
  if (phase === 'countdown') return 'countdown';
  if (phase === 'active') return 'active';
  if (phase === 'awaiting_result') return 'awaiting_result';
  if (phase === 'disputed') return 'disputed';
  if (phase === 'completed') return 'settlement_pending';
  return 'settlement_pending';
}

function createEmptyMetadata(): CourtMetadata {
  return {
    evidence: {
      latestSubmittedAt: null,
      submittedCount: 0,
      totalCount: 0,
      uploadedCount: 0,
      viewerSubmittedCount: 0,
    },
    juryCase: null,
    resultClaims: {
      claimsCount: 0,
      evidenceObjectCount: 0,
      latestClaimedOutcome: null,
      latestSubmittedAt: null,
      viewerClaimed: false,
    },
  };
}

function mapEvidenceSummary(rows: EvidenceObjectRow[], userId: string): CourtEvidenceSummary {
  const uploadedRows = rows.filter((row) => row.status === 'uploaded' || row.status === 'accepted');
  return {
    latestSubmittedAt: uploadedRows[0]?.uploaded_at ?? uploadedRows[0]?.created_at ?? null,
    submittedCount: uploadedRows.length,
    totalCount: rows.length,
    uploadedCount: uploadedRows.length,
    viewerSubmittedCount: uploadedRows.filter((row) => row.user_id === userId).length,
  };
}

function mapResultClaimSummary(rows: ResultClaimRow[], userId: string): CourtResultClaimSummary {
  return {
    claimsCount: rows.length,
    evidenceObjectCount: rows.reduce((total, row) => total + (row.evidence_object_ids?.length ?? 0), 0),
    latestClaimedOutcome: rows[0]?.claimed_outcome ?? null,
    latestSubmittedAt: rows[0]?.created_at ?? null,
    viewerClaimed: rows.some((row) => row.user_id === userId),
  };
}

function mapJuryCaseSummary(row: JuryCaseRow): CourtJuryCaseSummary {
  return {
    evidenceCount: Number(Boolean(row.evidence_a_id)) + Number(Boolean(row.evidence_b_id)),
    id: row.id,
    openedAt: row.opened_at,
    status: row.status,
    verdict: row.verdict,
    votesNeeded: row.votes_needed,
  };
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
