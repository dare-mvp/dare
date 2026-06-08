import { useRouter } from 'expo-router';
import { ReactNode, useMemo, useState } from 'react';
import {
  Flame,
  PlusCircle,
} from 'lucide-react-native';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { FilterChip } from '../../src/components/ui/FilterChip';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { Screen } from '../../src/components/ui/Screen';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { TopBar } from '../../src/components/ui/TopBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { getCategoryVisual } from '../../src/features/feed/categoryVisuals';
import { DareCard } from '../../src/features/feed/components/DareCard';
import { DareFeedItem } from '../../src/features/feed/components/DareCard';
import { LivePulsePanel } from '../../src/features/feed/components/LivePulsePanel';
import { getLivePulseStats } from '../../src/features/feed/livePulseStats';
import { usePublicDareFeed } from '../../src/features/feed/usePublicDareFeed';
import { formatRelativeTime } from '../../src/lib/format/time';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { useMe } from '../../src/features/me/useMe';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

type FeedFilter = 'All' | 'Live Now' | 'Open' | 'Upcoming' | 'History' | string;

const filters: Array<{ icon?: ReactNode; label: FeedFilter }> = [
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

export default function FeedScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const feed = usePublicDareFeed();
  const [selectedFilter, setSelectedFilter] = useState<FeedFilter>('All');
  const filteredItems = useMemo(
    () => feed.items.filter((item) => matchesFeedFilter(item, selectedFilter)),
    [feed.items, selectedFilter],
  );
  const leaders = useMemo(() => getTopPlayers(feed.items), [feed.items]);
  const pulseStats = useMemo(() => getLivePulseStats(feed.items), [feed.items]);
  const issueGate = getIssueGate(data);
  const syncLabel = getSyncLabel(loading, feed.loading, feed.lastSyncedAt);

  return (
    <Screen>
      <TopBar
        balanceLabel={formatNgnFromKobo(data.wallet.availableKobo)}
        createAccessibilityLabel={issueGate.accessibilityLabel}
        displayInitial={data.profile.avatarInitial}
        onCreatePress={() => router.push(issueGate.route)}
        subtitle="Challenge Everything"
        title="DARE Feed"
      />
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        onRefresh={() => {
          void feed.refresh();
        }}
        refreshing={feed.loading}
        ListEmptyComponent={
          <EmptyState
            body={feed.loading ? 'Fetching live public DAREs.' : getEmptyFeedBody(selectedFilter)}
            title={feed.loading ? 'Syncing feed' : 'No DAREs yet'}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.refreshRow}>
              <Text style={styles.lastUpdated}>{syncLabel}</Text>
              <StatusBadge label="BETA" tone="warning" />
            </View>

            {data.source === 'mock' && !error ? (
              <InlineAlert
                tone="info"
                title="Preview data"
                message="Live account data appears after sign-in and sync."
              />
            ) : null}

            {error ? (
              <InlineAlert
                tone="danger"
                title="Account sync failed"
                message={error}
              />
            ) : null}

            {feed.source === 'mock' && !feed.error ? (
              <InlineAlert
                tone="info"
                title="Preview feed"
                message="Live public DAREs appear after sign-in and sync."
              />
            ) : null}

            {feed.error ? (
              <InlineAlert
                tone="danger"
                title="Feed sync failed"
                message={feed.error}
              />
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filters.map((filter) => (
                <FilterChip
                  icon={filter.icon}
                  key={filter.label}
                  label={filter.label}
                  onPress={() => setSelectedFilter(filter.label)}
                  selected={selectedFilter === filter.label}
                />
              ))}
            </ScrollView>

            <LivePulsePanel loading={feed.loading} stats={pulseStats} />

            <View style={styles.cta}>
              <View style={styles.ctaIcon}>
                <Text style={styles.ctaIconText}>D</Text>
              </View>
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaTitle}>Got something to prove?</Text>
                <Text style={styles.ctaText}>{issueGate.body}</Text>
              </View>
              <ActionButton
                label={issueGate.label}
                accessibilityLabel={issueGate.accessibilityLabel}
                disabled={loading || Boolean(error)}
                icon={<PlusCircle color={colors.text} size={17} />}
                onPress={() => router.push(issueGate.route)}
              />
            </View>

            <View style={styles.leaderboard}>
              <View style={styles.widgetHeader}>
                <Text style={styles.widgetTitle}>Feed Players</Text>
                <StatusBadge label="TRUST" tone="neutral" />
              </View>
              {leaders.map((leader) => (
                <View key={leader.rank} style={styles.leaderRow}>
                  <Text style={[styles.leaderRank, leader.rank === 1 && styles.topRank]}>
                    {leader.rank}
                  </Text>
                  <Text style={styles.leaderName}>{leader.name}</Text>
                  <Text style={styles.leaderScore}>{leader.score}</Text>
                </View>
              ))}
              {leaders.length === 0 ? (
                <Text style={styles.leaderEmpty}>Top players appear after public DARE activity.</Text>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <DareCard dare={item} onPress={() => router.push(`/dare/${item.id}`)} />
        )}
      />
    </Screen>
  );
}

function getSyncLabel(accountLoading: boolean, feedLoading: boolean, lastSyncedAt: string | null) {
  if (accountLoading) return 'Syncing account';
  if (feedLoading) return 'Syncing feed';
  if (!lastSyncedAt) return 'Not synced yet';
  return `Updated ${formatRelativeTime(lastSyncedAt).toLowerCase()}`;
}

function getEmptyFeedBody(filter: FeedFilter) {
  if (filter === 'All') return 'There are no public DAREs available right now.';
  return `There are no ${filter.toString().toLowerCase()} DAREs available right now.`;
}

function getIssueGate(data: ReturnType<typeof useMe>['data']) {
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

function LiveNowIcon() {
  return <Flame color={colors.danger} size={14} />;
}

function matchesFeedFilter(item: DareFeedItem, filter: FeedFilter) {
  if (filter === 'All') return true;
  if (filter === 'Live Now') return item.status === 'live' || item.status === 'active';
  if (filter === 'Open') return item.status === 'open';
  if (filter === 'Upcoming') return item.status === 'open';
  if (filter === 'History') return item.status === 'completed' || item.status === 'disputed';
  return item.category.toLowerCase() === filter.toLowerCase();
}

function getTopPlayers(items: DareFeedItem[]) {
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

const styles = StyleSheet.create({
  content: {
    gap: spacing[12],
    padding: spacing[16],
    paddingBottom: spacing[32],
  },
  header: {
    gap: spacing[14],
  },
  refreshRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lastUpdated: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 0,
  },
  filters: {
    gap: spacing[8],
    paddingRight: spacing[16],
  },
  cta: {
    alignItems: 'center',
    backgroundColor: colors.primaryDim,
    borderColor: colors.primaryGlow,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[14],
  },
  ctaIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.control,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  ctaIconText: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '900',
  },
  ctaCopy: {
    flex: 1,
    minWidth: 0,
  },
  ctaTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  ctaText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    marginTop: 2,
  },
  leaderboard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  widgetHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
  },
  widgetTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 13,
    fontWeight: '900',
  },
  leaderRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    minHeight: 40,
    paddingHorizontal: spacing[14],
  },
  leaderRank: {
    color: colors.textGhost,
    fontFamily: fonts.mono,
    fontSize: 11,
    textAlign: 'right',
    width: 18,
  },
  topRank: {
    color: colors.warning,
  },
  leaderName: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
  },
  leaderScore: {
    color: colors.primary,
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    fontWeight: '900',
  },
  leaderEmpty: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    padding: spacing[14],
    textAlign: 'center',
  },
});
