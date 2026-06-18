'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';

const REFERRAL_CODE_RE = /^[A-Z0-9]{8}$/;
const VALID_TIERS    = new Set(['standard', 'champion', 'legend']);
const VALID_STATUSES = new Set(['approved', 'paid', 'rejected']);

type Tier = 'standard' | 'champion' | 'legend';
type ClaimStatus = 'approved' | 'paid' | 'rejected';

type ProgressRow = {
  claim_status: string;
  task_a_complete?: boolean;
  task_ref_complete?: boolean;
};

function getProgressView(tier: Tier) {
  if (tier === 'standard') return 'standard_referral_progress';
  if (tier === 'champion') return 'champion_referral_progress';
  return 'legend_referral_progress';
}

function getProgressSelect(tier: Tier) {
  return tier === 'legend' ? 'claim_status, task_a_complete' : 'claim_status, task_ref_complete';
}

function isTaskComplete(tier: Tier, row: ProgressRow) {
  return tier === 'legend' ? row.task_a_complete === true : row.task_ref_complete === true;
}

export async function updateClaimStatus(
  referralCode: string,
  tier: Tier,
  status: ClaimStatus,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  if (!REFERRAL_CODE_RE.test(referralCode)) return { error: 'invalid_code' };
  if (!VALID_TIERS.has(tier))               return { error: 'invalid_tier' };
  if (!VALID_STATUSES.has(status))          return { error: 'invalid_status' };

  const admin = createAdminClient();
  const now   = new Date().toISOString();
  const { data: progress, error: progressError } = await admin
    .from(getProgressView(tier))
    .select(getProgressSelect(tier))
    .eq('referral_code', referralCode)
    .maybeSingle();

  if (progressError) return { error: 'db_error' };
  if (!progress) return { error: 'tier_not_selected' };

  if ((status === 'approved' || status === 'paid') && !isTaskComplete(tier, progress)) {
    return { error: 'task_incomplete' };
  }

  if (status === 'paid' && progress.claim_status !== 'approved') {
    return { error: 'invalid_transition' };
  }

  const { error } = await admin.from('challenge_claim_reviews').upsert(
    {
      referral_code: referralCode,
      tier,
      status,
      reviewed_at: now,
      paid_at: status === 'paid' ? now : null,
    },
    { onConflict: 'referral_code,tier' },
  );

  if (error) return { error: 'db_error' };
  return { ok: true };
}
