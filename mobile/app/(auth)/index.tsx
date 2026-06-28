import { useRouter } from 'expo-router';
import { Eye, ShieldCheck, Smartphone, Trophy, UserPlus, WalletCards } from 'lucide-react-native';
import { Text, View, StyleSheet } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFooterLink } from '../../src/features/auth/components/AuthFooterLink';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { AuthOptionCard } from '../../src/features/auth/components/AuthOptionCard';
import { colors, fonts, spacing } from '../../src/theme/tokens';

export default function AuthWelcomeScreen() {
  const router = useRouter();
  const { isBackendConfigured } = useAuth();

  return (
    <AuthFrame
      eyebrow="Welcome"
      title="Play for stakes with guardrails."
      subtitle="Create challenges, lock escrow, settle results, and build reputation in a dispute-ready flow."
      footer={<AuthFooterLink label="I already have an account" onPress={() => router.push('/sign-in')} />}
    >
      <View style={styles.cards}>
        <AuthOptionCard
          body="Every DARE has clear terms, escrow, and settlement status."
          icon={<Trophy color={colors.primary} size={20} />}
          title="Challenge with structure"
        />
        <AuthOptionCard
          body="Balances move only after confirmation, with limits and KYC checks in the flow."
          icon={<WalletCards color={colors.warning} size={20} />}
          title="Money stays controlled"
        />
        <AuthOptionCard
          body="Disputes can go to blind jury review when evidence is needed."
          icon={<ShieldCheck color={colors.success} size={20} />}
          title="Fairness is visible"
        />
      </View>
      <ActionButton
        accessibilityLabel="Create account"
        icon={<UserPlus color={colors.text} size={18} />}
        label="Create account"
        onPress={() => router.push('/age-gate')}
      />
      <ActionButton
        accessibilityLabel="Continue with phone code"
        icon={<Smartphone color={colors.text} size={18} />}
        label="Use phone code"
        onPress={() => router.push({
          pathname: '/phone-auth',
          params: { mode: 'sign-in' },
        })}
        variant="secondary"
      />
      <ActionButton
        accessibilityLabel="Explore public DARE feed"
        icon={<Eye color={colors.text} size={18} />}
        label="Explore DARE"
        onPress={() => router.replace('/(tabs)')}
        variant="secondary"
      />
      <Text style={styles.note}>
        {isBackendConfigured
          ? 'Explore public DAREs now. Sign in to create, accept, fund, or settle.'
          : 'Preview mode uses sample data and disables money-moving actions.'}
      </Text>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: spacing[10],
  },
  note: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
