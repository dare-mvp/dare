import { useRouter } from 'expo-router';
import { Bell, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DareLogo } from '../brand/DareLogo';
import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type TopBarProps = {
  balanceLabel: string;
  createAccessibilityLabel?: string;
  displayInitial: string;
  onCreatePress?: () => void;
  subtitle: string;
  title: string;
};

export function TopBar({
  balanceLabel,
  createAccessibilityLabel = 'Issue a DARE',
  displayInitial,
  onCreatePress,
  subtitle,
  title,
}: TopBarProps) {
  const router = useRouter();
  const handleCreatePress = onCreatePress ?? (() => router.push('/(tabs)/create'));

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <DareLogo size="sm" />
          <View style={styles.brandCopy}>
            <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="Open notifications"
            accessibilityRole="button"
            onPress={() => router.push('/notifications')}
            style={styles.iconButton}
          >
            <Bell color={colors.textMuted} size={17} />
            <View style={styles.dot} />
          </Pressable>
          <Pressable
            accessibilityLabel={createAccessibilityLabel}
            accessibilityRole="button"
            onPress={handleCreatePress}
            style={styles.iconButton}
          >
            <Plus color={colors.textMuted} size={17} />
          </Pressable>
          <Pressable
            accessibilityLabel="Open profile"
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{displayInitial}</Text>
          </Pressable>
        </View>
      </View>

      <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
        {title}
      </Text>

      <View style={styles.balanceRow}>
        <View accessibilityLabel={`Available balance ${balanceLabel}`} style={styles.balanceChip}>
          <Text style={styles.balanceLabel}>BAL</Text>
          <Text numberOfLines={1} style={styles.balanceValue}>{balanceLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing[14],
    paddingHorizontal: spacing[20],
    paddingTop: spacing[16],
    paddingBottom: spacing[12],
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
  },
  brand: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing[10],
    minWidth: 0,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing[6],
  },
  balanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  balanceChip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    minWidth: 104,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[6],
  },
  balanceLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 9,
    lineHeight: 11,
  },
  balanceValue: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 12,
    lineHeight: 15,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  dot: {
    backgroundColor: colors.primary,
    borderColor: colors.background,
    borderRadius: 999,
    borderWidth: 2,
    height: 9,
    position: 'absolute',
    right: 5,
    top: 5,
    width: 9,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  avatarText: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 13,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: typography.title.fontSize,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: typography.title.lineHeight,
    maxWidth: '100%',
  },
});
