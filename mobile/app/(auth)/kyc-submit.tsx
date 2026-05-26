import { useRouter } from 'expo-router';
import { BadgeCheck, IdCard, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import { submitKyc, SubmitKycPayload } from '../../src/lib/actions/endpoints';
import { colors, spacing } from '../../src/theme/tokens';

const documentTypes = [
  { label: 'NIN', value: 'nin' },
  { label: 'BVN', value: 'bvn' },
  { label: 'Passport', value: 'passport' },
];

export default function KycSubmitScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [documentType, setDocumentType] = useState('nin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const firstNameError = firstName.trim().length > 0 && firstName.trim().length < 2
    ? 'Enter your legal first name.'
    : undefined;
  const lastNameError = lastName.trim().length > 0 && lastName.trim().length < 2
    ? 'Enter your legal last name.'
    : undefined;
  const documentNumberError = documentNumber.trim().length > 0 && documentNumber.trim().length < 4
    ? 'Enter a valid document number.'
    : undefined;
  const isValid = firstName.trim().length >= 2
    && lastName.trim().length >= 2
    && documentNumber.trim().length >= 4
    && !firstNameError
    && !lastNameError
    && !documentNumberError;
  const canSubmit = auth.status === 'authenticated' && isValid && !submitting;

  return (
    <AuthFrame
      eyebrow="KYC submit"
      title="Submit identity details."
      subtitle="Use the same legal details tied to your payment and withdrawal accounts."
    >
      <View style={styles.form}>
        {auth.status !== 'authenticated' ? (
          <InlineAlert
            tone="warning"
            title="Sign in required"
            message="KYC submission is sent to your account, so you need an active session before submitting."
          />
        ) : null}

        {submitError ? (
          <InlineAlert
            tone="danger"
            title="KYC submit failed"
            message={submitError}
          />
        ) : null}

        <TextField
          autoCapitalize="words"
          error={firstNameError}
          label="Legal first name"
          leftIcon={<UserRound color={colors.textMuted} size={16} />}
          onChangeText={setFirstName}
          placeholder="Kade"
          value={firstName}
        />
        <TextField
          autoCapitalize="words"
          error={lastNameError}
          label="Legal last name"
          leftIcon={<UserRound color={colors.textMuted} size={16} />}
          onChangeText={setLastName}
          placeholder="Adewale"
          value={lastName}
        />
        <SegmentedControl
          accessibilityLabel="Identity document type"
          onChange={setDocumentType}
          options={documentTypes}
          value={documentType}
        />
        <TextField
          autoCapitalize="characters"
          error={documentNumberError}
          label="Document number"
          leftIcon={<IdCard color={colors.textMuted} size={16} />}
          onChangeText={setDocumentNumber}
          placeholder="Enter document number"
          value={documentNumber}
        />
      </View>
      <InlineAlert
        tone="warning"
        title="Use accurate details"
        message="Incorrect identity details can block withdrawals and court ready-up for higher stakes."
      />
      <ActionButton
        accessibilityLabel="Submit KYC details"
        disabled={!canSubmit}
        icon={<BadgeCheck color={colors.text} size={18} />}
        label={submitting ? 'Submitting' : 'Submit KYC'}
        onPress={() => {
          void handleSubmit();
        }}
      />
    </AuthFrame>
  );

  async function handleSubmit() {
    if (!canSubmit) return;

    const payload: SubmitKycPayload = {
      documents: {
        documentNumber: documentNumber.trim().toUpperCase(),
        documentType,
        legalFirstName: firstName.trim(),
        legalLastName: lastName.trim(),
      },
      kycTierRequested: getRequestedTier(documentType),
    };

    setSubmitting(true);
    setSubmitError(null);

    const result = await submitKyc(payload);
    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.replace('/kyc-status');
  }
}

function getRequestedTier(documentType: string): SubmitKycPayload['kycTierRequested'] {
  return documentType === 'passport' ? 'kyc2' : 'kyc1';
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[12],
  },
});
