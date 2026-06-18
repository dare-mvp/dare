'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';

const REFERRAL_CODE_RE = /^[A-Z0-9]{8}$/;
const VALID_STATUSES = new Set(['approved', 'paid', 'rejected']);

export async function updateLegendClaimStatus(
  referralCode: string,
  status: 'approved' | 'paid' | 'rejected',
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  if (!REFERRAL_CODE_RE.test(referralCode)) return { error: 'invalid_code' };
  if (!VALID_STATUSES.has(status)) return { error: 'invalid_status' };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin.from('legend_claim_reviews').upsert(
    {
      referral_code: referralCode,
      status,
      reviewed_at: now,
      paid_at: status === 'paid' ? now : null,
    },
    { onConflict: 'referral_code' },
  );

  if (error) return { error: 'db_error' };
  return { ok: true };
}
