import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { CourtQuestion } from '../types';

type AnswerKeyPanelProps = {
  answerText?: string;
  disabled?: boolean;
  disabledReason?: string;
  onChangeAnswer?: (value: string) => void;
  question: CourtQuestion;
};

export function AnswerKeyPanel({ answerText, disabled = false, disabledReason, onChangeAnswer, question }: AnswerKeyPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>Answer Key Prompt</Text>
      <Text style={styles.prompt}>{question.prompt}</Text>
      <TextInput
        accessibilityLabel="Answer text"
        editable={!disabled}
        multiline
        onChangeText={onChangeAnswer}
        placeholder="Type your answer exactly as agreed in the DARE rules"
        placeholderTextColor={colors.textGhost}
        style={styles.answerInput}
        textAlignVertical="top"
        value={answerText}
      />
      <Text style={styles.caption}>
        {disabled ? disabledReason ?? 'Answer submission is closed for this Court state.' : 'Your answer is only counted after confirmation.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.black,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  kicker: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  prompt: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '900',
    lineHeight: typography.body.lineHeight,
  },
  answerInput: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    minHeight: 46,
    padding: spacing[12],
  },
  caption: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
});
