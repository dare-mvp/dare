// Single source of truth for the Show Me Your Talent Dare Challenge.
// All times are expressed in West Africa Time (UTC+1).

export const TALENT_CHALLENGE_CAP = 500;
export const TALENT_CHALLENGE_REWARD = 5000; // NGN
export const TALENT_REFERRAL_MIN = 3;

// July 20 2026 00:00 WAT
export const TALENT_CHALLENGE_START = new Date('2026-07-20T00:00:00+01:00');
export const TALENT_CHALLENGE_START_LABEL = 'July 20, 2026';

// September 20 2026 23:59 WAT
export const TALENT_CHALLENGE_END = new Date('2026-09-20T23:59:59+01:00');
export const TALENT_CHALLENGE_END_LABEL = 'September 20, 2026';

export function getTalentChallengeStatus(participantCount: number, now = new Date()) {
  const isFull    = participantCount >= TALENT_CHALLENGE_CAP;
  const isExpired = now > TALENT_CHALLENGE_END;
  const isPending = now < TALENT_CHALLENGE_START;
  const isOpen    = !isFull && !isExpired && !isPending;

  const spotsRemaining = Math.max(0, TALENT_CHALLENGE_CAP - participantCount);
  const spotsTaken     = Math.min(participantCount, TALENT_CHALLENGE_CAP);

  return { isFull, isExpired, isPending, isOpen, spotsRemaining, spotsTaken };
}
