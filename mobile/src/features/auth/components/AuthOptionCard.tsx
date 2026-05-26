import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../../theme/tokens';

type AuthOptionCardProps = {
  body: string;
  icon?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  title: string;
};

export function AuthOptionCard({ body, icon, onPress, selected = false, title }: AuthOptionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[16],
  },
  selected: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '900',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
});
