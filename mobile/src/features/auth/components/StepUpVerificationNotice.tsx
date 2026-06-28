import { ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { getStepUpVerificationCopy } from '../phoneOtp';

type StepUpVerificationNoticeProps = {
  actionLabel: string;
  hasVerifiedPhone?: boolean;
};

export function StepUpVerificationNotice({ actionLabel, hasVerifiedPhone = true }: StepUpVerificationNoticeProps) {
  const copy = getStepUpVerificationCopy(actionLabel);
  const body = hasVerifiedPhone
    ? copy.body
    : `${copy.body} Add and verify a phone in Settings before relying on phone step-up for this action.`;

  return (
    <View accessibilityRole="summary" style={styles.panel}>
      <View style={styles.icon}>
        <ShieldCheck color={colors.warning} size={18} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    backgroundColor: colors.warningDim,
    borderColor: colors.warning,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[14],
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  copy: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '900',
  },
  body: {
    color: colors.textSoft,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
});
