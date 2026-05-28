// Single source of truth for the I Dare You challenge rules.
// All times are expressed in West Africa Time (UTC+1) to match the Nigeria target market.

export const CHALLENGE_CAP = 300;

// May 28 2026 00:00 WAT
export const CHALLENGE_START = new Date('2026-05-28T00:00:00+01:00');

// June 15 2026 23:59 WAT
export const CHALLENGE_END = new Date('2026-06-15T23:59:59+01:00');

export function getChallengeStatus(participantCount: number, now = new Date()) {
  const isFull    = participantCount >= CHALLENGE_CAP;
  const isExpired = now > CHALLENGE_END;
  const isPending = now < CHALLENGE_START;
  const isOpen    = !isFull && !isExpired && !isPending;

  const spotsRemaining = Math.max(0, CHALLENGE_CAP - participantCount);
  const spotsTaken     = Math.min(participantCount, CHALLENGE_CAP);

  return { isFull, isExpired, isPending, isOpen, spotsRemaining, spotsTaken };
}

// Human-readable date label for display, formatted for a Nigerian audience
export const CHALLENGE_END_LABEL = 'June 15, 2026';
export const CHALLENGE_START_LABEL = 'May 28, 2026';
