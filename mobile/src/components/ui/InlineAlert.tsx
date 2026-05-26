import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type AlertTone = 'info' | 'warning' | 'danger' | 'success';

type InlineAlertProps = {
  title: string;
  message: string;
  tone: AlertTone;
};

const toneColors: Record<AlertTone, string> = {
  info: colors.info,
  warning: colors.warning,
  danger: colors.danger,
  success: colors.success,
};

export function InlineAlert({ title, message, tone }: InlineAlertProps) {
  return (
    <View accessibilityRole="summary" style={[styles.alert, { borderLeftColor: toneColors[tone] }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[4],
    padding: spacing[12],
  },
  title: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '800',
    lineHeight: typography.body.lineHeight,
  },
  message: {
    color: colors.textSoft,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
});
