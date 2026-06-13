import { ReactNode } from 'react';
import { Flame } from 'lucide-react-native';

import { colors } from '../../theme/tokens';
import { formatRelativeTime } from '../../lib/format/time';
import { getCategoryVisual } from './categoryVisuals';
import { DareFeedItem } from './components/DareCard';
import { useMe } from '../me/useMe';

export type FeedFilter = 'All' | 'Live Now' | 'Open' | 'Upcoming' | 'History' | string;

export const filters: Array<{ icon?: ReactNode; label: FeedFilter }> = [
  { label: 'All' },
  { icon: <LiveNowIcon />, label: 'Live Now' },
  { label: 'Open' },
  { label: 'Upcoming' },
  { label: 'History' },
  ...['Knowledge', 'Physical', 'Verbal', 'Sports', 'Creative', 'Other'].map((label) => {
    const visual = getCategoryVisual(label);
    return { icon: <visual.Icon color={visual.color} size={14} />, label };
  }),
];

export function getSyncLabel(accountLoading: boolean, feedLoading: boolean, lastSyncedAt: string | null) {
  if (accountLoading) return 'Syncing account';
  if (feedLoading) return 'Syncing feed';
  if (!lastSyncedAt) return 'Not synced yet';
  return `Updated ${formatRelativeTime(lastSyncedAt).toLowerCase()}`;
}

export function getEmptyFeedBody(filter: FeedFilter) {
  if (filter === 'All') return 'There are no public DAREs available right now.';
  return `There are no ${filter.toString().toLowerCase()} DAREs available right now.`;
}

export function getIssueGate(data: ReturnType<typeof useMe>['data']) {
  if (data.capabilities.canCreateDare) {
    return {
      accessibilityLabel: 'Issue a DARE',
      body: 'Issue a DARE and set the stakes.',
      label: 'Issue',
      route: '/(tabs)/create' as const,
    };
  }

  if (data.profile.kycStatus === 'pending') {
    return {
      accessibilityLabel: 'Check KYC status',
      body: 'KYC review must finish before issuing money-backed DAREs.',
      label: 'KYC status',
      route: '/kyc-status' as const,
    };
  }

  if (data.profile.kycStatus === 'not_started') {
    return {
      accessibilityLabel: 'Start KYC verification',
      body: 'Complete KYC before issuing money-backed DAREs.',
      label: 'Verify',
      route: '/kyc-intro' as const,
    };
  }

  return {
    accessibilityLabel: 'Open account controls',
    body: 'Account controls must be cleared before issuing DAREs.',
    label: 'Review',
    route: '/(tabs)/profile' as const,
  };
}

export function matchesFeedFilter(item: DareFeedItem, filter: FeedFilter) {
  if (filter === 'All') return true;
  if (filter === 'Live Now') return item.status === 'live' || item.status === 'active';
  if (filter === 'Open') return item.status === 'open';
  if (filter === 'Upcoming') return item.status === 'open' || item.status === 'live';
  if (filter === 'History') return item.status === 'completed' || item.status === 'disputed';
  return item.category.toLowerCase() === filter.toLowerCase();
}

export function getTopPlayers(items: DareFeedItem[]) {
  const players = new Map<string, number>();

  for (const item of items) {
    players.set(item.playerA.name, Math.max(players.get(item.playerA.name) ?? 0, item.playerA.trustScore));
    if (item.playerB) {
      players.set(item.playerB.name, Math.max(players.get(item.playerB.name) ?? 0, item.playerB.trustScore));
    }
  }

  return Array.from(players.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([name, score], index) => ({
      name,
      rank: index + 1,
      score: `${score.toLocaleString()} pts`,
    }));
}

function LiveNowIcon() {
  return <Flame color={colors.danger} size={14} />;
}
