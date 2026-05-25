import { StyleSheet } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';

export const avatarStyles = StyleSheet.create({
  ember: {
    backgroundColor: colors.primary,
  },
  ice: {
    backgroundColor: '#38BDF8',
  },
  info: {
    backgroundColor: colors.info,
  },
  win: {
    backgroundColor: colors.success,
  },
});

export const styles = StyleSheet.create({
  action: {
    color: colors.success,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '900',
    maxWidth: 140,
    textAlign: 'right',
  },
  actionDanger: {
    color: colors.danger,
  },
  actionWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[4],
  },
  avatar: {
    alignItems: 'flex-end',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  avatarText: {
    alignSelf: 'center',
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 13,
    fontWeight: '900',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    overflow: 'hidden',
    padding: spacing[16],
    position: 'relative',
  },
  footer: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[12],
  },
  footerMain: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '800',
  },
  footerSub: {
    color: colors.textGhost,
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 2,
  },
  hotLine: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.dangerDim,
    borderColor: 'rgba(255,51,102,0.20)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[6],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  hotText: {
    color: colors.danger,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  matchup: {
    gap: spacing[4],
  },
  metaColumn: {
    flex: 1,
    minWidth: 0,
  },
  metaRight: {
    textAlign: 'right',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  metaSpacer: {
    width: 42,
  },
  openAvatar: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  openMeta: {
    color: colors.success,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  player: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing[8],
    minWidth: 0,
    paddingRight: spacing[24],
  },
  playerCopy: {
    flex: 1,
    minWidth: 0,
  },
  playerMeta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  playerMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  playerName: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '800',
  },
  playerRight: {
    flexDirection: 'row-reverse',
    paddingLeft: spacing[24],
    paddingRight: 0,
  },
  players: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
    position: 'relative',
  },
  pressed: {
    opacity: 0.86,
  },
  rightText: {
    alignItems: 'flex-end',
  },
  stakePill: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing[4],
  },
  statusRail: {
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  tag: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[4],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  tagText: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '800',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
  },
  vsBadge: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    left: '50%',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    position: 'absolute',
    transform: [{ translateX: -18 }],
    zIndex: 1,
  },
  vsText: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '900',
  },
});
