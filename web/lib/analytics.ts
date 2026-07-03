type ChallengeEventMap = {
  challenge_waitlist_join: { is_duplicate: boolean; has_referrer: boolean };
  challenge_tier_selected: { tier: 'standard' | 'champion' | 'legend' };
  challenge_tier_confirmed: { tier: 'standard' | 'champion' | 'legend' };
  challenge_task_follow_click: Record<string, never>;
  challenge_task_share_click: { source: 'step1' | 'task_list'; method: 'native' | 'whatsapp' };
  challenge_referral_link_copied: { source: 'step1' | 'task_list' };
  challenge_claim_message_copied: Record<string, never>;
  challenge_task_dm_click: { tier: 'standard' | 'champion' | 'legend'; method?: 'instagram' | 'whatsapp' };
  challenge_task_whatsapp_channel_click: { tier: 'legend' };
};

type TalentEventMap = {
  talent_waitlist_join: { is_duplicate: boolean; has_referrer: boolean };
  talent_task_share_click: { source: 'step1'; method: 'native' | 'whatsapp' };
  talent_referral_link_copied: { source: 'step1' | 'task_list' };
  talent_ig_follow_click: Record<string, never>;
  talent_dare_share: { method: 'native' | 'whatsapp' };
  talent_ref_share: { method: 'native' | 'whatsapp' };
  talent_claim_dm_click: { referral_code: string };
};

type AppEventMap = ChallengeEventMap & TalentEventMap;
type AppEventName = keyof AppEventMap;

export function trackEvent<T extends AppEventName>(
  event: T,
  ...rest: AppEventMap[T] extends Record<string, never>
    ? []
    : [properties: AppEventMap[T]]
): void {
  if (typeof window === 'undefined') return;
  window.dataLayer ??= [];
  window.dataLayer.push({ event, ...(rest[0] ?? {}) });
}
