import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendChallengeReminderEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: participants, error } = await admin
    .from('marketing_waitlist')
    .select('email, referral_code')
    .eq('source', 'challenge')
    .not('referral_code', 'is', null);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
  }

  if (!participants || participants.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.daregamesapp.com').replace(/\/$/, '');

  const results = await Promise.allSettled(
    participants.map(({ email, referral_code }) => {
      const referralUrl = `${siteUrl}/challenge?ref=${referral_code}`;
      return sendChallengeReminderEmail(email, referralUrl);
    }),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;

  return NextResponse.json({ sent, total: participants.length });
}
