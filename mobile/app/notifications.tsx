import { ReactNode, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { BellRing, CheckCheck, ChevronLeft, ListFilter, Scale, Settings, ShieldAlert, Vote, WalletCards } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../src/components/ui/ActionButton';
import { EmptyState } from '../src/components/ui/EmptyState';
import { FilterChip } from '../src/components/ui/FilterChip';
import { InlineAlert } from '../src/components/ui/InlineAlert';
import { Screen } from '../src/components/ui/Screen';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { NotificationRow } from '../src/features/notifications/components/NotificationRow';
import { resolveNotificationHref } from '../src/features/notifications/notificationDestinations';
import { NotificationKind } from '../src/features/notifications/types';
import { useNotifications } from '../src/features/notifications/useNotifications';
import { colors, fonts, radius, spacing, typography } from '../src/theme/tokens';

type FilterValue = 'all' | NotificationKind;

const filters: Array<{ icon: ReactNode; label: string; value: FilterValue }> = [
  { icon: <ListFilter color={colors.textMuted} size={14} />, label: 'All', value: 'all' },
  { icon: <Scale color={colors.textMuted} size={14} />, label: 'Court', value: 'court' },
  { icon: <WalletCards color={colors.textMuted} size={14} />, label: 'Wallet', value: 'wallet' },
  { icon: <ShieldAlert color={colors.textMuted} size={14} />, label: 'Disputes', value: 'dispute' },
  { icon: <Vote color={colors.textMuted} size={14} />, label: 'Jury', value: 'jury' },
  { icon: <Settings color={colors.textMuted} size={14} />, label: 'System', value: 'system' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const inbox = useNotifications();
  const [filter, setFilter] = useState<FilterValue>('all');
  const unreadCount = inbox.items.filter((notification) => !notification.read).length;
  const visibleNotifications = useMemo(
    () => inbox.items.filter((notification) => filter === 'all' || notification.kind === filter),
    [filter, inbox.items],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color={colors.textMuted} size={22} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Notifications</Text>
            <Text style={styles.title}>Activity inbox</Text>
            <Text style={styles.subtitle}>Court, wallet, dispute, jury, and account updates appear here.</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>Unread</Text>
            <Text style={styles.summaryValue}>{unreadCount}</Text>
          </View>
          <View style={styles.summaryActions}>
            <StatusBadge label={inbox.loading ? 'SYNCING' : inbox.source === 'server' ? 'LIVE' : 'PREVIEW'} tone="neutral" />
            <ActionButton
              accessibilityLabel="Mark all notifications as read"
              disabled={unreadCount === 0 || inbox.mutating}
              icon={<CheckCheck color={colors.text} size={17} />}
              label="Mark all read"
              onPress={() => {
                void inbox.markAllRead();
              }}
              variant="secondary"
            />
          </View>
        </View>

        {inbox.source === 'mock' && !inbox.error ? (
          <InlineAlert
            tone="info"
            title="Preview inbox"
            message="Live notifications appear after sign-in and sync."
          />
        ) : null}

        {inbox.error ? (
          <InlineAlert
            tone="danger"
            title="Inbox sync failed"
            message={inbox.error}
          />
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((item) => (
            <FilterChip
              key={item.value}
              icon={item.icon}
              label={item.label}
              onPress={() => setFilter(item.value)}
              selected={filter === item.value}
            />
          ))}
        </ScrollView>

        <View style={styles.list}>
          {visibleNotifications.length > 0 ? (
            visibleNotifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onPress={() => {
                  if (!notification.read) {
                    void inbox.markRead(notification.id);
                  }
                  const href = resolveNotificationHref(notification);
                  if (href !== '/notifications') router.push(href);
                }}
              />
            ))
          ) : (
            <EmptyState
              body="There are no updates in this category right now."
              icon={<BellRing color={colors.textMuted} size={28} />}
              title="No notifications"
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[16],
    padding: spacing[20],
    paddingBottom: spacing[32],
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[12],
  },
  backButton: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: {
    flex: 1,
    gap: spacing[6],
    minWidth: 0,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: typography.title.fontSize,
    fontWeight: '900',
    lineHeight: typography.title.lineHeight,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  summary: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing[16],
  },
  summaryActions: {
    alignItems: 'flex-end',
    flex: 1,
    gap: spacing[8],
    marginLeft: spacing[12],
  },
  summaryLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.primary,
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  filters: {
    gap: spacing[8],
    paddingRight: spacing[16],
  },
  list: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing[12],
  },
});
