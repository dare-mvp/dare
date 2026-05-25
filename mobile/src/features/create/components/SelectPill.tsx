import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../../theme/tokens';

type SelectPillProps<T extends string | number> = {
  icon?: ReactNode;
  label: string;
  onSelect: (value: T) => void;
  selected: boolean;
  value: T;
};

export function SelectPill<T extends string | number>({ icon, label, onSelect, selected, value }: SelectPillProps<T>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onSelect(value)}
      style={({ pressed }) => [styles.pill, selected && styles.selected, pressed && styles.pressed]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing[6],
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
  },
  selectedLabel: {
    color: colors.text,
  },
});
