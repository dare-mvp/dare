import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { PlusCircle } from 'lucide-react-native';
import { FlatList, ScrollView, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { FilterChip } from '../../src/components/ui/FilterChip';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { Screen } from '../../src/components/ui/Screen';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { TopBar } from '../../src/components/ui/TopBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { DareCard } from '../../src/features/feed/components/DareCard';
import { styles } from '../../src/features/feed/FeedScreen.styles';
import { LivePulsePanel } from '../../src/features/feed/components/LivePulsePanel';
import {
  FeedFilter,
  filters,
  getEmptyFeedBody,
  getIssueGate,
  getSyncLabel,
  getTopPlayers,
  matchesFeedFilter,
} from '../../src/features/feed/feedScreenParts';
import { getLivePulseStats } from '../../src/features/feed/livePulseStats';
import { usePublicDareFeed } from '../../src/features/feed/usePublicDareFeed';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { useMe } from '../../src/features/me/useMe';
import { colors } from '../../src/theme/tokens';

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
