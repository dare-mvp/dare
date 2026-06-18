import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildLegendClosingSoonPayload } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dareapp.io';
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

  // Only Standard/Champion completers are eligible for Legend — don't send to
  // users who never finished a prior tier. Runs July 12, 13, 14 at 50/day.
  const { data: users, error } = await admin.rpc('get_legend_closing_eligible');

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
    batch.map((u) => buildLegendClosingSoonPayload(u.email, buildReferralUrl(u.referral_code))),
  );

  if (sendError) {
    return Response.json({ error: 'send_error' }, { status: 500 });
  }

  // Mark as sent so the next day's run moves on to the next 50.
  const { error: markError } = await admin
    .from('marketing_waitlist')
    .update({ closing_email_sent_at: new Date().toISOString() })
    .in('referral_code', batch.map((u) => u.referral_code));

  if (markError) {
    return Response.json({ error: 'mark_sent_error' }, { status: 500 });
  }

  return Response.json({ sent: batch.length, total: users?.length ?? 0 });
}
