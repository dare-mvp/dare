import { useRouter } from 'expo-router';
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFooterLink } from '../../src/features/auth/components/AuthFooterLink';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { colors, spacing } from '../../src/theme/tokens';

export default function SignUpScreen() {
  const router = useRouter();
  const { isBackendConfigured, signUpWithPassword } = useAuth();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  async function handleContinue() {
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isBackendConfigured) {
      router.push('/profile-setup');
      return;
    }

    setLoading(true);
    const result = await signUpWithPassword({ displayName, email, password });
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push('/profile-setup');
  }

  return (
    <AuthFrame
      eyebrow="Create account"
      title="Create secure sign-in."
      subtitle="Use accurate details. KYC, limits, and withdrawals depend on account identity."
      footer={<AuthFooterLink label="Already registered? Sign in" onPress={() => router.push('/sign-in')} />}
    >
      <View style={styles.form}>
        <TextField
          label="Display name"
          leftIcon={<UserRound color={colors.textMuted} size={16} />}
          onChangeText={setDisplayName}
          placeholder="Kade"
          value={displayName}
        />
        <TextField
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          leftIcon={<Mail color={colors.textMuted} size={16} />}
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />
        <TextField
          label="Password"
          leftIcon={<LockKeyhole color={colors.textMuted} size={16} />}
          onChangeText={setPassword}
          placeholder="Create password"
          secureTextEntry
          value={password}
        />
        <TextField
          label="Confirm password"
          leftIcon={<LockKeyhole color={colors.textMuted} size={16} />}
          onChangeText={setConfirmPassword}
          placeholder="Repeat password"
          secureTextEntry
          value={confirmPassword}
        />
      </View>
      {error ? <InlineAlert tone="danger" title="Sign-up failed" message={error} /> : null}
      <ActionButton
        accessibilityLabel="Continue to profile setup"
        disabled={isBackendConfigured && (!displayName || !email || !password || !confirmPassword || loading)}
        icon={<ArrowRight color={colors.text} size={18} />}
        label="Continue"
        onPress={handleContinue}
      />
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[12],
  },
});
