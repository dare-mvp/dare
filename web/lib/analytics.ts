type ChallengeEventMap = {
  challenge_waitlist_join: { is_duplicate: boolean; has_referrer: boolean };
  challenge_tier_selected: { tier: 'standard' | 'champion' | 'legend' };
  challenge_tier_confirmed: { tier: 'standard' | 'champion' | 'legend' };
  challenge_task_follow_click: Record<string, never>;
  challenge_task_share_click: { source: 'step1' | 'task_list'; method: 'native' | 'whatsapp' };
  challenge_referral_link_copied: { source: 'step1' | 'task_list' };
  challenge_claim_message_copied: Record<string, never>;
  challenge_task_dm_click: { tier: 'standard' | 'champion' | 'legend' };
};

type ChallengeEventName = keyof ChallengeEventMap;

export function trackEvent<T extends ChallengeEventName>(
  event: T,
  ...rest: ChallengeEventMap[T] extends Record<string, never>
    ? []
    : [properties: ChallengeEventMap[T]]
): void {
  if (typeof window === 'undefined') return;
  window.dataLayer ??= [];
  window.dataLayer.push({ event, ...(rest[0] ?? {}) });
}
