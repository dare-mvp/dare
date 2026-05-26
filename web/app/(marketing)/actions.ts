'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type WaitlistState = {
  ok?: boolean;
  error?: 'invalid_email' | 'invalid_phone' | 'duplicate' | 'unknown';
};

const ALLOWED_ROLES = new Set(['player', 'creator', 'community_lead', 'partner']);
const ALLOWED_COUNTRIES = new Set(['NG', 'KE', 'GH', 'ZA', 'TZ', 'UG', 'other']);

export async function joinWaitlist(
  _previousState: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const roleValue = String(formData.get('role') ?? '').trim();
  const countryValue = String(formData.get('country') ?? '').trim();
  const phoneValue = String(formData.get('phone') ?? '').trim();
  const role = ALLOWED_ROLES.has(roleValue) ? roleValue : null;
  const country = ALLOWED_COUNTRIES.has(countryValue) ? countryValue : null;
  const phone = phoneValue.replace(/[^\d+]/g, '') || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'invalid_email' };
  }

  if (phone && !/^\+?\d{7,15}$/.test(phone)) {
    return { error: 'invalid_phone' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('marketing_waitlist')
    .insert({ email, role, country, phone });

  if (error?.code === '23505') return { error: 'duplicate' };
  if (error) return { error: 'unknown' };

  return { ok: true };
}
