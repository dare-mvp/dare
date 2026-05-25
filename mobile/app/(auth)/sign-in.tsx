import { useRouter } from 'expo-router';
import { LockKeyhole, LogIn, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFooterLink } from '../../src/features/auth/components/AuthFooterLink';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { colors, fonts, spacing } from '../../src/theme/tokens';

export default function SignInScreen() {
  const router = useRouter();
  const { isBackendConfigured, signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  async function handleSignIn() {
    setError(null);

    if (!isBackendConfigured) {
      router.replace('/(tabs)');
      return;
    }

    setLoading(true);
    const result = await signInWithPassword(email, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.replace('/(tabs)');
  }

  return (
    <AuthFrame
      eyebrow="Sign in"
      title="Return to your DARE account."
      subtitle="Use the email connected to your wallet, KYC, limits, and court history."
      footer={<AuthFooterLink label="Need an account? Create one" onPress={() => router.push('/age-gate')} />}
    >
      <View style={styles.form}>
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
          placeholder="Enter password"
          secureTextEntry
          value={password}
        />
      </View>
      {error ? (
        <InlineAlert tone="danger" title="Sign-in failed" message={error} />
      ) : null}
      <ActionButton
        accessibilityLabel={isBackendConfigured ? 'Sign in' : 'Open preview'}
        disabled={isBackendConfigured && (!email || !password || loading)}
        icon={<LogIn color={colors.text} size={18} />}
        label={isBackendConfigured ? (loading ? 'Signing in' : 'Sign in') : 'Open preview'}
        onPress={handleSignIn}
      />
      <AuthFooterLink label="Forgot password?" onPress={() => undefined} />
      {!isBackendConfigured ? (
        <InlineAlert
          tone="info"
          title="Preview access"
          message="You can explore sample screens now. Account sign-in is required before money-moving actions are enabled."
        />
      ) : null}
      <Text style={styles.securityNote}>Never share passwords, OTPs, or withdrawal codes with anyone.</Text>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[12],
  },
  securityNote: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
