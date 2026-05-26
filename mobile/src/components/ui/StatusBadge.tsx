import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type StatusBadgeProps = {
  label: string;
  tone: BadgeTone;
};

const toneStyles: Record<BadgeTone, { border: string; color: string; background: string }> = {
  neutral: { background: colors.surfaceElevated, border: colors.borderStrong, color: colors.textMuted },
  info: { background: colors.infoDim, border: 'rgba(77,166,255,0.25)', color: colors.info },
  success: { background: colors.successDim, border: 'rgba(0,232,150,0.25)', color: colors.success },
  warning: { background: colors.warningDim, border: 'rgba(255,176,32,0.25)', color: colors.warning },
  danger: { background: colors.dangerDim, border: 'rgba(255,51,102,0.25)', color: colors.danger },
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <View
      accessibilityLabel={`${label} status`}
      style={[
        styles.badge,
        {
          backgroundColor: toneStyles[tone].background,
          borderColor: toneStyles[tone].border,
        },
      ]}
    >
      <Text style={[styles.label, { color: toneStyles[tone].color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: spacing[12],
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
