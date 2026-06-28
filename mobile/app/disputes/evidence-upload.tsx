import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UploadCloud } from 'lucide-react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { EvidenceCaptureCamera } from '../../src/features/evidence/components/EvidenceCaptureCamera';
import { EvidenceGuidancePanel } from '../../src/features/evidence/components/EvidenceGuidancePanel';
import { EvidenceDraftFile, EvidenceUploader } from '../../src/features/evidence/components/EvidenceUploader';
import { getEvidenceFailureMessage, isResultClaimOutcome, shortEvidenceId, type EvidenceUploadStatus } from '../../src/features/evidence/evidenceGuidance';
import {
  formatEvidenceSize,
  pickEvidenceDocument,
  pickEvidenceFromLibrary,
  SelectedEvidenceFile,
  uploadSelectedEvidence,
} from '../../src/features/evidence/uploadEvidence';
import { DisputeFlowFrame } from '../../src/features/disputes/components/DisputeFlowFrame';
import { useActiveCourtSession } from '../../src/features/court/useActiveCourtSession';
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
  const court = useActiveCourtSession(dareId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pickNotice, setPickNotice] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedEvidenceFile | null>(null);
  const [showCaptureCamera, setShowCaptureCamera] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<EvidenceUploadStatus>('ready');
  const [submittedEvidence, setSubmittedEvidence] = useState<SubmittedEvidence | null>(null);
  const files: EvidenceDraftFile[] = selectedFile
    ? [{
        id: selectedFile.uri,
        name: selectedFile.fileName,
        sizeLabel: formatEvidenceSize(selectedFile.byteSize),
        status: submitting && uploadStatus !== 'confirming' && uploadStatus !== 'uploaded' ? 'uploading' : uploadStatus,
      }]
    : [];
  const guidanceSession = isUuid(dareId) && court.session?.dareId === dareId ? court.session : null;
  const failureMessage = getEvidenceFailureMessage(uploadStatus);

  return (
    <DisputeFlowFrame
      eyebrow="Evidence"
      onBack={() => router.back()}
      title="Attach evidence."
      subtitle={isResultClaim ? 'Use clear files that prove the claimed result under the DARE rules.' : 'Use clear files that help a reviewer understand the dispute without seeing player identities.'}
    >
      <EvidenceGuidancePanel mimeType={selectedFile?.mimeType ?? null} session={guidanceSession} />
      {showCaptureCamera ? (
        <EvidenceCaptureCamera
          onCancel={() => setShowCaptureCamera(false)}
          onCaptured={(file) => {
            setSelectedFile(file);
            setUploadStatus('ready');
            setSubmittedEvidence(null);
            setPickNotice(null);
            setSubmitError(null);
            setShowCaptureCamera(false);
          }}
          onError={(message) => setSubmitError(message)}
        />
      ) : null}
      <EvidenceUploader
        files={files}
        onAddFile={() => void handlePickDocument()}
        onCamera={() => void handleCaptureEvidence()}
        onPickMedia={() => void handlePickMedia()}
        onRemoveFile={() => {
          setSelectedFile(null);
          setUploadStatus('ready');
          setSubmittedEvidence(null);
        }}
        onRetryFile={() => void handleSubmitEvidence()}
      />
      <InlineAlert
        tone="info"
        title="Evidence guardrails"
        message="Attach one PNG, JPEG, or MP4 up to 10 MB. Evidence stays private by default and should support the claim without unnecessary personal details."
      />
      {uploadStatus === 'confirming' ? (
        <InlineAlert
          tone="info"
          title="Confirming evidence"
          message="Storage upload finished. Waiting for server confirmation before this counts as submitted evidence."
        />
      ) : null}
      {submittedEvidence ? (
        <InlineAlert
          tone="success"
          title="Evidence confirmed"
          message={`Evidence ${shortEvidenceId(submittedEvidence.id)} is server-confirmed. Submit again to attach it to this ${isResultClaim ? 'result claim' : 'dispute'} if the final filing did not complete.`}
        />
      ) : null}
      {pickNotice ? (
        <InlineAlert
          tone="info"
          title="No evidence selected"
          message={pickNotice}
        />
      ) : null}
      {submitError ? (
        <InlineAlert
          tone="danger"
          title={isResultClaim ? 'Result evidence failed' : 'Dispute submission failed'}
          message={submitError}
        />
      ) : null}
      {failureMessage ? (
        <InlineAlert
          tone="warning"
          title="Retry upload"
          message={failureMessage}
        />
      ) : null}
      <ActionButton
        accessibilityLabel={isResultClaim ? 'Submit result evidence' : 'Submit dispute evidence'}
        disabled={submitting || !selectedFile}
        icon={<UploadCloud color={colors.text} size={18} />}
        label={submitting ? 'Submitting' : isResultClaim ? 'Submit result evidence' : 'Submit dispute evidence'}
        onPress={() => void handleSubmitEvidence()}
      />
    </DisputeFlowFrame>
  );

  async function handlePickMedia() {
    setSubmitError(null);
    setPickNotice(null);
    setUploadStatus('ready');
    setSubmittedEvidence(null);
    const result = await safePickEvidence(pickEvidenceFromLibrary);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    if ('file' in result) setSelectedFile(result.file);
    else setPickNotice('No file was attached. Choose a photo, video, or file before submitting evidence.');
  }

  async function handlePickDocument() {
    setSubmitError(null);
    setPickNotice(null);
    setUploadStatus('ready');
    setSubmittedEvidence(null);
    const result = await safePickEvidence(pickEvidenceDocument);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    if ('file' in result) setSelectedFile(result.file);
    else setPickNotice('No file was attached. Choose a PNG, JPEG, or MP4 before submitting evidence.');
  }

  async function handleCaptureEvidence() {
    setSubmitError(null);
    setPickNotice(null);
    setUploadStatus('ready');
    setSubmittedEvidence(null);
    setShowCaptureCamera(true);
  }

  async function handleSubmitEvidence() {
    if (!isUuid(dareId)) {
      setSubmitError('Missing DARE reference. Return to Court or the dispute form, then upload evidence again.');
      return;
    }

    if (!isResultClaim && (!summary || !reason)) {
      setSubmitError('Missing dispute details. Return to the dispute form, confirm the reason and summary, then upload again.');
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
    setPickNotice(null);
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

    if (!isUuid(uploadRequest.data.evidenceObjectId)) {
      setSubmitError('The server did not return a valid evidence reference. Retry the upload before filing.');
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

    setUploadStatus('confirming');
    const confirmResult = await confirmEvidenceUpload(dareIdValue, {
      evidenceObjectId: uploadRequest.data.evidenceObjectId,
    });

    if (!confirmResult.ok) {
      setSubmitError(confirmResult.error.message);
      setUploadStatus('failed');
      setSubmitting(false);
      return null;
    }

    if (!isUuid(confirmResult.data.evidenceObjectId)) {
      setSubmitError('Evidence confirmation did not include a valid reference. Upload again before filing.');
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

async function safePickEvidence(pick: () => ReturnType<typeof pickEvidenceFromLibrary>) {
  try {
    return await pick();
  } catch {
    return {
      message: 'Could not open the evidence picker. Retry, or choose a different source.',
      ok: false as const,
    };
  }
}
