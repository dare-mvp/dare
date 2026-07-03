'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';

const REFERRAL_CODE_RE = /^[A-Z0-9]{8}$/;
const VALID_STATUSES = new Set(['approved', 'paid', 'rejected', 'pending']);

function isValidVideoUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

type ClaimStatus = 'approved' | 'paid' | 'rejected' | 'pending';

export async function submitTalentClaim(
  referralCode: string,
  challengerVideoUrl: string,
  responseVideoUrl: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const challengerUrl = challengerVideoUrl.trim();
  const responseUrl   = responseVideoUrl.trim();
  if (!REFERRAL_CODE_RE.test(referralCode)) return { error: 'invalid_code' };
  if (!isValidVideoUrl(challengerUrl)) return { error: 'invalid_challenger_url' };
  if (!isValidVideoUrl(responseUrl))   return { error: 'invalid_response_url' };

  const admin = createAdminClient();

  const { data: participant, error: participantError } = await admin
    .from('marketing_waitlist')
    .select('referral_code')
    .eq('referral_code', referralCode)
    .eq('source', 'talent')
    .maybeSingle();

  if (participantError) return { error: 'db_error' };
  if (!participant) return { error: 'not_found' };

  const { error } = await admin.from('talent_claim_reviews').insert({
    referral_code: referralCode,
    challenger_video_url: challengerUrl,
    response_video_url: responseUrl,
    status: 'pending',
  });

  if (error?.code === '23505') return { error: 'already_submitted' };
  if (error) return { error: 'db_error' };
  return { ok: true };
}

export async function updateTalentClaimStatus(
  referralCode: string,
  status: ClaimStatus,
  reviewerNotes?: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  if (!REFERRAL_CODE_RE.test(referralCode)) return { error: 'invalid_code' };
  if (!VALID_STATUSES.has(status)) return { error: 'invalid_status' };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await admin
    .from('talent_claim_reviews')
    .select('status')
    .eq('referral_code', referralCode)
    .maybeSingle();

  if (fetchError) return { error: 'db_error' };
  if (!existing) return { error: 'not_found' };

  if (status === 'paid' && existing.status !== 'approved') {
    return { error: 'invalid_transition' };
  }

  if (status === 'approved') {
    const { data: progress, error: progressError } = await admin
      .from('talent_challenge_progress')
      .select('ref_task_complete')
      .eq('referral_code', referralCode)
      .maybeSingle();
    if (progressError) return { error: 'db_error' };
    if (!progress?.ref_task_complete) return { error: 'task_incomplete' };
  }

  const update: Record<string, unknown> = {
    status,
    reviewed_at: now,
    paid_at: status === 'paid' ? now : null,
  };
  if (reviewerNotes !== undefined) {
    update.reviewer_notes = reviewerNotes.trim() || null;
  }

  const { error } = await admin
    .from('talent_claim_reviews')
    .update(update)
    .eq('referral_code', referralCode);

  if (error) return { error: 'db_error' };
  return { ok: true };
}
