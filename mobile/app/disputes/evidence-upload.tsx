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

type UploadStatus = 'failed' | 'ready' | 'uploaded' | 'uploading';
type SubmittedEvidence = {
  id: string;
  juryCaseId: string | null;
  side: 'A' | 'B';
};

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
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('ready');
  const [submittedEvidence, setSubmittedEvidence] = useState<SubmittedEvidence | null>(null);
  const files: EvidenceDraftFile[] = selectedFile
    ? [{
        id: selectedFile.uri,
        name: selectedFile.fileName,
        sizeLabel: formatEvidenceSize(selectedFile.byteSize),
        status: submitting ? 'uploading' : uploadStatus,
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
        onRemoveFile={() => {
          setSelectedFile(null);
          setUploadStatus('ready');
          setSubmittedEvidence(null);
        }}
        onRetryFile={() => {
          void handleSubmitEvidence();
        }}
      />
      <InlineAlert
        tone="info"
        title="Evidence guardrails"
        message="Attach one PNG, JPEG, or MP4 up to 10 MB. Evidence should support the claim without unnecessary personal details."
      />
      {submittedEvidence ? (
        <InlineAlert
          tone="success"
          title="Evidence uploaded"
          message={`Submitted evidence ${shortId(submittedEvidence.id)} is attached to this ${isResultClaim ? 'result claim' : 'dispute'}.`}
        />
      ) : null}
      {submitError ? (
        <InlineAlert
          tone="danger"
          title={isResultClaim ? 'Result evidence failed' : 'Dispute submission failed'}
          message={submitError}
        />
      ) : null}
      <ActionButton
        accessibilityLabel={isResultClaim ? 'Submit result evidence' : 'Submit dispute evidence'}
        disabled={submitting || !selectedFile}
        icon={<UploadCloud color={colors.text} size={18} />}
        label={submitting ? 'Submitting' : isResultClaim ? 'Submit result evidence' : 'Submit dispute evidence'}
        onPress={() => {
          void handleSubmitEvidence();
        }}
      />
    </DisputeFlowFrame>
  );

  async function handlePickMedia() {
    setSubmitError(null);
    setUploadStatus('ready');
    setSubmittedEvidence(null);
    const result = await pickEvidenceFromLibrary();
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    if ('file' in result) setSelectedFile(result.file);
  }

  async function handlePickDocument() {
    setSubmitError(null);
    setUploadStatus('ready');
    setSubmittedEvidence(null);
    const result = await pickEvidenceDocument();
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    if ('file' in result) setSelectedFile(result.file);
  }

  async function handleCaptureEvidence() {
    setSubmitError(null);
    setUploadStatus('ready');
    setSubmittedEvidence(null);
    const result = await captureEvidenceWithCamera();
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    if ('file' in result) setSelectedFile(result.file);
  }

  async function handleSubmitEvidence() {
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
    setUploadStatus(submittedEvidence ? 'uploaded' : 'uploading');

    const evidence = submittedEvidence ?? await uploadAndConfirmEvidence(dareId, selectedFile);
    if (!evidence) return;

    if (isResultClaim) {
      const claimResult = await submitResultClaim(dareId, {
        claimedOutcome: resultClaimOutcome!,
        evidenceObjectIds: [evidence.id],
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
          evidenceCount: '1',
          evidenceObjectId: evidence.id,
          juryCaseId: evidence.juryCaseId ?? undefined,
          status: claimResult.data.dareStatus,
          winnerId: claimResult.data.agreedWinnerId ?? undefined,
        },
      });
      return;
    }

    const disputeResult = await fileDispute(dareId, {
      evidenceObjectIds: [evidence.id],
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
        evidenceObjectId: evidence.id,
        evidenceSide: evidence.side,
        juryCaseId: disputeResult.data.juryCaseId,
      },
    });
  }

  async function uploadAndConfirmEvidence(dareIdValue: string, file: SelectedEvidenceFile): Promise<SubmittedEvidence | null> {
    const uploadRequest = await requestEvidenceUpload(dareIdValue, {
      fileName: file.fileName,
      fileSizeBytes: file.byteSize,
      mimeType: file.mimeType,
    });

    if (!uploadRequest.ok) {
      setSubmitError(uploadRequest.error.message);
      setUploadStatus('failed');
      setSubmitting(false);
      return null;
    }

    const uploadResult = await uploadSelectedEvidence(uploadRequest.data, file);
    if (!uploadResult.ok) {
      setSubmitError(uploadResult.message);
      setUploadStatus('failed');
      setSubmitting(false);
      return null;
    }

    const confirmResult = await confirmEvidenceUpload(dareIdValue, {
      evidenceObjectId: uploadRequest.data.evidenceObjectId,
    });

    if (!confirmResult.ok) {
      setSubmitError(confirmResult.error.message);
      setUploadStatus('failed');
      setSubmitting(false);
      return null;
    }

    const evidence = {
      id: confirmResult.data.evidenceObjectId,
      juryCaseId: confirmResult.data.juryCaseId,
      side: confirmResult.data.side,
    };
    setSubmittedEvidence(evidence);
    setUploadStatus('uploaded');
    return evidence;
  }
}

function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
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
