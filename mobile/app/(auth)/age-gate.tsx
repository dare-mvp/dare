import { useState } from 'react';
import { useRouter } from 'expo-router';
import { CalendarCheck, MapPinned, ShieldAlert } from 'lucide-react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { AuthOptionCard } from '../../src/features/auth/components/AuthOptionCard';
import { colors } from '../../src/theme/tokens';

export default function AgeGateScreen() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <AuthFrame
      eyebrow="Age gate"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      title="Confirm eligibility before stakes."
      subtitle="DARE is for adults only. Eligibility checks protect payments, disputes, and responsible gaming limits."
    >
      <AuthOptionCard
        body="I confirm I am at least 18 years old."
        icon={<CalendarCheck color={colors.primary} size={20} />}
        onPress={() => setConfirmed((value) => !value)}
        selected={confirmed}
        title="Age confirmed"
      />
      <AuthOptionCard
        body="I understand real-money features may depend on location, KYC, and account limits."
        icon={<MapPinned color={colors.warning} size={20} />}
        selected
        title="Location and limits apply"
      />
      <AuthOptionCard
        body="I will use responsible gaming controls when setting deposit, stake, or session limits."
        icon={<ShieldAlert color={colors.success} size={20} />}
        selected
        title="Responsible play"
      />
      <ActionButton
        accessibilityLabel="Continue after age confirmation"
        disabled={!confirmed}
        label="Continue"
        onPress={() => router.push('/sign-up')}
      />
    </AuthFrame>
  );
}
