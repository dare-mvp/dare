import { CourtSession } from './types';

export function getResolutionDisabledReason(session: CourtSession) {
  if (session.phase === 'active') return undefined;
  if (session.resolutionType !== 'answer_key' && session.phase === 'awaiting_result') return undefined;
  if (session.phase === 'awaiting_result') return 'Answer submission is closed while the Court waits for result confirmation.';
  if (session.phase === 'disputed') return 'Result controls are paused because this DARE is in dispute review.';
  if (session.phase === 'settlement_pending') return 'Result controls are closed because the DARE is waiting for settlement.';
  if (session.phase === 'settled') return 'Result controls are closed because this DARE is settled.';
  return 'Court controls open when live play starts.';
}

export function getCourtStatusTone(status: CourtSession['status']) {
  if (status === 'settled' || status === 'completed') return 'success';
  if (status === 'forfeited') return 'danger';
  return 'warning';
}

export function getCourtStatusTitle(status: CourtSession['status']) {
  if (status === 'dispute_pending') return 'Dispute pending';
  if (status === 'jury_open') return 'Jury review open';
  if (status === 'settlement_pending' || status === 'completed') return 'Settlement pending';
  if (status === 'settled') return 'DARE settled';
  if (status === 'awaiting_result') return 'Awaiting result claims';
  return 'Court status changed';
}

export function getCourtStatusMessage(session: CourtSession) {
  if (session.status === 'dispute_pending') {
    return session.juryCase
      ? `Evidence is attached to jury case ${session.juryCase.id}. Settlement is paused.`
      : 'A dispute has been opened. Settlement is paused while the review packet is prepared.';
  }
  if (session.status === 'jury_open') {
    return session.juryCase
      ? `Jurors are reviewing ${session.juryCase.evidenceCount} evidence file${session.juryCase.evidenceCount === 1 ? '' : 's'}.`
      : 'Jurors are reviewing the evidence packet.';
  }
  if (session.status === 'settled') return 'This DARE has finished settlement.';
  if (session.status === 'settlement_pending' || session.status === 'completed') {
    return 'The result is recorded. Payout and trust updates wait for settlement.';
  }
  if (session.status === 'awaiting_result') return 'Participant result claims are being collected.';
  return 'Use the status panel below for the latest Court state.';
}
