import { useRouter } from 'expo-router';
import { CheckCircle2, RotateCcw, Smartphone } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFooterLink } from '../../src/features/auth/components/AuthFooterLink';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import {
  PHONE_OTP_RESEND_SECONDS,
  clearPendingPhoneOtp,
  getOtpRetryLabel,
  getPendingPhoneOtp,
  maskPhoneNumber,
  normalizeOtpCode,
  setPendingPhoneOtp,
  validateOtpCode,
} from '../../src/features/auth/phoneOtp';
import { colors, fonts } from '../../src/theme/tokens';

export default function PhoneVerifyScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pending = getPendingPhoneOtp('auth');
  const remainingSeconds = useMemo(() => {
    if (!pending) return 0;
    const elapsed = Math.floor((now - pending.requestedAt) / 1000);
    return Math.max(PHONE_OTP_RESEND_SECONDS - elapsed, 0);
  }, [now, pending]);
  const otpError = validateOtpCode(code);
  const canVerify = Boolean(pending) && !loading && !otpError;
  const maskedPhone = pending ? maskPhoneNumber(pending.phone) : 'your phone';
  const mode = pending?.authMode === 'sign-up' ? 'sign-up' : 'sign-in';

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AuthFrame
      eyebrow="Verify phone"
      onBack={() => router.replace({
        pathname: '/phone-auth',
        params: { mode },
      })}
      title="Enter the code."
      subtitle={`We sent a 6 digit code to ${maskedPhone}.`}
      footer={<AuthFooterLink label="Use email and password instead" onPress={() => router.replace('/sign-in')} />}
    >
      {!pending ? (
        <InlineAlert
          tone="warning"
          title="Request a new code"
          message="This verification session is no longer available. Request a new code, then enter it on this screen."
        />
      ) : null}

      <TextField
        autoCapitalize="none"
        error={code ? otpError ?? undefined : undefined}
        keyboardType="number-pad"
        label="Verification code"
        leftIcon={<Smartphone color={colors.textMuted} size={16} />}
        maxLength={6}
        onChangeText={(value) => setCode(normalizeOtpCode(value))}
        placeholder="123456"
        textContentType="oneTimeCode"
        value={code}
      />

      {notice ? <InlineAlert tone="success" title="Code sent" message={notice} /> : null}
      {error ? <InlineAlert tone="danger" title="Verification failed" message={error} /> : null}

      <ActionButton
        accessibilityLabel="Verify phone code"
        disabled={!canVerify}
        icon={<CheckCircle2 color={colors.text} size={18} />}
        label={loading ? 'Verifying' : 'Verify code'}
        onPress={() => {
          void handleVerify();
        }}
      />

      <ActionButton
        accessibilityLabel="Resend phone verification code"
        disabled={!pending || remainingSeconds > 0 || loading}
        icon={<RotateCcw color={colors.text} size={18} />}
        label={getOtpRetryLabel(remainingSeconds)}
        onPress={() => {
          void handleResend();
        }}
        variant="secondary"
      />

      {!pending ? (
        <ActionButton
          accessibilityLabel="Request a new phone verification code"
          icon={<RotateCcw color={colors.text} size={18} />}
          label="Request new code"
          onPress={() => router.replace({
            pathname: '/phone-auth',
            params: { mode },
          })}
          variant="secondary"
        />
      ) : null}

      <Text style={styles.note}>Codes expire. Server rate limits still apply even when the resend button is visible.</Text>
    </AuthFrame>
  );

  async function handleVerify() {
    if (!pending) {
      setError('Request a new code to continue.');
      return;
    }

    const nextError = validateOtpCode(code);
    if (nextError) {
      setError(nextError);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await auth.verifyPhoneOtp(pending.phone, code);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    clearPendingPhoneOtp();
    router.replace(mode === 'sign-up' ? '/profile-setup' : '/(tabs)');
  }

  async function handleResend() {
    if (!pending || remainingSeconds > 0) return;

    setLoading(true);
    setError(null);
    setNotice(null);
    const result = await auth.resendPhoneOtp(pending.phone);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setPendingPhoneOtp({
      ...pending,
      requestedAt: Date.now(),
    });
    setNotice(result.message ?? 'A new code was sent.');
  }
}

const styles = StyleSheet.create({
  note: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
