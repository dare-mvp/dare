import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildTalentReminderPayload } from '@/lib/email';
import { TALENT_CHALLENGE_START, TALENT_CHALLENGE_END } from '@/lib/talent-challenge-config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.daregamesapp.com';
const DAILY_CAP = 50;

function buildReferralUrl(code: string) {
  return `${SITE_URL}/talent?ref=${code}`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Campaign runs July 20 – September 20. Outside that window there is
  // nothing to remind anyone about — no-op instead of erroring so the daily
  // cron can stay wired up for the whole run without extra maintenance.
  const now = new Date();
  if (now < TALENT_CHALLENGE_START || now > TALENT_CHALLENGE_END) {
    return Response.json({ sent: 0, total: 0, reason: 'outside_campaign_window' });
  }

  const admin = createAdminClient();

  // Joined 3+ days ago, never submitted a claim, never reminded before.
  const { data: users, error } = await admin.rpc('get_talent_reminder_eligible');

  if (error) {
    return Response.json({ error: 'db_error' }, { status: 500 });
  }

  const batch = (users as { email: string; referral_code: string }[] | null)
    ?.slice(0, DAILY_CAP) ?? [];

  if (batch.length === 0) {
    return Response.json({ sent: 0, total: 0 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: sendError } = await resend.batch.send(
    batch.map((u) => buildTalentReminderPayload(u.email, buildReferralUrl(u.referral_code))),
  );

  if (sendError) {
    return Response.json({ error: 'send_error' }, { status: 500 });
  }

  // Mark as sent — this is a one-time nudge, not a repeating reminder.
  const { error: markError } = await admin
    .from('marketing_waitlist')
    .update({ talent_reminder_sent_at: new Date().toISOString() })
    .in('referral_code', batch.map((u) => u.referral_code));

  if (markError) {
    return Response.json({ error: 'mark_sent_error' }, { status: 500 });
  }

  return Response.json({ sent: batch.length, total: users?.length ?? 0 });
}
