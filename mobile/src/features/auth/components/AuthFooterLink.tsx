import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, typography } from '../../../theme/tokens';

type AuthFooterLinkProps = {
  label: string;
  onPress: () => void;
};

export function AuthFooterLink({ label, onPress }: AuthFooterLinkProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.primary,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
