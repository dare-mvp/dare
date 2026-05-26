import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '../../../theme/tokens';

const steps = ['Type', 'Terms', 'Stake', 'Review'];

export function CreateStepper() {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <View key={step} style={styles.step}>
          <View style={[styles.circle, index === 0 && styles.circleActive]}>
            <Text style={[styles.index, index === 0 && styles.indexActive]}>{index + 1}</Text>
          </View>
          <Text style={[styles.label, index === 0 && styles.labelActive]}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing[14],
  },
  step: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[6],
  },
  circle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  circleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  index: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  indexActive: {
    color: colors.text,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  labelActive: {
    color: colors.text,
  },
});
