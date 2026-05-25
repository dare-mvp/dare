import { Pressable, StyleSheet, View } from 'react-native';
import { ReactNode } from 'react';

import { colors, radius } from '../../theme/tokens';

type IconButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: ReactNode;
  onPress?: () => void;
  tone?: 'default' | 'primary' | 'danger';
};

export function IconButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  tone = 'default',
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[tone],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View pointerEvents="none">{icon}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  default: {
    backgroundColor: 'transparent',
    borderColor: colors.borderStrong,
  },
  primary: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primaryGlow,
  },
  danger: {
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
  },
  disabled: {
    opacity: 0.44,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
});
