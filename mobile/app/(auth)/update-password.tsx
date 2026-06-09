import { useRouter } from 'expo-router';
import { KeyRound, LockKeyhole } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { colors, spacing } from '../../src/theme/tokens';

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleUpdatePassword() {
    setError(null);
    setSaved(false);

    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Both password fields must match.');
      return;
    }

    setSubmitting(true);
    const result = await auth.updatePassword(password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSaved(true);
  }

  return (
    <AuthFrame
      eyebrow="Password reset"
      title="Set a new password."
      subtitle="Choose a password only you know. Never share OTPs, reset links, or withdrawal codes."
    >
      <View style={styles.form}>
        <TextField
          label="New password"
          leftIcon={<LockKeyhole color={colors.textMuted} size={16} />}
          onChangeText={setPassword}
          placeholder="Enter new password"
          secureTextEntry
          value={password}
        />
        <TextField
          label="Confirm password"
          leftIcon={<LockKeyhole color={colors.textMuted} size={16} />}
          onChangeText={setConfirmPassword}
          placeholder="Repeat new password"
          secureTextEntry
          value={confirmPassword}
        />
      </View>

      {error ? <InlineAlert tone="danger" title="Password update failed" message={error} /> : null}
      {saved ? (
        <InlineAlert
          tone="success"
          title="Password updated"
          message="Your password has been changed. Continue to your account."
        />
      ) : null}

      {saved ? (
        <ActionButton
          accessibilityLabel="Continue to DARE"
          label="Continue"
          onPress={() => router.replace('/(tabs)')}
        />
      ) : (
        <ActionButton
          accessibilityLabel="Update password"
          disabled={submitting}
          icon={<KeyRound color={colors.text} size={18} />}
          label={submitting ? 'Updating' : 'Update password'}
          onPress={handleUpdatePassword}
        />
      )}
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[12],
  },
});
