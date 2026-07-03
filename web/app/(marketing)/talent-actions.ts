'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  TALENT_CHALLENGE_CAP,
  TALENT_CHALLENGE_START,
  TALENT_CHALLENGE_END,
} from '@/lib/talent-challenge-config';
import { sendTalentWelcomeEmail } from '@/lib/email';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

export type TalentJoinState = {
  ok?: boolean;
  isDuplicate?: boolean;
  referralCode?: string;
  referralUrl?: string;
  error?:
    | 'invalid_email'
    | 'invalid_referral'
    | 'rate_limited'
    | 'challenge_closed'
    | 'challenge_full'
    | 'unknown';
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERRAL_CODE_RE = /^[A-Z0-9]{8}$/;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

type RateLimitBucket = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function generateReferralCode(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

function normalizeReferralCode(value: FormDataEntryValue | null) {
  const code = String(value ?? '').trim().toUpperCase();
  if (!code) return null;
  return REFERRAL_CODE_RE.test(code) ? code : undefined;
}

function hashIdentifier(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

async function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (configured) {
    try { return new URL(configured).origin; } catch { /* fall through */ }
  }
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  if (!host) return 'https://daregamesapp.com';
  const protocol = headerStore.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

async function buildReferralUrl(referralCode: string) {
  const url = new URL('/talent', await getSiteOrigin());
  url.searchParams.set('ref', referralCode);
  return url.toString();
}

async function getClientIp() {
  const headerStore = await headers();
  return headerStore.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headerStore.get('x-real-ip')
    ?? 'unknown';
}

async function consumeDatabaseRateLimit(
  admin: ReturnType<typeof createAdminClient>,
  scope: string,
  identifier: string,
) {
  const { data, error } = await admin.rpc('consume_marketing_waitlist_rate_limit', {
    p_identifier_hash: hashIdentifier(identifier),
    p_limit: RATE_LIMIT_MAX,
    p_scope: scope,
    p_window_seconds: Math.floor(RATE_LIMIT_WINDOW_MS / 1000),
  });
  if (error) return null;
  const result = Array.isArray(data) ? data[0] : null;
  return result?.allowed === true;
}

function consumeMemoryBucket(key: string, now: number) {
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

async function isRateLimited(email: string, admin: ReturnType<typeof createAdminClient>) {
  const now = Date.now();
  const clientIp = await getClientIp();
  const [ipAllowed, emailAllowed] = await Promise.all([
    consumeDatabaseRateLimit(admin, 'talent_waitlist_ip', clientIp),
    consumeDatabaseRateLimit(admin, 'talent_waitlist_email', email),
  ]);
  if (ipAllowed !== null && emailAllowed !== null) return !ipAllowed || !emailAllowed;
  return consumeMemoryBucket(`ip:${clientIp}`, now) || consumeMemoryBucket(`email:${email}`, now);
}

async function successState(referralCode: string, isDuplicate = false): Promise<TalentJoinState> {
  return {
    ok: true,
    isDuplicate,
    referralCode,
    referralUrl: await buildReferralUrl(referralCode),
  };
}

export async function joinTalentWaitlist(
  _previousState: TalentJoinState,
  formData: FormData,
): Promise<TalentJoinState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  let referredBy = normalizeReferralCode(formData.get('referred_by'));

  if (!EMAIL_RE.test(email)) return { error: 'invalid_email' };
  if (referredBy === undefined) return { error: 'invalid_referral' };

  const now = new Date();
  if (now < TALENT_CHALLENGE_START || now > TALENT_CHALLENGE_END) {
    return { error: 'challenge_closed' };
  }

  const admin = createAdminClient();

  const { count: participantCount, error: countError } = await admin
    .from('marketing_waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'talent');

  if (countError) return { error: 'unknown' };
  if ((participantCount ?? 0) >= TALENT_CHALLENGE_CAP) return { error: 'challenge_full' };

  if (await isRateLimited(email, admin)) return { error: 'rate_limited' };

  // Nullify self-referrals
  if (referredBy) {
    const { data: referrer } = await admin
      .from('marketing_waitlist')
      .select('email')
      .eq('referral_code', referredBy)
      .maybeSingle();
    if (referrer?.email === email) referredBy = null;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();

    const { error: insertError } = await admin
      .from('marketing_waitlist')
      .insert({ email, source: 'talent', referred_by: referredBy, referral_code: code });

    if (!insertError) {
      const state = await successState(code);
      sendTalentWelcomeEmail(email, state.referralUrl!);
      return state;
    }
    if (insertError.code !== '23505') return { error: 'unknown' };

    const { data: existing, error: selectError } = await admin
      .from('marketing_waitlist')
      .select('referral_code')
      .eq('email', email)
      .eq('source', 'talent')
      .maybeSingle();

    if (selectError) return { error: 'unknown' };
    if (existing?.referral_code) return successState(existing.referral_code, true);
    if (!existing) continue;

    const { data: updated, error: updateError } = await admin
      .from('marketing_waitlist')
      .update({ referral_code: code, source: 'talent' })
      .eq('email', email)
      .is('referral_code', null)
      .select('referral_code')
      .single();

    if (!updateError && updated.referral_code) return successState(updated.referral_code, true);
    if (updateError?.code === '23505') continue;
    return { error: 'unknown' };
  }

  return { error: 'unknown' };
}
