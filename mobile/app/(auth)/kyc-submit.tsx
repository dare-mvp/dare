import { useRouter } from 'expo-router';
import { BadgeCheck, Camera, IdCard, Image, X, UserRound } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useState } from 'react';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { IconButton } from '../../src/components/ui/IconButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { AuthFrame } from '../../src/features/auth/components/AuthFrame';
import {
  captureKycDocument,
  formatKycCaptureSize,
  type KycCaptureAsset,
  pickKycDocumentImage,
} from '../../src/features/kyc/kycCapture';
import { buildKycSubmitDocuments, uploadKycDocument } from '../../src/features/kyc/kycStorageUpload';
import { kycSubmitStyles as styles } from '../../src/features/kyc/kycSubmitStyles';
import { submitKyc, SubmitKycPayload } from '../../src/lib/actions/endpoints';
import { colors } from '../../src/theme/tokens';

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
  const [documentImage, setDocumentImage] = useState<KycCaptureAsset | null>(null);
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
  const documentImageRequired = true;
  const isValid = firstName.trim().length >= 2
    && lastName.trim().length >= 2
    && documentNumber.trim().length >= 4
    && (!documentImageRequired || documentImage !== null)
    && !firstNameError
    && !lastNameError
    && !documentNumberError;
  const canSubmit = auth.status === 'authenticated' && isValid && !submitting;

  return (
    <AuthFrame
      eyebrow="KYC submit"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/kyc-intro'))}
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
        <View style={styles.capturePanel}>
          <View style={styles.captureHeader}>
            <View style={styles.captureCopy}>
              <Text style={styles.captureTitle}>Document image</Text>
              <Text style={styles.captureText}>
                Capture a clear photo of the identity document before submitting.
              </Text>
            </View>
            {documentImage ? (
              <IconButton
                accessibilityLabel="Remove document image"
                icon={<X color={colors.textMuted} size={16} />}
                onPress={() => setDocumentImage(null)}
              />
            ) : null}
          </View>

          {documentImage ? (
            <View style={styles.fileRow}>
              <Image color={colors.success} size={17} />
              <View style={styles.fileCopy}>
                <Text numberOfLines={1} style={styles.fileName}>{documentImage.fileName}</Text>
                <Text style={styles.fileMeta}>{formatKycCaptureSize(documentImage.byteSize)} - ready</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.captureActions}>
            <ActionButton
              accessibilityLabel="Capture document photo"
              icon={<Camera color={colors.text} size={17} />}
              label="Camera"
              onPress={() => {
                void handleCaptureDocument();
              }}
              variant="secondary"
            />
            <ActionButton
              accessibilityLabel="Choose document image"
              icon={<Image color={colors.text} size={17} />}
              label="Library"
              onPress={() => {
                void handlePickDocumentImage();
              }}
              variant="secondary"
            />
          </View>
        </View>
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
    if (auth.status !== 'authenticated' || !auth.user || !documentImage) return;

    setSubmitting(true);
    setSubmitError(null);

    const uploadResult = await uploadKycDocument({
      file: documentImage,
      userId: auth.user.id,
    });
    if (!uploadResult.ok) {
      setSubmitError(uploadResult.message);
      setSubmitting(false);
      return;
    }

    const documents = buildKycSubmitDocuments({
      documentImage,
      documentNumber,
      documentType,
      firstName,
      lastName,
      storagePath: uploadResult.storagePath,
    });
    if (!documents) {
      setSubmitError('Check the details and try again.');
      setSubmitting(false);
      return;
    }

    const payload: SubmitKycPayload = {
      documents,
      kycTierRequested: getRequestedTier(documentType),
    };

    const result = await submitKyc(payload);
    if (!result.ok) {
      setSubmitError('We could not submit verification right now. Try again.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.replace('/kyc-status');
  }

  async function handleCaptureDocument() {
    setSubmitError(null);
    const result = await captureKycDocument();
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    if ('file' in result) setDocumentImage(result.file);
  }

  async function handlePickDocumentImage() {
    setSubmitError(null);
    const result = await pickKycDocumentImage();
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    if ('file' in result) setDocumentImage(result.file);
  }
}

function getRequestedTier(documentType: string): SubmitKycPayload['kycTierRequested'] {
  return documentType === 'passport' ? 'kyc2' : 'kyc1';
}
