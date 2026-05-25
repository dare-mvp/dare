import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../theme/tokens';

type KycTierBadgeProps = {
  status?: 'pending' | 'verified' | 'rejected';
  tier: string;
};

const statusTone = {
  pending: { background: colors.warningDim, border: colors.warning, text: colors.warning },
  verified: { background: colors.successDim, border: colors.success, text: colors.success },
  rejected: { background: colors.dangerDim, border: colors.danger, text: colors.danger },
} as const;

export function KycTierBadge({ status = 'pending', tier }: KycTierBadgeProps) {
  const tone = statusTone[status];

  return (
    <View
      accessibilityLabel={`KYC ${tier}, ${status}`}
      style={[styles.badge, { backgroundColor: tone.background, borderColor: tone.border }]}
    >
      <Text numberOfLines={1} style={[styles.text, { color: tone.text }]}>
        KYC {tier.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  text: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },
});
