import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, Mail, Smartphone } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFooterLink } from '../../src/features/auth/components/AuthFooterLink';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import {
  normalizePhoneNumber,
  setPendingPhoneOtp,
  validatePhoneNumber,
} from '../../src/features/auth/phoneOtp';
import { colors, fonts, spacing } from '../../src/theme/tokens';

type PhoneAuthMode = 'sign-in' | 'sign-up';

export default function PhoneAuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const auth = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mode = params.mode === 'sign-up' ? 'sign-up' : 'sign-in';
  const validationError = useMemo(() => validatePhoneNumber(phone), [phone]);
  const canRequest = !loading && !validationError;

  return (
    <AuthFrame
      eyebrow="Phone sign-in"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
      title={mode === 'sign-up' ? 'Create account with phone.' : 'Continue with phone.'}
      subtitle="Use the phone number tied to your wallet, KYC, and support recovery."
      footer={<AuthFooterLink label="Use email and password instead" onPress={() => router.replace('/sign-in')} />}
    >
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

      {error ? <InlineAlert tone="danger" title="Code request failed" message={error} /> : null}

      <ActionButton
        accessibilityLabel="Send phone verification code"
        disabled={!canRequest}
        icon={<ArrowRight color={colors.text} size={18} />}
        label={loading ? 'Sending code' : 'Send code'}
        onPress={() => {
          void handleRequestCode();
        }}
      />

      <ActionButton
        accessibilityLabel="Use email sign-in"
        icon={<Mail color={colors.text} size={18} />}
        label="Use email"
        onPress={() => router.replace('/sign-in')}
        variant="secondary"
      />

      <InlineAlert
        tone="info"
        title="SMS provider required"
        message="Phone OTP depends on Supabase phone Auth and SMS provider setup. If unavailable, email sign-in remains supported."
      />

      <Text style={styles.securityNote}>DARE will never ask support agents to collect your OTP.</Text>
    </AuthFrame>
  );

  async function handleRequestCode() {
    const nextError = validatePhoneNumber(phone);
    if (nextError) {
      setError(nextError);
      return;
    }

    if (!auth.isBackendConfigured) {
      setError('Phone sign-in is not available in preview mode.');
      return;
    }

    setLoading(true);
    setError(null);
    const normalizedPhone = normalizePhoneNumber(phone);
    const result = await auth.requestPhoneOtp(normalizedPhone, mode);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setPendingPhoneOtp({
      authMode: mode,
      channel: 'sms',
      phone: normalizedPhone,
      purpose: 'auth',
      requestedAt: Date.now(),
    });
    router.push('/phone-verify');
  }
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
