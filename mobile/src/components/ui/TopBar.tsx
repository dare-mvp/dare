import { useRouter } from 'expo-router';
import { Bell, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DareLogo } from '../brand/DareLogo';
import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type TopBarProps = {
  balanceLabel?: string;
  createAccessibilityLabel?: string;
  displayInitial?: string;
  onCreatePress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  showAccountActions?: boolean;
  subtitle: string;
  title: string;
};

export function TopBar({
  balanceLabel,
  createAccessibilityLabel = 'Issue a DARE',
  displayInitial = 'D',
  onCreatePress,
  onNotificationsPress,
  onProfilePress,
  showAccountActions = true,
  subtitle,
  title,
}: TopBarProps) {
  const router = useRouter();
  const handleCreatePress = onCreatePress ?? (() => router.push('/(tabs)/create'));
  const handleNotificationsPress = onNotificationsPress ?? (() => router.push('/notifications'));
  const handleProfilePress = onProfilePress ?? (() => router.push('/(tabs)/profile'));

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <DareLogo size="sm" />
        </View>

        <View style={styles.actions}>
          {showAccountActions ? (
            <Pressable
              accessibilityLabel="Open notifications"
              accessibilityRole="button"
              onPress={handleNotificationsPress}
              style={styles.iconButton}
            >
              <Bell color={colors.textMuted} size={17} />
              <View style={styles.dot} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={createAccessibilityLabel}
            accessibilityRole="button"
            onPress={handleCreatePress}
            style={styles.iconButton}
          >
            <Plus color={colors.textMuted} size={17} />
          </Pressable>
          {showAccountActions ? (
            <Pressable
              accessibilityLabel="Open profile"
              accessibilityRole="button"
              onPress={handleProfilePress}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{displayInitial}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.subtitle}>
        {subtitle}
      </Text>

      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>

      {balanceLabel ? (
        <View style={styles.balanceRow}>
          <View accessibilityLabel={`Available balance ${balanceLabel}`} style={styles.balanceChip}>
            <Text style={styles.balanceLabel}>BAL</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.75} style={styles.balanceValue}>
              {balanceLabel}
            </Text>
          </View>
        </View>
      ) : null}
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
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
  },
  brand: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: spacing[10],
    minWidth: 0,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
    maxWidth: '100%',
    textTransform: 'uppercase',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing[6],
  },
  balanceRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  balanceChip: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    maxWidth: '100%',
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
    maxWidth: '100%',
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
