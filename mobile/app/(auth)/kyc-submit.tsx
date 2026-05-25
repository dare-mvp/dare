import { useRouter } from 'expo-router';
import { BadgeCheck, IdCard, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TextField } from '../../src/components/ui/TextField';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { colors, spacing } from '../../src/theme/tokens';
import { useState } from 'react';

const documentTypes = [
  { label: 'NIN', value: 'nin' },
  { label: 'BVN', value: 'bvn' },
  { label: 'Passport', value: 'passport' },
];

export default function KycSubmitScreen() {
  const router = useRouter();
  const [documentType, setDocumentType] = useState('nin');

  return (
    <AuthFrame
      eyebrow="KYC submit"
      title="Submit identity details."
      subtitle="Use the same legal details tied to your payment and withdrawal accounts."
    >
      <View style={styles.form}>
        <TextField label="Legal first name" leftIcon={<UserRound color={colors.textMuted} size={16} />} placeholder="Kade" />
        <TextField label="Legal last name" leftIcon={<UserRound color={colors.textMuted} size={16} />} placeholder="Adewale" />
        <SegmentedControl
          accessibilityLabel="Identity document type"
          onChange={setDocumentType}
          options={documentTypes}
          value={documentType}
        />
        <TextField
          autoCapitalize="characters"
          label="Document number"
          leftIcon={<IdCard color={colors.textMuted} size={16} />}
          placeholder="Enter document number"
        />
      </View>
      <InlineAlert
        tone="warning"
        title="Use accurate details"
        message="Incorrect identity details can block withdrawals and court ready-up for higher stakes."
      />
      <ActionButton
        accessibilityLabel="Submit KYC details"
        icon={<BadgeCheck color={colors.text} size={18} />}
        label="Submit KYC"
        onPress={() => router.push('/kyc-status')}
      />
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[12],
  },
});
