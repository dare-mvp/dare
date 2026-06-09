import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type ActionButtonProps = {
  label: string;
  accessibilityLabel: string;
  disabled?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function ActionButton({
  label,
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  variant = 'primary',
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.control,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.46,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'center',
    minWidth: 0,
    maxWidth: '100%',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '800',
    letterSpacing: 0,
    maxWidth: '100%',
    textTransform: 'uppercase',
  },
  secondaryLabel: {
    color: colors.text,
  },
});
