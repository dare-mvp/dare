'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  CHALLENGE_CAP,
  CHALLENGE_START,
  CHALLENGE_END,
} from '@/lib/challenge-config';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

export type WaitlistState = {
  ok?: boolean;
  error?: 'invalid_email' | 'invalid_phone' | 'duplicate' | 'unknown';
};

export type ChallengeJoinState = {
  ok?: boolean;
  isDuplicate?: boolean; // true when email already existed — show "already registered" UI
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

const ALLOWED_ROLES = new Set(['player', 'creator', 'community_lead', 'partner']);
const ALLOWED_COUNTRIES = new Set(['NG', 'KE', 'GH', 'ZA', 'TZ', 'UG', 'other']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERRAL_CODE_RE = /^[A-Z0-9]{8}$/;
const CHALLENGE_RATE_LIMIT_MAX = 5;
const CHALLENGE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const challengeRateLimitBuckets = new Map<string, RateLimitBucket>();

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

  if (!EMAIL_RE.test(email)) {
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

function generateReferralCode(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

function normalizeReferralCode(value: FormDataEntryValue | null) {
  const code = String(value ?? '').trim().toUpperCase();
  if (!code) return null;
  return REFERRAL_CODE_RE.test(code) ? code : undefined;
}

async function getRequestHeaders() {
  return headers();
}

async function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;

  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall back to request headers below.
    }
  }

  const headerStore = await getRequestHeaders();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');

  if (!host) return 'https://dareapp.io';

  const protocol = headerStore.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

async function buildReferralUrl(referralCode: string) {
  const url = new URL('/challenge', await getSiteOrigin());
  url.searchParams.set('ref', referralCode);
  return url.toString();
}

async function getClientIp() {
  const headerStore = await getRequestHeaders();
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor ?? headerStore.get('x-real-ip') ?? 'unknown';
}

function hashRateLimitIdentifier(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

async function consumeDatabaseRateLimit(admin: ReturnType<typeof createAdminClient>, scope: string, identifier: string) {
  const { data, error } = await admin.rpc('consume_marketing_waitlist_rate_limit', {
    p_identifier_hash: hashRateLimitIdentifier(identifier),
    p_limit: CHALLENGE_RATE_LIMIT_MAX,
    p_scope: scope,
    p_window_seconds: Math.floor(CHALLENGE_RATE_LIMIT_WINDOW_MS / 1000),
  });

  if (error) return null;
  const result = Array.isArray(data) ? data[0] : null;
  return result?.allowed === true;
}

function consumeRateLimitBucket(key: string, now: number) {
  const current = challengeRateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    challengeRateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + CHALLENGE_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  return current.count > CHALLENGE_RATE_LIMIT_MAX;
}

async function isChallengeRateLimited(email: string, admin: ReturnType<typeof createAdminClient>) {
  const now = Date.now();
  const clientIp = await getClientIp();

  const [ipAllowed, emailAllowed] = await Promise.all([
    consumeDatabaseRateLimit(admin, 'challenge_waitlist_ip', clientIp),
    consumeDatabaseRateLimit(admin, 'challenge_waitlist_email', email),
  ]);

  if (ipAllowed !== null && emailAllowed !== null) {
    return !ipAllowed || !emailAllowed;
  }

  const ipLimited = consumeRateLimitBucket(`ip:${clientIp}`, now);
  const emailLimited = consumeRateLimitBucket(`email:${email}`, now);

  return ipLimited || emailLimited;
}

async function successState(referralCode: string, isDuplicate = false): Promise<ChallengeJoinState> {
  return {
    ok: true,
    isDuplicate,
    referralCode,
    referralUrl: await buildReferralUrl(referralCode),
  };
}

export async function joinChallengeWaitlist(
  _previousState: ChallengeJoinState,
  formData: FormData,
): Promise<ChallengeJoinState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const referredBy = normalizeReferralCode(formData.get('referred_by'));

  if (!EMAIL_RE.test(email)) {
    return { error: 'invalid_email' };
  }

  if (referredBy === undefined) {
    return { error: 'invalid_referral' };
  }

  const now = new Date();
  if (now < CHALLENGE_START || now > CHALLENGE_END) {
    return { error: 'challenge_closed' };
  }

  const admin = createAdminClient();

  const { count: participantCount, error: countError } = await admin
    .from('marketing_waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'challenge');

  if (countError) return { error: 'unknown' };
  if ((participantCount ?? 0) >= CHALLENGE_CAP) {
    return { error: 'challenge_full' };
  }

  if (await isChallengeRateLimited(email, admin)) {
    return { error: 'rate_limited' };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();

    const { error: insertError } = await admin
      .from('marketing_waitlist')
      .insert({ email, source: 'challenge', referred_by: referredBy, referral_code: code });

    if (!insertError) return successState(code);
    if (insertError.code !== '23505') return { error: 'unknown' };

    const { data: existing, error: selectError } = await admin
      .from('marketing_waitlist')
      .select('referral_code')
      .eq('email', email)
      .maybeSingle();

    if (selectError) return { error: 'unknown' };
    if (existing?.referral_code) return successState(existing.referral_code, true);
    if (!existing) continue;

    const { data: updated, error: updateError } = await admin
      .from('marketing_waitlist')
      .update({ referral_code: code, source: 'challenge' })
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

// Upsert approach: referral_code holders update their row; anonymous create a new row.
// Called directly (not via useActionState) — fire-and-forget from the client.
export async function recordTierSelection(
  tier: 'standard' | 'champion',
  referralCode?: string,
): Promise<void> {
  if (tier !== 'standard' && tier !== 'champion') return;

  const admin = createAdminClient();
  const clientIp = await getClientIp();
  const ipHash = hashRateLimitIdentifier(clientIp);
  const now = new Date().toISOString();

  if (referralCode && REFERRAL_CODE_RE.test(referralCode)) {
    await admin.from('challenge_tier_selections').upsert(
      { referral_code: referralCode, tier, ip_hash: ipHash, updated_at: now },
      { onConflict: 'referral_code' },
    );
  } else {
    await admin.from('challenge_tier_selections').insert({ tier, ip_hash: ipHash });
  }
}
