import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { CheckCircle2, RotateCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { colors } from '../../src/theme/tokens';

type ConfirmationStatus = 'checking' | 'failed' | 'success';

export default function AuthCallbackScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConfirmationStatus>('checking');

  useEffect(() => {
    let mounted = true;

    async function confirm() {
      const callbackUrl = await Linking.getInitialURL();
      if (!mounted) return;

      if (!callbackUrl) {
        setError('This confirmation link could not be opened. Sign in to continue.');
        setStatus('failed');
        return;
      }

      const result = await auth.completeEmailConfirmation(callbackUrl);
      if (!mounted) return;

      if (!result.ok) {
        setError(result.message);
        setStatus('failed');
        return;
      }

      setStatus('success');
      router.replace('/profile-setup');
    }

    void confirm();

    return () => {
      mounted = false;
    };
  }, [auth, router]);

  return (
    <AuthFrame
      eyebrow="Account confirmation"
      title={status === 'success' ? 'Email confirmed.' : 'Confirming your email.'}
      subtitle="This only takes a moment."
    >
      {status === 'checking' ? (
        <InlineAlert
          tone="info"
          title="Checking link"
          message="Keep this screen open while we finish account confirmation."
        />
      ) : null}

      {status === 'failed' && error ? (
        <InlineAlert tone="danger" title="Confirmation failed" message={error} />
      ) : null}

      {status === 'success' ? (
        <InlineAlert
          tone="success"
          title="Account confirmed"
          message="Finish your profile to continue."
        />
      ) : null}

      {status === 'failed' ? (
        <ActionButton
          accessibilityLabel="Go to sign in"
          icon={<RotateCw color={colors.text} size={18} />}
          label="Go to sign in"
          onPress={() => router.replace('/sign-in')}
        />
      ) : (
        <ActionButton
          accessibilityLabel="Continue"
          disabled
          icon={<CheckCircle2 color={colors.text} size={18} />}
          label={status === 'success' ? 'Confirmed' : 'Confirming'}
        />
      )}
    </AuthFrame>
  );
}
