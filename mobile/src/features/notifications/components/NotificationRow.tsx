import { Bell, Landmark, Scale, ShieldAlert, Vote } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';
import { AppNotification, NotificationKind } from '../types';

type NotificationRowProps = {
  notification: AppNotification;
  onPress?: () => void;
};

const kindIcon: Record<NotificationKind, React.ReactNode> = {
  court: <Scale color={colors.primary} size={18} />,
  dispute: <ShieldAlert color={colors.danger} size={18} />,
  jury: <Vote color={colors.purple} size={18} />,
  system: <Bell color={colors.textMuted} size={18} />,
  wallet: <Landmark color={colors.success} size={18} />,
};

export function NotificationRow({ notification, onPress }: NotificationRowProps) {
  return (
    <Pressable
      accessibilityLabel={notification.title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !notification.read && styles.unread,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.icon}>{kindIcon[notification.kind]}</View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>{notification.title}</Text>
          {!notification.read ? <StatusBadge label="NEW" tone="warning" /> : null}
        </View>
        <Text numberOfLines={2} style={styles.body}>{notification.body}</Text>
        <Text style={styles.time}>{notification.createdLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    paddingVertical: spacing[14],
  },
  unread: {
    backgroundColor: colors.primaryDim,
    marginHorizontal: -spacing[12],
    paddingHorizontal: spacing[12],
  },
  pressed: {
    opacity: 0.78,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  copy: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  title: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '900',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  time: {
    color: colors.textGhost,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
