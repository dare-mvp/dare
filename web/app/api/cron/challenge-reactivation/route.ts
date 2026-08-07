import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildChallengeReactivationPayload } from '@/lib/email';

// One-time "Champion & Legend are back" reactivation send to everyone who
// joined the I Dare You waitlist while the challenge was closed.
//
// Capped at 50/day and idempotent via challenge_reactivation_sent_at, same
// pattern as challenge-reminder and talent-reminder — running once daily lets
// Resend's daily volume cap reset between runs instead of blowing through it
// in one request (this replaced an earlier /api/admin/... route that tried
// to send all ~421 in one shot and hit the cap after 200).
// Once everyone is covered this becomes a permanent no-op, same as the
// siblings above.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.daregamesapp.com';
const DAILY_CAP = 50;

function buildReferralUrl(code: string) {
  return `${SITE_URL}/challenge?ref=${code}`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('marketing_waitlist')
    .select('email, referral_code')
    .eq('source', 'challenge')
    .not('email', 'is', null)
    .not('referral_code', 'is', null)
    .is('challenge_reactivation_sent_at', null);

  if (error) {
    return Response.json({ error: 'db_error' }, { status: 500 });
  }

  const batch = (rows as { email: string; referral_code: string }[] | null)
    ?.slice(0, DAILY_CAP) ?? [];

  if (batch.length === 0) {
    return Response.json({ sent: 0, total: 0 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: sendError } = await resend.batch.send(
    batch.map((u) => buildChallengeReactivationPayload(u.email, buildReferralUrl(u.referral_code))),
  );

  if (sendError) {
    return Response.json({ error: 'send_error', detail: { name: sendError.name, message: sendError.message } }, { status: 500 });
  }

  const { error: markError } = await admin
    .from('marketing_waitlist')
    .update({ challenge_reactivation_sent_at: new Date().toISOString() })
    .in('referral_code', batch.map((u) => u.referral_code));

  if (markError) {
    return Response.json({ error: 'mark_sent_error', detail: markError.message }, { status: 500 });
  }

  return Response.json({ sent: batch.length, total: rows?.length ?? 0 });
}
