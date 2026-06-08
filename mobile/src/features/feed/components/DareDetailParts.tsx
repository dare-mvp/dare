import { ChevronLeft, Share2 } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from '../../../components/ui/MoneyAmount';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';

export const dareDetailStyles = StyleSheet.create({
  content: {
    gap: spacing[16],
    padding: spacing[20],
    paddingBottom: spacing[32],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[16],
    padding: spacing[16],
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  potRow: {
    alignItems: 'flex-end',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[14],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  rightText: {
    alignItems: 'flex-end',
  },
  matchPanel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    padding: spacing[16],
  },
  player: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing[10],
    minWidth: 0,
  },
  playerRight: {
    flexDirection: 'row-reverse',
  },
  playerCopy: {
    flex: 1,
    minWidth: 0,
  },
  playerCopyRight: {
    alignItems: 'flex-end',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexShrink: 0,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  playerRole: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  playerName: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '900',
  },
  playerMeta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  vsBadge: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  vsText: {
    color: colors.primary,
    fontFamily: fonts.display,
    fontSize: 10,
    fontWeight: '900',
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  detailRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[4],
    paddingTop: spacing[10],
  },
  detailLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.textSoft,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  moneyLine: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  moneyLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  moneyLabelStrong: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
  },
  actions: {
    gap: spacing[12],
  },
});

export function DetailHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={dareDetailStyles.header}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={dareDetailStyles.iconButton}>
        <ChevronLeft color={colors.textMuted} size={22} />
      </Pressable>
      <Text style={dareDetailStyles.headerTitle}>{title}</Text>
      <Pressable accessibilityLabel="Share DARE" accessibilityRole="button" style={dareDetailStyles.iconButton}>
        <Share2 color={colors.textMuted} size={18} />
      </Pressable>
    </View>
  );
}

export function PlayerBlock({
  accentColor,
  alignRight = false,
  meta,
  name,
  role,
}: {
  accentColor: string;
  alignRight?: boolean;
  meta: string;
  name: string;
  role: string;
}) {
  return (
    <View style={[dareDetailStyles.player, alignRight && dareDetailStyles.playerRight]}>
      <View style={[dareDetailStyles.avatar, { backgroundColor: accentColor }]}>
        <Text style={dareDetailStyles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={[dareDetailStyles.playerCopy, alignRight && dareDetailStyles.playerCopyRight]}>
        <Text style={dareDetailStyles.playerRole}>{role}</Text>
        <Text numberOfLines={1} style={dareDetailStyles.playerName}>{name}</Text>
        <Text numberOfLines={1} style={dareDetailStyles.playerMeta}>{meta}</Text>
      </View>
    </View>
  );
}

export function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <View style={dareDetailStyles.sectionTitleRow}>
      {icon}
      <Text style={dareDetailStyles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={dareDetailStyles.detailRow}>
      <Text style={dareDetailStyles.detailLabel}>{label}</Text>
      <Text style={dareDetailStyles.detailValue}>{value}</Text>
    </View>
  );
}

export function MoneyLine({ emphasis = false, label, value }: { emphasis?: boolean; label: string; value: number }) {
  return (
    <View style={dareDetailStyles.moneyLine}>
      <Text style={emphasis ? dareDetailStyles.moneyLabelStrong : dareDetailStyles.moneyLabel}>{label}</Text>
      <MoneyAmount amountKobo={value} tone={emphasis ? 'locked' : 'pending'} />
    </View>
  );
}
