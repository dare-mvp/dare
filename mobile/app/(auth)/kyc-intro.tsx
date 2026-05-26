import { useRouter } from 'expo-router';
import { BadgeCheck, Landmark, ShieldCheck } from 'lucide-react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { KycTierBadge } from '../../src/components/ui/KycTierBadge';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { AuthOptionCard } from '../../src/features/auth/components/AuthOptionCard';
import { colors } from '../../src/theme/tokens';

export default function KycIntroScreen() {
  const router = useRouter();

  return (
    <AuthFrame
      eyebrow="KYC"
      title="Verify before higher stakes."
      subtitle="Identity checks protect withdrawals, court ready-up, and responsible gaming limits."
    >
      <KycTierBadge status="pending" tier="starter" />
      <AuthOptionCard
        body="Basic profile details can unlock low-risk preview actions."
        icon={<BadgeCheck color={colors.primary} size={20} />}
        title="Starter tier"
      />
      <AuthOptionCard
        body="Higher stakes and withdrawals require verified identity."
        icon={<Landmark color={colors.warning} size={20} />}
        title="Verified tier"
      />
      <AuthOptionCard
        body="Your KYC status is checked before money-moving actions."
        icon={<ShieldCheck color={colors.success} size={20} />}
        title="Eligibility checks"
      />
      <ActionButton
        accessibilityLabel="Start KYC submission"
        label="Start KYC"
        onPress={() => router.push('/kyc-submit')}
      />
      <ActionButton
        accessibilityLabel="Skip KYC for now"
        label="Skip for now"
        onPress={() => router.replace('/(tabs)')}
        variant="secondary"
      />
    </AuthFrame>
  );
}
