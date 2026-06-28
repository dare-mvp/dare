import { useRouter } from 'expo-router';
import { ArrowRight, Smartphone } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { ProfileFlowFrame } from '../../src/features/profile/components/ProfileFlowFrame';
import {
  maskPhoneNumber,
  normalizePhoneNumber,
  setPendingPhoneOtp,
  validatePhoneNumber,
} from '../../src/features/auth/phoneOtp';
import { colors, spacing } from '../../src/theme/tokens';

export default function ProfilePhoneScreen() {
  const router = useRouter();
  const auth = useAuth();
  const currentPhoneValue = auth.user?.phone ? normalizePhoneNumber(auth.user.phone) : null;
  const currentPhone = currentPhoneValue ? maskPhoneNumber(currentPhoneValue) : null;
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const validationError = useMemo(() => validatePhoneNumber(phone), [phone]);
  const canRequest = auth.status === 'authenticated' && !loading && !validationError;

  return (
    <ProfileFlowFrame
      eyebrow="Phone"
      onBack={() => router.back()}
      title="Verify phone."
      subtitle="Add a phone number for account recovery and future step-up checks."
    >
      {currentPhone ? (
        <InlineAlert
          tone="success"
          title="Phone on account"
          message={`Current verified phone: ${currentPhone}.`}
        />
      ) : null}

      <InlineAlert
        tone="warning"
        title="No account merge yet"
        message="This verifies a phone on the current signed-in account. It does not merge duplicate email and phone accounts."
      />

      {auth.status !== 'authenticated' ? (
        <InlineAlert
          tone="danger"
          title="Sign in required"
          message="Sign in again before adding or changing the phone on this account."
        />
      ) : null}

      <View style={styles.form}>
        <TextField
          autoCapitalize="none"
          error={phone ? validationError ?? undefined : undefined}
          keyboardType="phone-pad"
          label="Phone number"
          leftIcon={<Smartphone color={colors.textMuted} size={16} />}
          onChangeText={setPhone}
          placeholder="+2348012345678"
          textContentType="telephoneNumber"
          value={phone}
        />
      </View>

      {error ? <InlineAlert tone="danger" title="Phone update failed" message={error} /> : null}

      <ActionButton
        accessibilityLabel="Send phone verification code"
        disabled={!canRequest}
        icon={<ArrowRight color={colors.text} size={18} />}
        label={loading ? 'Sending code' : 'Send code'}
        onPress={() => {
          void handleRequestCode();
        }}
      />

      <InlineAlert
        tone="info"
        title="Provider confirmation"
        message="Supabase sends and verifies this code. Backend controls still decide whether phone step-up is required for sensitive actions."
      />
    </ProfileFlowFrame>
  );

  async function handleRequestCode() {
    const nextError = validatePhoneNumber(phone);
    if (nextError) {
      setError(nextError);
      return;
    }

    if (auth.status !== 'authenticated') {
      setError('Sign in again before adding or changing the phone on this account.');
      return;
    }

    setLoading(true);
    setError(null);
    const normalizedPhone = normalizePhoneNumber(phone);
    if (currentPhoneValue && normalizedPhone === currentPhoneValue) {
      setLoading(false);
      setError('This phone is already verified on your account. Enter a different phone or return to settings.');
      return;
    }

    const result = await auth.requestPhoneLinkOtp(normalizedPhone);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setPendingPhoneOtp({
      channel: 'sms',
      phone: normalizedPhone,
      purpose: 'link',
      requestedAt: Date.now(),
    });
    router.push('/profile/phone-verify');
  }
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[12],
  },
});
