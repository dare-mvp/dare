import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildLegendWelcomePayload } from '@/lib/email';
import { LEGEND_START } from '@/lib/challenge-config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://daregamesapp.com';
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

  // Don't fire before Legend opens — cron runs daily but is gated here.
  if (new Date() < LEGEND_START) {
    return Response.json({ skipped: 'legend_not_open_yet' });
  }

  const admin = createAdminClient();

  // get_legend_eligible_unsent excludes:
  //   - users whose legend_email_sent_at is already set (batch-sent)
  //   - users who have a 'legend' tier row (got email via UI flow in actions.ts)
  const { data: users, error } = await admin.rpc('get_legend_eligible_unsent');

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
    batch.map((u) => buildLegendWelcomePayload(u.email, buildReferralUrl(u.referral_code))),
  );

  if (sendError) {
    return Response.json({ error: 'send_error' }, { status: 500 });
  }

  // Mark as sent so tomorrow's run skips these users.
  const { error: markError } = await admin
    .from('marketing_waitlist')
    .update({ legend_email_sent_at: new Date().toISOString() })
    .in('referral_code', batch.map((u) => u.referral_code));

  if (markError) {
    return Response.json({ error: 'mark_sent_error' }, { status: 500 });
  }

  return Response.json({ sent: batch.length, total: users?.length ?? 0 });
}
