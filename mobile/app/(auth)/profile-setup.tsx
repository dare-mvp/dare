import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowRight, ScrollText, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TextField } from '../../src/components/ui/TextField';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { colors, spacing } from '../../src/theme/tokens';

const playStyles = [
  { label: 'Quiz', value: 'quiz' },
  { label: 'Evidence', value: 'evidence' },
  { label: 'Jury', value: 'jury' },
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [playStyle, setPlayStyle] = useState('quiz');

  return (
    <AuthFrame
      eyebrow="Profile"
      title="Shape your public DARE profile."
      subtitle="This is what other players see before they accept your challenges."
    >
      <View style={styles.form}>
        <TextField
          autoCapitalize="none"
          label="Username"
          leftIcon={<UserRound color={colors.textMuted} size={16} />}
          placeholder="@kade"
        />
        <TextField
          label="Bio"
          leftIcon={<ScrollText color={colors.textMuted} size={16} />}
          multiline
          placeholder="Fast quizzes, clean rules, fair disputes."
        />
        <SegmentedControl
          accessibilityLabel="Preferred challenge type"
          onChange={setPlayStyle}
          options={playStyles}
          value={playStyle}
        />
      </View>
      <ActionButton
        accessibilityLabel="Continue to KYC introduction"
        icon={<ArrowRight color={colors.text} size={18} />}
        label="Continue"
        onPress={() => router.push('/kyc-intro')}
      />
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[12],
  },
});
