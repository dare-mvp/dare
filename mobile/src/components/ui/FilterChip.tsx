import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type FilterChipProps = {
  icon?: ReactNode;
  label: string;
  onPress?: () => void;
  selected?: boolean;
};

export function FilterChip({ icon, label, onPress, selected = false }: FilterChipProps) {
  return (
    <Pressable
      accessibilityLabel={`${label} filter`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[6],
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing[14],
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  selectedLabel: {
    color: colors.text,
  },
});
