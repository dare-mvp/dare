import type { DareFeedItem, PlayerSummary } from './components/DareCard';
import type { SocialProofActivityResponse } from '../../lib/actions/endpoints';

export type SocialProofSummary = {
  activeCourts: number;
  completedDares: number;
  openDares: number;
  topCategory: string | null;
  topTrustedPlayer: {
    name: string;
    score: number;
  } | null;
};

type RuntimeFeedItem = Partial<DareFeedItem> | null | undefined;

export function getSocialProofSummary(items: RuntimeFeedItem[] | null | undefined): SocialProofSummary {
  const categoryCounts = new Map<string, number>();
  let topTrustedPlayer: SocialProofSummary['topTrustedPlayer'] = null;
  let activeCourts = 0;
  let completedDares = 0;
  let openDares = 0;

  for (const item of Array.isArray(items) ? items : []) {
    if (!item) continue;

    const category = getValidCategory(item.category);
    if (category) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    if (item.status === 'active' || item.status === 'live') activeCourts += 1;
    if (item.status === 'completed') completedDares += 1;
    if (item.status === 'open') openDares += 1;

    topTrustedPlayer = getHigherTrustPlayer(topTrustedPlayer, item.playerA);

    if (item.playerB) {
      topTrustedPlayer = getHigherTrustPlayer(topTrustedPlayer, item.playerB);
    }
  }

  return {
    activeCourts,
    completedDares,
    openDares,
    topCategory: getTopCategory(categoryCounts),
    topTrustedPlayer,
  };
}

export function getDisplayedSocialProofSummary(
  serverActivity: SocialProofActivityResponse | null | undefined,
  fallbackSummary: SocialProofSummary,
): SocialProofSummary {
  return serverActivity?.summary ?? fallbackSummary;
}

function getHigherTrustPlayer(
  current: SocialProofSummary['topTrustedPlayer'],
  player: Partial<PlayerSummary> | null | undefined,
) {
  if (!isValidPlayer(player)) return current;

  if (!current || player.trustScore > current.score) {
    return { name: player.name, score: player.trustScore };
  }

  return current;
}

function getTopCategory(categoryCounts: Map<string, number>) {
  let topCategory: string | null = null;
  let topCount = 0;

  for (const [category, count] of categoryCounts.entries()) {
    if (count > topCount) {
      topCategory = category;
      topCount = count;
    }
  }

  return topCategory;
}

function getValidCategory(value: unknown) {
  if (typeof value !== 'string') return null;
  const category = value.trim();
  return category ? category : null;
}

function isValidPlayer(player: Partial<PlayerSummary> | null | undefined): player is PlayerSummary {
  return Boolean(
    player &&
      typeof player.name === 'string' &&
      player.name.trim() &&
      Number.isFinite(player.trustScore),
  );
}
