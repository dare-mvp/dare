import { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  leftIcon?: ReactNode;
};

export function TextField({ label, error, leftIcon, multiline, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, multiline && styles.inputShellMultiline, error && styles.inputError, style]}>
        {leftIcon ? <View style={styles.inputIcon}>{leftIcon}</View> : null}
        <TextInput
          multiline={multiline}
          placeholderTextColor={colors.textGhost}
          style={[styles.input, multiline && styles.inputMultiline]}
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
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    minHeight: 46,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
  },
  inputIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputShellMultiline: {
    alignItems: 'flex-start',
  },
  input: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    minWidth: 0,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 88,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
  },
});
