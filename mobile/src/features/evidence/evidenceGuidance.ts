import type { ResultClaimOutcome } from '../../lib/actions/endpoints';
import type { CourtSession } from '../court/types';

export type EvidenceUploadStatus = 'failed' | 'ready' | 'confirming' | 'uploaded' | 'uploading';

export type EvidenceGuidance = {
  bullets: string[];
  title: string;
};

export function getEvidenceGuidance(mimeType?: string | null): EvidenceGuidance {
  if (mimeType === 'video/mp4') {
    return {
      bullets: [
        'Show the task clearly.',
        'Keep the full attempt in frame.',
        'Record until the timer or required result is visible.',
        'Do not upload edited proof.',
        'Make sure audio is clear when speech matters.',
      ],
      title: 'Video proof checklist',
    };
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    return {
      bullets: [
        'Capture the required result clearly.',
        'Avoid cropped, dark, or blurry proof.',
        'Include before and after details if the constitution asks for them.',
        'Do not include unnecessary personal details.',
      ],
      title: 'Image proof checklist',
    };
  }

  return {
    bullets: [
      'Confirm the proof format required by this DARE before uploading.',
      'Start before the attempt when using screen recording.',
      'Keep the relevant app, page, or result visible.',
      'Do not cut the recording before the required result appears.',
      'If the format is unclear, return to Court and review the constitution before submitting.',
    ],
    title: mimeType ? 'Unsupported proof format' : 'Proof format needed',
  };
}

export function getEvidenceRequirementSummary(session: CourtSession | null) {
  if (!session) return 'Proof requirements load from the DARE constitution when the Court state is available.';

  if (session.resolutionType === 'evidence') {
    return `${session.title}: submit proof that matches the evidence rules before a result or dispute can be reviewed.`;
  }

  if (session.resolutionType === 'witnessed') {
    return `${session.title}: evidence should support what witnesses saw and must not replace required live presence.`;
  }

  return `${session.title}: evidence should support the committed answer-key result without exposing private answer keys.`;
}

export function getEvidenceStatusLabel(status: EvidenceUploadStatus) {
  if (status === 'confirming') return 'confirming';
  if (status === 'failed') return 'retry needed';
  if (status === 'uploaded') return 'confirmed';
  if (status === 'uploading') return 'uploading';
  return 'selected';
}

export function getEvidenceFailureMessage(status: EvidenceUploadStatus) {
  if (status !== 'failed') return null;
  return 'The selected file is still available. Retry when your connection is stable; it is not submitted until server confirmation succeeds.';
}

export function isResultClaimOutcome(value: unknown): value is ResultClaimOutcome {
  return (
    value === 'challenger_won' ||
    value === 'dispute' ||
    value === 'issuer_won' ||
    value === 'performer_completed' ||
    value === 'void'
  );
}

export function shortEvidenceId(value: string) {
  if (!value.trim()) return 'pending';
  return value.length > 8 ? value.slice(0, 8) : value;
}
