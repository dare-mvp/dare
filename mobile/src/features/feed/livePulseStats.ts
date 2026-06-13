import type { DareFeedItem } from './components/DareCard';

export type LivePulseStats = {
  liveCount: number;
  openCount: number;
  resolvedCount: number;
  totalCount: number;
};

export function getLivePulseStats(items: Pick<DareFeedItem, 'status'>[]): LivePulseStats {
  return items.reduce<LivePulseStats>(
    (stats, item) => {
      stats.totalCount += 1;

      if (item.status === 'active' || item.status === 'live') {
        stats.liveCount += 1;
      }

      if (item.status === 'open') {
        stats.openCount += 1;
      }

      if (item.status === 'completed' || item.status === 'disputed') {
        stats.resolvedCount += 1;
      }

      return stats;
    },
    {
      liveCount: 0,
      openCount: 0,
      resolvedCount: 0,
      totalCount: 0,
    },
  );
}
