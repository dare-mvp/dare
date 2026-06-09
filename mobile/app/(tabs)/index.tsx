import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { PlusCircle } from 'lucide-react-native';
import { FlatList, ListRenderItem, ScrollView, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { FilterChip } from '../../src/components/ui/FilterChip';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { Screen } from '../../src/components/ui/Screen';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { TopBar } from '../../src/components/ui/TopBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { DareCard, DareFeedItem } from '../../src/features/feed/components/DareCard';
import { styles } from '../../src/features/feed/FeedScreen.styles';
import { LivePulsePanel } from '../../src/features/feed/components/LivePulsePanel';
import { TopTrustStrip } from '../../src/features/feed/components/TopTrustStrip';
import {
  FeedFilter,
  filters,
  getEmptyFeedBody,
  getIssueGate,
  getSyncLabel,
  matchesFeedFilter,
} from '../../src/features/feed/feedScreenParts';
import { getLivePulseStats } from '../../src/features/feed/livePulseStats';
import { usePublicDareFeed } from '../../src/features/feed/usePublicDareFeed';
import { useTopTrustPlayers } from '../../src/features/feed/useTopTrustPlayers';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { useMe } from '../../src/features/me/useMe';
import { colors } from '../../src/theme/tokens';

export default function FeedScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { data, error, loading } = useMe();
  const feed = usePublicDareFeed();
  const topTrust = useTopTrustPlayers(5);
  const [selectedFilter, setSelectedFilter] = useState<FeedFilter>('All');
  const filteredItems = useMemo(
    () => feed.items.filter((item) => matchesFeedFilter(item, selectedFilter)),
    [feed.items, selectedFilter],
  );
  const pulseStats = useMemo(() => getLivePulseStats(feed.items), [feed.items]);
  const isPublicExplore = auth.status !== 'authenticated';
  const issueGate = isPublicExplore
    ? {
        accessibilityLabel: 'Sign in to create a DARE',
        body: 'Sign in to create, accept, fund, or settle DAREs.',
        label: 'Sign in',
        route: '/sign-in' as const,
      }
    : getIssueGate(data);
  const syncLabel = getSyncLabel(loading, feed.loading, feed.lastSyncedAt);
  const keyExtractor = useCallback((item: DareFeedItem) => item.id, []);
  const handleRefresh = useCallback(() => {
    void feed.refresh();
    void topTrust.refresh();
  }, [feed.refresh, topTrust.refresh]);
  const handleIssuePress = useCallback(() => {
    router.push(issueGate.route);
  }, [issueGate.route, router]);
  const handleDarePress = useCallback(
    (item: DareFeedItem) => {
      if (isPublicExplore) {
        router.push('/sign-in');
        return;
      }

      if (item.status === 'active') {
        router.push({ pathname: '/court/play', params: { dareId: item.id } });
        return;
      }

      router.push(`/dare/${item.id}`);
    },
    [isPublicExplore, router],
  );
  const renderItem = useCallback<ListRenderItem<DareFeedItem>>(
    ({ item }) => (
      <DareCard
        dare={item}
        onPress={handleDarePress}
      />
    ),
    [handleDarePress],
  );
  const listEmptyComponent = useMemo(
    () => (
      <EmptyState
        body={feed.loading ? 'Fetching live public DAREs.' : getEmptyFeedBody(selectedFilter)}
        title={feed.loading ? 'Syncing feed' : 'No DAREs yet'}
      />
    ),
    [feed.loading, selectedFilter],
  );
  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.refreshRow}>
          <Text style={styles.lastUpdated}>{syncLabel}</Text>
          <StatusBadge label="BETA" tone="warning" />
        </View>

        {data.source === 'mock' && !error && !isPublicExplore ? (
          <InlineAlert
            tone="info"
            title="Preview data"
            message="Live account data appears after sign-in and sync."
          />
        ) : null}

        {error && !isPublicExplore ? (
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
        <TopTrustStrip loading={topTrust.loading} players={topTrust.players} />

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
            onPress={handleIssuePress}
          />
        </View>

      </View>
    ),
    [
      data.source,
      error,
      feed.error,
      feed.loading,
      feed.source,
      handleIssuePress,
      isPublicExplore,
      issueGate.accessibilityLabel,
      issueGate.body,
      issueGate.label,
      loading,
      pulseStats,
      selectedFilter,
      syncLabel,
      topTrust.loading,
      topTrust.players,
    ],
  );

  return (
    <Screen>
      <TopBar
        balanceLabel={isPublicExplore ? undefined : formatNgnFromKobo(data.wallet.availableKobo)}
        createAccessibilityLabel={issueGate.accessibilityLabel}
        displayInitial={data.profile.avatarInitial}
        onCreatePress={() => router.push(issueGate.route)}
        showAccountActions={!isPublicExplore}
        subtitle="Challenge Everything"
        title={isPublicExplore ? 'Explore DARE' : 'DARE Feed'}
      />
      <FlatList
        data={filteredItems}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.content}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        onRefresh={handleRefresh}
        removeClippedSubviews
        refreshing={feed.loading}
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={listHeaderComponent}
        renderItem={renderItem}
        updateCellsBatchingPeriod={50}
        windowSize={7}
      />
    </Screen>
  );
}
