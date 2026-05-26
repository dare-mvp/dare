import { useRouter } from 'expo-router';
import { Clock3 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { KycTierBadge } from '../../src/components/ui/KycTierBadge';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { useMe } from '../../src/features/me/useMe';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function KycStatusScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const kycStatus = data.profile.kycStatus;
  const checks = getKycChecks(kycStatus);
  const badgeStatus = kycStatus === 'verified' ? 'verified' : 'pending';

  return (
    <AuthFrame
      eyebrow="KYC status"
      title={getKycTitle(kycStatus)}
      subtitle={getKycSubtitle(kycStatus)}
    >
      {data.source === 'mock' && !error ? (
        <InlineAlert
          tone="info"
          title={loading ? 'Syncing KYC' : 'Preview status'}
          message={loading ? 'Identity status is loading.' : 'Live KYC status appears after sign-in and sync.'}
        />
      ) : null}

      {error ? (
        <InlineAlert
          tone="danger"
          title="KYC sync failed"
          message={error}
        />
      ) : null}

      <View style={styles.statusHero}>
        <Clock3 color={colors.warning} size={28} />
        <View style={styles.statusCopy}>
          <KycTierBadge status={badgeStatus} tier={data.profile.kycTier} />
          <Text style={styles.statusTitle}>{getKycHeroTitle(kycStatus)}</Text>
          <Text style={styles.statusText}>{getKycHeroText(kycStatus)}</Text>
        </View>
      </View>
      <View style={styles.checks}>
        {checks.map((check) => (
          <View key={check.label} style={styles.checkRow}>
            <Text style={styles.checkLabel}>{check.label}</Text>
            <StatusBadge label={check.status.toUpperCase()} tone={check.status === 'Received' || check.status === 'Ready' ? 'success' : 'warning'} />
          </View>
        ))}
      </View>
      <ActionButton accessibilityLabel="Continue to app" label="Continue" onPress={() => router.replace('/(tabs)')} />
    </AuthFrame>
  );
}

function getKycTitle(status: string) {
  if (status === 'verified') return 'Verification approved.';
  if (status === 'not_started') return 'Verification needed.';
  return 'Verification pending.';
}

function getKycSubtitle(status: string) {
  if (status === 'verified') return 'Your verified tier is active for eligible stakes, withdrawals, and court ready-up.';
  if (status === 'not_started') return 'Submit identity details before higher stakes and withdrawals are enabled.';
  return 'You can explore the app while verification is reviewed. Higher stakes remain locked until approval.';
}

function getKycHeroTitle(status: string) {
  if (status === 'verified') return 'Verified tier active';
  if (status === 'not_started') return 'Identity details required';
  return 'Review in progress';
}

function getKycHeroText(status: string) {
  if (status === 'verified') return 'Your account can use features allowed by the current verified tier.';
  if (status === 'not_started') return 'Start KYC to unlock higher limits and provider withdrawal checks.';
  return 'We will show your verified tier once identity checks are complete.';
}

function getKycChecks(status: string) {
  if (status === 'verified') {
    return [
      { label: 'Profile details', status: 'Received' },
      { label: 'Identity document', status: 'Received' },
      { label: 'Withdrawal eligibility', status: 'Ready' },
    ];
  }

  if (status === 'not_started') {
    return [
      { label: 'Profile details', status: 'Received' },
      { label: 'Identity document', status: 'Needed' },
      { label: 'Withdrawal eligibility', status: 'Locked' },
    ];
  }

  return [
    { label: 'Profile details', status: 'Received' },
    { label: 'Identity document', status: 'Pending' },
    { label: 'Withdrawal eligibility', status: 'Locked' },
  ];
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
