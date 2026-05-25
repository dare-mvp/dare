import { Wifi, WifiOff } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../theme/tokens';

type ConnectionBannerProps = {
  message?: string;
  state: 'connected' | 'reconnecting' | 'offline';
};

const copy = {
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  offline: 'Connection lost',
} as const;

export function ConnectionBanner({ message, state }: ConnectionBannerProps) {
  const healthy = state === 'connected';
  const iconColor = healthy ? colors.success : colors.warning;

  return (
    <View accessibilityRole={healthy ? undefined : 'alert'} style={[styles.banner, !healthy && styles.warning]}>
      {healthy ? <Wifi color={iconColor} size={18} /> : <WifiOff color={iconColor} size={18} />}
      <View style={styles.copy}>
        <Text style={styles.title}>{copy[state]}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
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
