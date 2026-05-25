import { DimensionValue, StyleSheet, View } from 'react-native';

import { colors, radius } from '../../../theme/tokens';

type ProgressBarProps = {
  color?: string;
  value: number;
};

export function ProgressBar({ color = colors.primary, value }: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(100, value))}%` as DimensionValue;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { backgroundColor: color, width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    height: 5,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radius.pill,
    height: '100%',
  },
});
