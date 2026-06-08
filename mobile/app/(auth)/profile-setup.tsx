import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowRight, ScrollText, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { updateMyProfile } from '../../src/lib/actions/endpoints';
import { colors, spacing } from '../../src/theme/tokens';

const playStyles = [
  { label: 'Answer Key', value: 'answer_key' },
  { label: 'Evidence', value: 'evidence' },
  { label: 'Witnessed', value: 'witnessed' },
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [playStyle, setPlayStyle] = useState('answer_key');
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState('');

  async function handleContinue() {
    setError(null);

    if (!auth.isBackendConfigured) {
      router.push('/kyc-intro');
      return;
    }

    if (auth.status !== 'authenticated') {
      setError('Sign in after confirming your email to finish profile setup.');
      return;
    }

    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
      setError('Choose a username before continuing.');
      return;
    }

    setSubmitting(true);
    const result = await updateMyProfile({
      bio: bio.trim() ? bio.trim() : null,
      username: normalizedUsername,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    router.push('/kyc-intro');
  }

  return (
    <AuthFrame
      eyebrow="Profile"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
      title="Shape your public DARE profile."
      subtitle="This is what other players see before they accept your challenges."
    >
      <View style={styles.form}>
        <TextField
          autoCapitalize="none"
          error={username && !normalizeUsername(username) ? 'Use 3-30 letters, numbers, or underscores.' : undefined}
          label="Username"
          leftIcon={<UserRound color={colors.textMuted} size={16} />}
          onChangeText={setUsername}
          placeholder="@kade"
          value={username}
        />
        <TextField
          label="Bio"
          leftIcon={<ScrollText color={colors.textMuted} size={16} />}
          multiline
          onChangeText={setBio}
          placeholder="Sharp challenges, clean rules, fair disputes."
          value={bio}
        />
        <SegmentedControl
          accessibilityLabel="Preferred challenge type"
          onChange={setPlayStyle}
          options={playStyles}
          value={playStyle}
        />
      </View>
      {error ? <InlineAlert tone="danger" title="Profile setup failed" message={error} /> : null}
      <ActionButton
        accessibilityLabel="Continue to KYC introduction"
        disabled={submitting}
        icon={<ArrowRight color={colors.text} size={18} />}
        label={submitting ? 'Saving' : 'Continue'}
        onPress={handleContinue}
      />
    </AuthFrame>
  );
}

function normalizeUsername(value: string) {
  const username = value.trim().replace(/^@+/, '');
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) return null;
  return username;
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[12],
  },
});
