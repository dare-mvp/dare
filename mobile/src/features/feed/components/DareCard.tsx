import { Eye, Flame, LockKeyhole } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { MoneyAmount } from '../../../components/ui/MoneyAmount';
import { colors } from '../../../theme/tokens';
import { getCategoryVisual } from '../categoryVisuals';
import { avatarStyles, styles } from './DareCard.styles';

export type DareFeedItem = {
  id: string;
  title: string;
  category: string;
  stakeKobo: number;
  status: 'open' | 'live' | 'active' | 'completed' | 'disputed';
  resolution: string;
  createdAgo: string;
  actionLabel: string;
  playerA: PlayerSummary;
  playerB?: PlayerSummary;
  scoreA?: number;
  scoreB?: number;
  viewers?: number;
};

export type PlayerSummary = {
  name: string;
  tier: string;
  trustScore: number;
  accent: 'ember' | 'info' | 'ice' | 'win';
};

const statusStyles: Record<DareFeedItem['status'], { label: string; color: string; background: string; border: string }> = {
  open: {
    label: 'OPEN',
    color: colors.success,
    background: colors.successDim,
    border: 'rgba(0,232,150,0.30)',
  },
  live: {
    label: 'AWAITING',
    color: colors.warning,
    background: colors.warningDim,
    border: 'rgba(255,176,32,0.30)',
  },
  active: {
    label: 'ACTIVE NOW',
    color: colors.danger,
    background: colors.dangerDim,
    border: 'rgba(255,51,102,0.35)',
  },
  completed: {
    label: 'COMPLETED',
    color: colors.textMuted,
    background: 'rgba(255,255,255,0.06)',
    border: colors.border,
  },
  disputed: {
    label: 'DISPUTED',
    color: colors.purple,
    background: colors.purpleDim,
    border: 'rgba(155,93,229,0.30)',
  },
};

export function DareCard({ dare, onPress }: { dare: DareFeedItem; onPress?: () => void }) {
  const status = statusStyles[dare.status];
  const category = getCategoryVisual(dare.category);
  const CategoryIcon = category.Icon;
  const opponent = dare.playerB;
  const isHot = dare.status === 'active' || Boolean(dare.viewers);

  return (
    <Pressable
      accessibilityLabel={`${dare.title} DARE`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.statusRail, { backgroundColor: status.color }]} />
      <View style={styles.topRow}>
        <View style={styles.metaRow}>
          <View style={[styles.tag, { backgroundColor: status.background, borderColor: status.border }]}>
            <Text style={[styles.tagText, { color: status.color }]}>{status.label}</Text>
          </View>
          <View style={styles.tag}>
            <CategoryIcon color={category.color} size={13} />
            <Text style={styles.tagText}>{dare.category.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.stakePill}>
          <LockKeyhole color={colors.warning} size={13} />
          <MoneyAmount amountKobo={dare.stakeKobo} tone="locked" />
        </View>
      </View>
      {isHot ? (
        <View style={styles.hotLine}>
          <Flame color={colors.danger} size={14} />
          <Text style={styles.hotText}>
            {dare.viewers ? `${dare.viewers} watching now` : 'Active match'}
          </Text>
        </View>
      ) : null}
      <Text style={styles.title}>{dare.title}</Text>
      <View style={styles.matchup}>
        <View style={styles.players}>
          <PlayerBlock player={dare.playerA} />
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          {opponent ? <PlayerBlock alignRight player={opponent} /> : <OpenSlot />}
        </View>
        <View style={styles.playerMetaRow}>
          <View style={styles.metaColumn}>
            <PlayerMetaLine player={dare.playerA} />
          </View>
          <View style={styles.metaSpacer} />
          <View style={styles.metaColumn}>
            {opponent ? (
              <PlayerMetaLine alignRight player={opponent} />
            ) : (
              <Text numberOfLines={1} style={[styles.openMeta, styles.metaRight]}>
                Awaiting challenger
              </Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerMain}>{dare.resolution} resolution</Text>
          <Text style={styles.footerSub}>{dare.createdAgo}</Text>
        </View>
        <View style={styles.actionWrap}>
          {dare.viewers ? <Eye color={colors.textMuted} size={14} /> : null}
          <Text style={[styles.action, dare.status === 'active' && styles.actionDanger]}>
            {dare.viewers ? `${dare.viewers} watching` : dare.actionLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function PlayerBlock({ alignRight = false, player }: { alignRight?: boolean; player: PlayerSummary }) {
  return (
    <View style={[styles.player, alignRight && styles.playerRight]}>
      <View style={[styles.avatar, avatarStyles[player.accent]]}>
        <Text style={styles.avatarText}>{player.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={[styles.playerCopy, alignRight && styles.rightText]}>
        <Text numberOfLines={1} style={styles.playerName}>
          {player.name}
        </Text>
      </View>
    </View>
  );
}

function OpenSlot() {
  return (
    <View style={[styles.player, styles.playerRight]}>
      <View style={[styles.avatar, styles.openAvatar]}>
        <Text style={styles.avatarText}>?</Text>
      </View>
      <View style={[styles.playerCopy, styles.rightText]}>
        <Text numberOfLines={1} style={styles.playerName}>
          Open
        </Text>
      </View>
    </View>
  );
}

function PlayerMetaLine({ alignRight = false, player }: { alignRight?: boolean; player: PlayerSummary }) {
  return (
    <Text numberOfLines={1} style={[styles.playerMeta, alignRight && styles.metaRight]}>
      {player.tier} - {player.trustScore} pts
    </Text>
  );
}
