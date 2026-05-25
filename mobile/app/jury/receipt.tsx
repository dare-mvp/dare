import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { JuryFlowFrame } from '../../src/features/jury/components/JuryFlowFrame';
import { juryAssignment } from '../../src/mocks/jury';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

const receiptLines = [
  { label: 'Case', value: juryAssignment.caseId.toUpperCase() },
  { label: 'Reward', value: juryAssignment.rewardLabel },
  { label: 'Status', value: 'Vote submitted' },
  { label: 'Trust event', value: 'Pending verdict' },
];

export default function JuryReceiptScreen() {
  const router = useRouter();
  const { vote } = useLocalSearchParams<{ vote?: string }>();
  const submittedVote = vote === 'B' ? 'B' : 'A';

  return (
    <JuryFlowFrame
      eyebrow="Receipt"
      onBack={() => router.back()}
      title="Vote submitted."
      subtitle="Your vote is recorded and cannot be changed."
    >
      <View style={styles.hero}>
        <CheckCircle2 color={colors.success} size={32} />
        <StatusBadge label={`PACKET ${submittedVote}`} tone="success" />
        <Text style={styles.title}>Jury vote received</Text>
        <Text style={styles.body}>Reward and trust updates are finalized after the case verdict is settled.</Text>
      </View>

      <View style={styles.receipt}>
        {receiptLines.map((line) => (
          <View key={line.label} style={styles.line}>
            <Text style={styles.label}>{line.label}</Text>
            <Text numberOfLines={1} style={styles.value}>{line.value}</Text>
          </View>
        ))}
      </View>

      <ActionButton
        accessibilityLabel="Back to jury home"
        label="Back to jury"
        onPress={() => router.replace('/jury')}
      />
    </JuryFlowFrame>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    backgroundColor: colors.successDim,
    borderColor: colors.success,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[20],
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  receipt: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  line: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[14],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
});
