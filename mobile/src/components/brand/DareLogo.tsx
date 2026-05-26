import Svg, { Path } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '../../theme/tokens';

type DareLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'lockup' | 'mark';
};

const SIZES = {
  sm: { mark: 34, text: 20 },
  md: { mark: 42, text: 24 },
  lg: { mark: 54, text: 32 },
} as const;

export function DareLogo({ size = 'md', variant = 'lockup' }: DareLogoProps) {
  const metrics = SIZES[size];

  return (
    <View accessibilityLabel="DARE" style={styles.logo}>
      <Svg width={metrics.mark} height={metrics.mark} viewBox="0 0 48 48" accessibilityElementsHidden>
        <Path
          fill={colors.primary}
          d="M6 6h18.6C34.4 6 42 13.9 42 24s-7.6 18-17.4 18H6V6Zm10.2 9.3v17.4h7.9c4.8 0 8-3.5 8-8.7s-3.2-8.7-8-8.7h-7.9Z"
        />
        <Path
          fill={colors.background}
          d="M31.7 8.4 16.1 26h8.1l-5 13.6 15.9-18.3h-8.4l5-12.9Z"
        />
      </Svg>
      {variant === 'lockup' ? (
        <Text numberOfLines={1} style={[styles.wordmark, { fontSize: metrics.text, lineHeight: metrics.text + 6 }]}>
          DARE
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
  },
  wordmark: {
    color: colors.text,
    fontFamily: fonts.display,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
