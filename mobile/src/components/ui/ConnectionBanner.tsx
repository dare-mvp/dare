import { Wifi, WifiOff } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../theme/tokens';

type ConnectionBannerProps = {
  message?: string;
  state?: 'connected' | 'reconnecting' | 'offline';
};

const copy = {
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  offline: 'Connection lost',
} as const;

const defaultMessages = {
  connected: 'Connection is current. Keep this screen open for the next Court action.',
  reconnecting: 'Keep this screen open and retry after sync returns.',
  offline: 'Reconnect now, then retry the action. Offline Court actions are not queued.',
} as const;

export function ConnectionBanner({ message, state }: ConnectionBannerProps) {
  const resolvedState = resolveConnectionState(state);
  const healthy = resolvedState === 'connected';
  const iconColor = healthy ? colors.success : resolvedState === 'offline' ? colors.danger : colors.warning;
  const resolvedMessage = message?.trim() || defaultMessages[resolvedState];

  return (
    <View
      accessibilityRole={healthy ? undefined : 'alert'}
      style={[styles.banner, resolvedState === 'reconnecting' && styles.warning, resolvedState === 'offline' && styles.danger]}
    >
      {healthy ? <Wifi color={iconColor} size={18} /> : <WifiOff color={iconColor} size={18} />}
      <View style={styles.copy}>
        <Text style={styles.title}>{copy[resolvedState]}</Text>
        <Text style={styles.message}>{resolvedMessage}</Text>
      </View>
    </View>
  );
}

function resolveConnectionState(state?: ConnectionBannerProps['state']) {
  if (state === 'connected' || state === 'offline' || state === 'reconnecting') return state;
  return 'reconnecting';
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.successDim,
    borderColor: colors.success,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    padding: spacing[12],
  },
  warning: {
    backgroundColor: colors.warningDim,
    borderColor: colors.warning,
  },
  danger: {
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
  },
  message: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    marginTop: spacing[4],
  },
});
