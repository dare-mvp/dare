import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type AmountInputProps = Omit<TextInputProps, 'keyboardType'> & {
  error?: string;
  label: string;
};

export function AmountInput({ error, label, style, ...props }: AmountInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <Text style={styles.prefix}>NGN</Text>
        <TextInput
          keyboardType="numeric"
          placeholderTextColor={colors.textGhost}
          style={[styles.input, style]}
          {...props}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[6],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: spacing[14],
  },
  inputError: {
    borderColor: colors.danger,
  },
  prefix: {
    color: colors.warning,
    fontFamily: fonts.mono,
    fontSize: 12,
    marginRight: spacing[10],
  },
  input: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    minWidth: 0,
    paddingVertical: spacing[10],
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
  },
});
