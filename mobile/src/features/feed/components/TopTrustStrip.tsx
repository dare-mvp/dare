import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';
import type { TopTrustPlayer } from '../useTopTrustPlayers';

type TopTrustStripProps = {
  loading: boolean;
  players: TopTrustPlayer[];
};

export function TopTrustStrip({ loading, players }: TopTrustStripProps) {
  const visiblePlayers = players.slice(0, 3);

  if (!loading && visiblePlayers.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Trust</Text>
        <StatusBadge label="LIVE" tone="neutral" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {loading && visiblePlayers.length === 0 ? (
          <PlayerSkeleton />
        ) : (
          visiblePlayers.map((player, index) => (
            <PlayerChip index={index} key={player.userId} player={player} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PlayerChip({ index, player }: { index: number; player: TopTrustPlayer }) {
  const category = player.topCategory ? formatCategory(player.topCategory) : 'Active';
  return (
    <View style={styles.chip}>
      <View style={[styles.avatar, { backgroundColor: player.avatarColor ?? colors.surfaceElevated }]}>
        <Text style={styles.avatarText}>
          {player.avatarEmoji || player.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>#{index + 1} @{player.username}</Text>
        <Text numberOfLines={1} style={styles.meta}>
          {player.trustScore} trust - {category}
        </Text>
        <Text numberOfLines={1} style={styles.subMeta}>
          {player.completedDares} done - {player.recentDares} recent
        </Text>
      </View>
    </View>
  );
}

function PlayerSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <View key={item} style={[styles.chip, styles.skeletonChip]}>
          <View style={[styles.avatar, styles.skeletonAvatar]} />
          <View style={styles.copy}>
            <View style={styles.skeletonLineWide} />
            <View style={styles.skeletonLine} />
          </View>
        </View>
      ))}
    </>
  );
}

function formatCategory(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexShrink: 0,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarText: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 13,
    fontWeight: '900',
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    minHeight: 58,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[8],
    width: 188,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  list: {
    gap: spacing[8],
    paddingRight: spacing[16],
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 2,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '900',
  },
  skeletonAvatar: {
    backgroundColor: colors.surfaceElevated,
  },
  skeletonChip: {
    opacity: 0.72,
  },
  skeletonLine: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    height: 8,
    marginTop: 7,
    width: 72,
  },
  skeletonLineWide: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    height: 10,
    width: 104,
  },
  subMeta: {
    color: colors.textGhost,
    fontFamily: fonts.mono,
    fontSize: 9,
    marginTop: 2,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 13,
    fontWeight: '900',
  },
  wrap: {
    gap: spacing[8],
  },
});
