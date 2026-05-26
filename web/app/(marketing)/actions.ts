'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type WaitlistState = {
  ok?: boolean;
  error?: 'invalid_email' | 'duplicate' | 'unknown';
};

export async function joinWaitlist(
  _previousState: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const role = String(formData.get('role') ?? '').trim() || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'invalid_email' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('marketing_waitlist').insert({ email, role });

  if (error?.code === '23505') return { error: 'duplicate' };
  if (error) return { error: 'unknown' };

  return { ok: true };
}
