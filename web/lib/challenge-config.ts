// Single source of truth for the I Dare You challenge rules.
// All times are expressed in West Africa Time (UTC+1) to match the Nigeria target market.

export const CHALLENGE_CAP = 1000;

// Set to false to hide Standard tier from the UI and block server-side selection.
// The tier remains in the database — existing Standard completers keep their status.
export const STANDARD_TIER_ACTIVE = false;

// May 28 2026 00:00 WAT
export const CHALLENGE_START = new Date('2026-05-28T00:00:00+01:00');
export const CHALLENGE_START_LABEL = 'May 28, 2026';

// September 20 2026 23:59 WAT — reopened and extended to close alongside the
// Show Me Your Talent challenge (see talent-challenge-config.ts). Standard is
// deactivated (STANDARD_TIER_ACTIVE = false above), so only Champion and
// Legend are live participants of this extension.
export const CHALLENGE_END = new Date('2026-09-20T23:59:59+01:00');
export const CHALLENGE_END_LABEL = 'September 20, 2026';

// June 15 2026 00:00 WAT — Legend Dare unlocks (requires Standard or Champion completion)
export const LEGEND_START = new Date('2026-06-15T00:00:00+01:00');
export const LEGEND_START_LABEL = 'June 15, 2026';

// September 20 2026 23:59 WAT — Legend Dare closes, aligned with CHALLENGE_END above
export const LEGEND_END = new Date('2026-09-20T23:59:59+01:00');
export const LEGEND_END_LABEL = 'September 20, 2026';

export function getChallengeStatus(participantCount: number, now = new Date()) {
  const isFull    = participantCount >= CHALLENGE_CAP;
  const isExpired = now > CHALLENGE_END;
  const isPending = now < CHALLENGE_START;
  const isOpen    = !isFull && !isExpired && !isPending;

  const spotsRemaining = Math.max(0, CHALLENGE_CAP - participantCount);
  const spotsTaken     = Math.min(participantCount, CHALLENGE_CAP);

  return { isFull, isExpired, isPending, isOpen, spotsRemaining, spotsTaken };
}
