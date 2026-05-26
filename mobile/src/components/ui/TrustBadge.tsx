import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../theme/tokens';

type TrustBadgeProps = {
  score: number;
  tier: string;
};

export function TrustBadge({ score, tier }: TrustBadgeProps) {
  return (
    <View accessibilityLabel={`${tier} trust score ${score}`} style={styles.badge}>
      <Text numberOfLines={1} style={styles.tier}>{tier.toUpperCase()}</Text>
      <Text numberOfLines={1} style={styles.score}>{score} pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDim,
    borderColor: colors.primaryGlow,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[6],
    maxWidth: '100%',
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  tier: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  score: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '800',
  },
});
