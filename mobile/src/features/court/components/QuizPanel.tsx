import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { CourtQuestion } from '../types';

type QuizPanelProps = {
  onSelectOption?: (index: number) => void;
  question: CourtQuestion;
  selectedOptionIndex?: number;
};

export function QuizPanel({ onSelectOption, question, selectedOptionIndex }: QuizPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>Question 4 of 12</Text>
      <Text style={styles.prompt}>{question.prompt}</Text>
      <View style={styles.options}>
        {question.options.map((option, index) => {
          const selected = selectedOptionIndex === undefined
            ? option === question.selectedOption
            : index === selectedOptionIndex;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => onSelectOption?.(index)}
              style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.optionPressed]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.caption}>Your answer is only counted after confirmation.</Text>
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
  options: {
    gap: spacing[8],
  },
  option: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: spacing[14],
  },
  optionSelected: {
    backgroundColor: colors.successDim,
    borderColor: colors.success,
  },
  optionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  optionText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
  },
  optionTextSelected: {
    color: colors.success,
  },
  caption: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
});
