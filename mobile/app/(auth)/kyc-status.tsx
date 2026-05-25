import { useRouter } from 'expo-router';
import { Clock3 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { KycTierBadge } from '../../src/components/ui/KycTierBadge';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

const checks = [
  { label: 'Profile details', status: 'Received' },
  { label: 'Identity document', status: 'Pending' },
  { label: 'Withdrawal eligibility', status: 'Locked' },
];

export default function KycStatusScreen() {
  const router = useRouter();

  return (
    <AuthFrame
      eyebrow="KYC status"
      title="Verification is pending."
      subtitle="You can explore the app while verification is reviewed. Higher stakes remain locked until approval."
    >
      <View style={styles.statusHero}>
        <Clock3 color={colors.warning} size={28} />
        <View style={styles.statusCopy}>
          <KycTierBadge status="pending" tier="starter" />
          <Text style={styles.statusTitle}>Review in progress</Text>
          <Text style={styles.statusText}>We will show your verified tier once identity checks are complete.</Text>
        </View>
      </View>
      <View style={styles.checks}>
        {checks.map((check) => (
          <View key={check.label} style={styles.checkRow}>
            <Text style={styles.checkLabel}>{check.label}</Text>
            <StatusBadge label={check.status.toUpperCase()} tone={check.status === 'Received' ? 'success' : 'warning'} />
          </View>
        ))}
      </View>
      <ActionButton accessibilityLabel="Continue to app" label="Continue" onPress={() => router.replace('/(tabs)')} />
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  statusHero: {
    alignItems: 'flex-start',
    backgroundColor: colors.warningDim,
    borderColor: colors.warning,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[16],
  },
  statusCopy: {
    flex: 1,
    gap: spacing[8],
    minWidth: 0,
  },
  statusTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  statusText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  checks: {
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
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[14],
  },
  checkLabel: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
  },
});
