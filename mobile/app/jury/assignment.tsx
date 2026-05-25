import { useRouter } from 'expo-router';
import { ArrowRight, Clock3, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { JuryFlowFrame } from '../../src/features/jury/components/JuryFlowFrame';
import { juryAssignment } from '../../src/mocks/jury';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function JuryAssignmentScreen() {
  const router = useRouter();

  return (
    <JuryFlowFrame
      eyebrow="Assignment"
      onBack={() => router.back()}
      title="Review this case?"
      subtitle="Accept only if you can vote before the assignment expires."
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <StatusBadge label={juryAssignment.category.toUpperCase()} tone="neutral" />
          <Text style={styles.reward}>{juryAssignment.rewardLabel}</Text>
        </View>
        <Text style={styles.title}>{juryAssignment.title}</Text>
        <View style={styles.metaRow}>
          <Clock3 color={colors.warning} size={18} />
          <Text style={styles.meta}>{juryAssignment.dueLabel}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <CheckLine text="Packets are anonymized as A and B." />
        <CheckLine text="Do not vote if you recognize a participant." />
        <CheckLine text="Expired assignments can reduce trust." />
      </View>

      <InlineAlert
        tone="warning"
        title="Collusion checks apply"
        message="Only continue if you have no relationship with either side of the case."
      />

      <ActionButton
        accessibilityLabel="Accept jury assignment"
        icon={<ArrowRight color={colors.text} size={18} />}
        label="Accept assignment"
        onPress={() => router.push('/jury/vote')}
      />
    </JuryFlowFrame>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <View style={styles.checkLine}>
      <ShieldCheck color={colors.success} size={17} />
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reward: {
    color: colors.warning,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  metaRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    paddingTop: spacing[12],
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  checkLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
  },
  checkText: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
});
