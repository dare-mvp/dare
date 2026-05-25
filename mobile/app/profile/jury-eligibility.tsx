import { useRouter } from 'expo-router';
import { ShieldCheck, Vote } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { ProfileFlowFrame } from '../../src/features/profile/components/ProfileFlowFrame';
import { profileSummary } from '../../src/mocks/profile';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

const checks = [
  { label: 'KYC status', value: 'Pending Tier 1', passed: false },
  { label: 'Trust score', value: `${profileSummary.trustScore} pts`, passed: true },
  { label: 'Vote history', value: '18 completed', passed: true },
  { label: 'Collusion guard', value: 'Required per case', passed: true },
];

export default function JuryEligibilityScreen() {
  const router = useRouter();

  return (
    <ProfileFlowFrame
      eyebrow="Jury eligibility"
      onBack={() => router.back()}
      title="Jury status."
      subtitle="Jury assignments depend on trust, KYC status, categories, and collusion checks."
    >
      <View style={styles.hero}>
        <Vote color={colors.purple} size={30} />
        <View style={styles.heroCopy}>
          <StatusBadge label="ELIGIBLE PREVIEW" tone="neutral" />
          <Text style={styles.title}>Assignment readiness</Text>
          <Text style={styles.body}>Eligibility is confirmed again before every jury assignment.</Text>
        </View>
      </View>

      <View style={styles.panel}>
        {checks.map((check) => (
          <View key={check.label} style={styles.checkRow}>
            <ShieldCheck color={check.passed ? colors.success : colors.warning} size={18} />
            <View style={styles.checkCopy}>
              <Text style={styles.checkLabel}>{check.label}</Text>
              <Text style={styles.checkValue}>{check.value}</Text>
            </View>
            <StatusBadge label={check.passed ? 'OK' : 'PENDING'} tone={check.passed ? 'success' : 'warning'} />
          </View>
        ))}
      </View>

      <InlineAlert
        tone="warning"
        title="Recognized participants"
        message="Skip any case where you recognize a player, device, household, or close relationship."
      />
      <ActionButton accessibilityLabel="Open jury" label="Open jury" onPress={() => router.push('/jury')} />
    </ProfileFlowFrame>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    backgroundColor: colors.purpleDim,
    borderColor: colors.purple,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[16],
  },
  heroCopy: {
    flex: 1,
    gap: spacing[8],
    minWidth: 0,
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
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  checkRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    minHeight: 54,
    paddingHorizontal: spacing[14],
  },
  checkCopy: {
    flex: 1,
    minWidth: 0,
  },
  checkLabel: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
  },
  checkValue: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    marginTop: spacing[4],
  },
});
