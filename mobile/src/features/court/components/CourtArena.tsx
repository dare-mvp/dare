import { Radio } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from '../../../components/ui/MoneyAmount';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { CourtPlayer, CourtSession } from '../types';

type CourtArenaProps = {
  session: CourtSession;
};

const accentColors: Record<CourtPlayer['accent'], string> = {
  ember: colors.primary,
  ice: '#38BDF8',
  info: colors.info,
  win: colors.success,
};

export function CourtArena({ session }: CourtArenaProps) {
  const timerCritical = session.timeRemainingSeconds <= 10;
  const modeLabel = getModeLabel(session.resolutionType);

  return (
    <View style={styles.arena}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.subTitle}>{session.challengeType}</Text>
        </View>
        <View style={[styles.timerBox, timerCritical && styles.timerCritical]}>
          <Text style={[styles.timer, timerCritical && styles.timerCriticalText]}>
            {formatTimer(session.timeRemainingSeconds)}
          </Text>
        </View>
      </View>

      <View style={styles.players}>
        <PlayerPanel player={session.playerA} />
        <View style={styles.centerClash}>
          <Text style={styles.centerVs}>VS</Text>
          <Text style={styles.roundLabel}>{modeLabel}</Text>
        </View>
        <PlayerPanel player={session.playerB} alignRight />
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Pot</Text>
          <MoneyAmount amountKobo={session.potKobo} tone="locked" />
        </View>
        <View style={styles.footerRight}>
          <View style={styles.liveLabel}>
            <Radio color={colors.danger} size={13} />
            <StatusBadge label={getStatusLabel(session.phase)} tone={session.phase === 'active' ? 'danger' : 'neutral'} />
          </View>
          <Text style={styles.spectators}>{session.spectators} watching</Text>
        </View>
      </View>
    </View>
  );
}

function getModeLabel(resolutionType: CourtSession['resolutionType']) {
  if (resolutionType === 'witnessed') return 'Witness';
  if (resolutionType === 'evidence') return 'Evidence';
  return 'Answer';
}
function getStatusLabel(phase: CourtSession['phase']) {
  if (phase === 'active') return 'ACTIVE NOW';
  if (phase === 'awaiting_result') return 'AWAITING RESULT';
  if (phase === 'disputed') return 'REVIEW';
  if (phase === 'settled') return 'SETTLED';
  return 'PENDING';
}
function PlayerPanel({ alignRight = false, player }: { alignRight?: boolean; player: CourtPlayer }) {
  return (
    <View style={styles.playerPanel}>
      <View style={styles.playerHeader}>
        <View style={[styles.onlineDot, player.isReady && styles.readyDot]} />
        <Text numberOfLines={1} style={styles.playerName}>
          {player.name}{player.isYou ? ' (You)' : ''}
        </Text>
      </View>
      <View style={[styles.avatarStage, alignRight && styles.avatarStageRight]}>
        <View style={[styles.avatar, { backgroundColor: accentColors[player.accent] }]}>
          <Text style={styles.avatarText}>{player.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.tier}>{player.tier}</Text>
        <Text style={styles.trust}>{player.trustScore} pts</Text>
      </View>
      <Text style={styles.score}>{player.score}</Text>
    </View>
  );
}

function formatTimer(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  arena: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    justifyContent: 'space-between',
    padding: spacing[16],
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  subTitle: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 3,
  },
  timerBox: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    minWidth: 92,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  timer: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  timerCritical: {
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  timerCriticalText: {
    color: colors.danger,
  },
  players: {
    flexDirection: 'row',
    minHeight: 218,
    position: 'relative',
  },
  centerClash: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 1,
    left: '50%',
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[8],
    position: 'absolute',
    top: 76,
    transform: [{ translateX: -24 }],
    zIndex: 2,
  },
  centerVs: {
    color: colors.primary,
    fontFamily: fonts.displaySemi,
    fontSize: 13,
    fontWeight: '900',
  },
  roundLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  playerPanel: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[10],
    padding: spacing[14],
  },
  playerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[6],
    maxWidth: '100%',
  },
  onlineDot: {
    backgroundColor: colors.textGhost,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  readyDot: {
    backgroundColor: colors.success,
  },
  playerName: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 12,
    fontWeight: '900',
  },
  avatarStage: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 112,
    padding: spacing[12],
    width: '100%',
  },
  avatarStageRight: {
    borderColor: colors.borderStrong,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '900',
  },
  tier: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: spacing[8],
  },
  trust: {
    color: colors.warning,
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 1,
  },
  score: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 46,
    fontWeight: '900',
    lineHeight: 50,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing[16],
  },
  footerLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  footerRight: {
    alignItems: 'flex-end',
    gap: spacing[6],
  },
  liveLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[6],
  },
  spectators: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
});
