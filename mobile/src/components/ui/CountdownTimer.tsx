import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../theme/tokens';

type CountdownTimerProps = {
  label?: string;
  secondsRemaining: number;
};

export function CountdownTimer({ label = 'Time left', secondsRemaining }: CountdownTimerProps) {
  const safeSeconds = Math.max(0, secondsRemaining);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  const urgent = safeSeconds <= 15;

  return (
    <View accessibilityLabel={`${label} ${minutes}:${seconds}`} style={[styles.timer, urgent && styles.urgent]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, urgent && styles.urgentValue]}>{minutes}:{seconds}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  timer: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
  },
  urgent: {
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  urgentValue: {
    color: colors.danger,
  },
});
