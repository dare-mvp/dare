import { formatRelativeTime } from '../../lib/format/time';
import { formatResolutionLabel } from '../create/createLabels';
import { DareFeedItem, PlayerSummary } from './components/DareCard';

export type PublicDareFeedRow = {
  category: string;
  challenger_trust_score: number | null;
  challenger_username: string | null;
  court_phase: string | null;
  created_at: string;
  description?: string | null;
  dare_type?: 'skill' | 'task';
  funding_model?: 'two_sided_stake' | 'darer_reward';
  id: string;
  issuer_tier: string;
  issuer_trust_score: number;
  issuer_username: string;
  resolution_type: string;
  reward_amount?: number;
  rules?: string | null;
  score_a?: number | null;
  score_b?: number | null;
  stake_amount: number;
  status: string;
  title: string;
};

const accentCycle: PlayerSummary['accent'][] = ['ember', 'info', 'ice', 'win'];

export function mapPublicDareFeedRows(rows: PublicDareFeedRow[]): DareFeedItem[] {
  return rows.map(mapPublicDareFeedRow);
}

export function mapPublicDareFeedRow(row: PublicDareFeedRow): DareFeedItem {
  const status = mapStatus(row.status, row.court_phase);
  const issuer = mapPlayer(row.issuer_username, row.issuer_tier, row.issuer_trust_score, row.id);
  const challenger = row.challenger_username
    ? mapPlayer(row.challenger_username, 'Challenger', row.challenger_trust_score ?? 0, `${row.id}-b`)
    : undefined;

  return {
    actionLabel: getActionLabel(status),
    category: formatLabel(row.category),
    courtPhase: row.court_phase,
    createdAgo: formatRelativeTime(row.created_at),
    description: row.description ?? null,
    dareType: row.dare_type ?? 'skill',
    fundingModel: row.funding_model ?? (row.dare_type === 'task' ? 'darer_reward' : 'two_sided_stake'),
    id: row.id,
    playerA: issuer,
    playerB: challenger,
    resolution: formatResolutionLabel(row.resolution_type),
    scoreA: row.score_a ?? undefined,
    scoreB: row.score_b ?? undefined,
    rewardKobo: row.reward_amount ?? 0,
    rules: row.rules ?? null,
    stakeKobo: row.stake_amount,
    status,
    title: row.title,
  };
}

function mapPlayer(username: string, tier: string, trustScore: number, seed: string): PlayerSummary {
  return {
    accent: accentCycle[hash(seed) % accentCycle.length] ?? 'ember',
    name: username,
    tier,
    trustScore,
  };
}

function mapStatus(status: string, courtPhase: string | null): DareFeedItem['status'] {
  if (courtPhase === 'ready_check' || courtPhase === 'countdown') return 'live';
  if (status === 'open') return 'open';
  if (status === 'ready_check') return 'live';
  if (status === 'targeted_pending') return 'live';
  if (status === 'active') return 'active';
  if (status === 'completed' || status === 'settled') return 'completed';
  if (status === 'jury_open' || status === 'disputed') return 'disputed';
  return 'completed';
}

function getActionLabel(status: DareFeedItem['status']) {
  if (status === 'open') return 'Accept this DARE';
  if (status === 'live') return 'Court starting soon';
  if (status === 'active') return 'Join audience';
  if (status === 'disputed') return 'Jury reviewing';
  return 'View result';
}

function formatLabel(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hash(value: string) {
  return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
}
