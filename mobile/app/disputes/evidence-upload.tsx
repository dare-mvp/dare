import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UploadCloud } from 'lucide-react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { EvidenceDraftFile, EvidenceUploader } from '../../src/features/evidence/components/EvidenceUploader';
import {
  captureEvidenceWithCamera,
  formatEvidenceSize,
  pickEvidenceDocument,
  pickEvidenceFromLibrary,
  SelectedEvidenceFile,
  uploadSelectedEvidence,
} from '../../src/features/evidence/uploadEvidence';
import { DisputeFlowFrame } from '../../src/features/disputes/components/DisputeFlowFrame';
import {
  confirmEvidenceUpload,
  fileDispute,
  requestEvidenceUpload,
  submitResultClaim,
  type DisputeReason,
  type ResultClaimOutcome,
} from '../../src/lib/actions/endpoints';
import { isUuid } from '../../src/lib/ids';
import { colors } from '../../src/theme/tokens';

export default function EvidenceUploadScreen() {
  const router = useRouter();
  const { claimOutcome, dareId, mode, rationale, reason, summary } = useLocalSearchParams<{
    claimOutcome?: ResultClaimOutcome;
    dareId?: string;
    mode?: 'dispute' | 'result-claim';
    rationale?: string;
    reason?: DisputeReason;
    summary?: string;
  }>();
  const isResultClaim = mode === 'result-claim';
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedEvidenceFile | null>(null);
  const files: EvidenceDraftFile[] = selectedFile
    ? [{
        id: selectedFile.uri,
        name: selectedFile.fileName,
        sizeLabel: formatEvidenceSize(selectedFile.byteSize),
        status: submitting ? 'uploading' : 'ready',
      }]
    : [];

  return (
    <DisputeFlowFrame
      eyebrow="Evidence"
      onBack={() => router.back()}
      title="Attach evidence."
      subtitle={isResultClaim ? 'Use clear files that prove the claimed result under the DARE rules.' : 'Use clear files that help a reviewer understand the dispute without seeing player identities.'}
    >
      <EvidenceUploader
        files={files}
        onAddFile={() => {
          void handlePickDocument();
        }}
        onCamera={() => {
          void handleCaptureEvidence();
        }}
        onPickMedia={() => {
          void handlePickMedia();
        }}
        onRemoveFile={() => setSelectedFile(null)}
      />
      <InlineAlert
        tone="info"
        title="Blind review ready"
        message="Evidence should support the claim without unnecessary personal details."
      />
      {submitError ? (
        <InlineAlert
          tone="danger"
          title="Dispute submission failed"
          message={submitError}
        />
      ) : null}
      <ActionButton
        accessibilityLabel={isResultClaim ? 'Submit result evidence' : 'Submit dispute evidence'}
        disabled={submitting || !selectedFile}
        icon={<UploadCloud color={colors.text} size={18} />}
        label={submitting ? 'Submitting' : isResultClaim ? 'Submit result evidence' : 'Submit dispute evidence'}
        onPress={() => {
          void handleSubmitDispute();
        }}
      />
    </DisputeFlowFrame>
  );

  async function handlePickMedia() {
    setSubmitError(null);
    const result = await pickEvidenceFromLibrary();
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    if ('file' in result) setSelectedFile(result.file);
  }

  async function handlePickDocument() {
    setSubmitError(null);
    const result = await pickEvidenceDocument();
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    if ('file' in result) setSelectedFile(result.file);
  }

  async function handleCaptureEvidence() {
    setSubmitError(null);
    const result = await captureEvidenceWithCamera();
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    if ('file' in result) setSelectedFile(result.file);
  }

  async function handleSubmitDispute() {
    if (!isUuid(dareId)) {
      router.push('/disputes/status');
      return;
    }

    if (!isResultClaim && (!summary || !reason)) {
      router.push('/disputes/status');
      return;
    }

    if (isResultClaim && !isResultClaimOutcome(claimOutcome)) {
      setSubmitError('Choose a valid result before attaching evidence.');
      return;
    }
    const resultClaimOutcome = isResultClaim && isResultClaimOutcome(claimOutcome)
      ? claimOutcome
      : null;

    if (!selectedFile) {
      setSubmitError('Attach one evidence file before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const uploadRequest = await requestEvidenceUpload(dareId, {
      fileName: selectedFile.fileName,
      fileSizeBytes: selectedFile.byteSize,
      mimeType: selectedFile.mimeType,
    });

    if (!uploadRequest.ok) {
      setSubmitError(uploadRequest.error.message);
      setSubmitting(false);
      return;
    }

    const uploadResult = await uploadSelectedEvidence(uploadRequest.data, selectedFile);
    if (!uploadResult.ok) {
      setSubmitError(uploadResult.message);
      setSubmitting(false);
      return;
    }

    const confirmResult = await confirmEvidenceUpload(dareId, {
      evidenceObjectId: uploadRequest.data.evidenceObjectId,
    });

    if (!confirmResult.ok) {
      setSubmitError(confirmResult.error.message);
      setSubmitting(false);
      return;
    }

    if (isResultClaim) {
      const claimResult = await submitResultClaim(dareId, {
        claimedOutcome: resultClaimOutcome!,
        evidenceObjectIds: [uploadRequest.data.evidenceObjectId],
        rationale: rationale || undefined,
      });

      if (!claimResult.ok) {
        setSubmitError(claimResult.error.message);
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      router.push({
        pathname: '/court/result',
        params: {
          claimState: claimResult.data.claimState,
          dareId: claimResult.data.dareId,
          status: claimResult.data.dareStatus,
          winnerId: claimResult.data.agreedWinnerId ?? undefined,
        },
      });
      return;
    }

    const disputeResult = await fileDispute(dareId, {
      evidenceObjectIds: [uploadRequest.data.evidenceObjectId],
      reason: reason!,
      summary: summary!,
    });

    if (!disputeResult.ok) {
      setSubmitError(disputeResult.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: '/disputes/status',
      params: {
        dareId: disputeResult.data.dareId,
        juryCaseId: disputeResult.data.juryCaseId,
      },
    });
  }
}

function isResultClaimOutcome(value: unknown): value is ResultClaimOutcome {
  return (
    value === 'challenger_won' ||
    value === 'dispute' ||
    value === 'issuer_won' ||
    value === 'performer_completed' ||
    value === 'void'
  );
}
