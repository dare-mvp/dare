'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';

const REFERRAL_CODE_RE = /^[A-Z0-9]{8}$/;
const VALID_TIERS    = new Set(['standard', 'champion', 'legend']);
const VALID_STATUSES = new Set(['approved', 'paid', 'rejected']);

export async function updateClaimStatus(
  referralCode: string,
  tier: 'standard' | 'champion' | 'legend',
  status: 'approved' | 'paid' | 'rejected',
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  if (!REFERRAL_CODE_RE.test(referralCode)) return { error: 'invalid_code' };
  if (!VALID_TIERS.has(tier))               return { error: 'invalid_tier' };
  if (!VALID_STATUSES.has(status))          return { error: 'invalid_status' };

  const admin = createAdminClient();
  const now   = new Date().toISOString();

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
