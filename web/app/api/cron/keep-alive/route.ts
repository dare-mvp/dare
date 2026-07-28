import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Supabase free-tier projects auto-pause after 7 days with no activity.
// This is a stopgap, not a substitute for Pro — DARE holds real wallet/escrow
// balances and KYC data, so the project should move to a paid plan before
// launch. Runs well inside the 7-day window so the project never goes quiet.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('marketing_waitlist').select('referral_code').limit(1);

  if (error) {
    return Response.json({ error: 'db_error' }, { status: 500 });
  }

  return Response.json({ ok: true, checkedAt: new Date().toISOString() });
}
