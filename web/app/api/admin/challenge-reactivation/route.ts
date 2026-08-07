import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildChallengeReactivationPayload } from '@/lib/email';

// One-time "Champion & Legend are back" reactivation send to everyone who
// joined the I Dare You waitlist while the challenge was closed.
//
// This is NOT a recurring cron and is intentionally not listed in vercel.json
// — it is triggered manually, once, by hitting this route with ?confirm=true.
//
// Safety:
//   - Without ?confirm=true this is a dry run: it reports who WOULD be
//     emailed and sends nothing.
//   - Idempotent: only targets rows where challenge_reactivation_sent_at is
//     null, and marks each batch sent immediately after it succeeds — so a
//     second accidental run (or a retry after a partial failure) never
//     double-emails anyone.
//   - Batched at 100 per Resend batch.send call (Resend's per-request cap).

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.daregamesapp.com';
const BATCH_SIZE = 100;

function buildReferralUrl(code: string) {
  return `${SITE_URL}/challenge?ref=${code}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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

  const eligible = (rows as { email: string; referral_code: string }[] | null) ?? [];
  const confirm = request.nextUrl.searchParams.get('confirm') === 'true';

  if (!confirm) {
    return Response.json({
      dryRun: true,
      wouldSend: eligible.length,
      sample: eligible.slice(0, 5).map((u) => u.email),
      note: 'Nothing was sent. Re-run with ?confirm=true to actually send.',
    });
  }

  if (eligible.length === 0) {
    return Response.json({ sent: 0, total: 0 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const batches = chunk(eligible, BATCH_SIZE);

  let sent = 0;
  for (const batch of batches) {
    const { error: sendError } = await resend.batch.send(
      batch.map((u) => buildChallengeReactivationPayload(u.email, buildReferralUrl(u.referral_code))),
    );

    if (sendError) {
      // Stop here — earlier batches are already marked sent below, so a
      // re-run with ?confirm=true only retries what's left.
      return Response.json({ error: 'send_error', sentBeforeFailure: sent, totalEligible: eligible.length }, { status: 500 });
    }

    const { error: markError } = await admin
      .from('marketing_waitlist')
      .update({ challenge_reactivation_sent_at: new Date().toISOString() })
      .in('referral_code', batch.map((u) => u.referral_code));

    if (markError) {
      return Response.json({ error: 'mark_sent_error', sentBeforeFailure: sent, totalEligible: eligible.length }, { status: 500 });
    }

    sent += batch.length;
  }

  return Response.json({ sent, total: eligible.length, batches: batches.length });
}
