import { useRouter } from 'expo-router';
import { Mail, Send } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFooterLink } from '../../src/features/auth/components/AuthFooterLink';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { colors, spacing } from '../../src/theme/tokens';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestReset() {
    const normalizedEmail = email.trim();
    setError(null);
    setSentMessage(null);

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter the email connected to your DARE account.');
      return;
    }

    if (!auth.isBackendConfigured) {
      setError('Password reset is not available right now.');
      return;
    }

    setSubmitting(true);
    const result = await auth.requestPasswordReset(normalizedEmail);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSentMessage(result.message ?? 'If that email has a DARE account, a reset link has been sent.');
  }

  return (
    <AuthFrame
      eyebrow="Password reset"
      footer={<AuthFooterLink label="Back to sign in" onPress={() => router.replace('/sign-in')} />}
      onBack={() => router.back()}
      title="Recover access."
      subtitle="Enter the email connected to your DARE account. The reset link opens back into the app."
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
      </View>

      {error ? <InlineAlert tone="danger" title="Reset request failed" message={error} /> : null}
      {sentMessage ? <InlineAlert tone="success" title="Check your email" message={sentMessage} /> : null}

      <ActionButton
        accessibilityLabel="Send password reset email"
        disabled={submitting}
        icon={<Send color={colors.text} size={18} />}
        label={submitting ? 'Sending' : 'Send reset link'}
        onPress={handleRequestReset}
      />
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[12],
  },
});
