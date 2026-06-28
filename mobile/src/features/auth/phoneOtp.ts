export type PhoneAuthMode = 'sign-in' | 'sign-up';
export type PhoneOtpPurpose = 'auth' | 'link';

export type PendingPhoneOtp = {
  authMode?: PhoneAuthMode;
  channel: 'sms';
  phone: string;
  purpose: PhoneOtpPurpose;
  requestedAt: number;
};

export const PHONE_OTP_RESEND_SECONDS = 60;

let pendingPhoneOtp: PendingPhoneOtp | null = null;

export function setPendingPhoneOtp(value: PendingPhoneOtp) {
  pendingPhoneOtp = value;
}

export function getPendingPhoneOtp(purpose?: PhoneOtpPurpose) {
  if (!pendingPhoneOtp) return null;
  if (purpose && pendingPhoneOtp.purpose !== purpose) return null;
  return pendingPhoneOtp;
}

export function clearPendingPhoneOtp() {
  pendingPhoneOtp = null;
}

export function normalizePhoneNumber(value: string) {
  return value.trim().replace(/[()\-\s]/g, '');
}

export function validatePhoneNumber(value: string) {
  const normalized = normalizePhoneNumber(value);

  if (!normalized) return 'Enter your phone number with country code.';
  if (!normalized.startsWith('+')) return 'Start with country code, for example +234 or +254.';
  if (!/^\+[1-9][0-9]{7,14}$/.test(normalized)) {
    return 'Use a valid international phone number.';
  }

  return null;
}

export function normalizeOtpCode(value: string) {
  return value.replace(/[^0-9]/g, '').slice(0, 6);
}

export function validateOtpCode(value: string) {
  const normalized = normalizeOtpCode(value);
  if (normalized.length !== 6) return 'Enter the 6 digit code.';
  return null;
}

export function maskPhoneNumber(value: string) {
  const normalized = normalizePhoneNumber(value);
  if (!normalized.startsWith('+') || normalized.length < 8) return 'your phone';

  const countryAndPrefix = normalized.slice(0, Math.min(4, normalized.length - 4));
  const ending = normalized.slice(-4);
  return `${countryAndPrefix}***${ending}`;
}

export function getOtpRetryLabel(remainingSeconds: number) {
  if (remainingSeconds <= 0) return 'Resend code';
  return `Resend in ${remainingSeconds}s`;
}

export function getPhoneOtpErrorMessage(error?: unknown) {
  const status = getErrorStatus(error);
  const code = getErrorCode(error);
  const errorName = getErrorName(error);
  const errorMessage = getErrorMessage(error);

  if (code === 'over_sms_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) {
    return 'Too many code attempts. Wait a few minutes, then request a new code.';
  }

  if (code === 'otp_expired' || code === 'otp_disabled') {
    return 'This code expired. Request a new code.';
  }

  if (code === 'phone_provider_disabled' || code === 'sms_provider_not_configured') {
    return 'Phone sign-in is not configured yet. Use email sign-in for now.';
  }

  if (
    status === 408 ||
    errorName === 'AbortError' ||
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out')
  ) {
    return 'Phone verification timed out. Check your connection, then try again.';
  }

  if (code === 'session_not_found' || code === 'auth_session_missing') {
    return 'Your signed-in session expired. Sign in again, then request a new code.';
  }

  if (status === 422 || status === 400) {
    return 'Check the phone number or code and try again.';
  }

  if (status && status >= 500) {
    return 'Phone verification is unavailable right now. Try again later.';
  }

  return 'Phone verification failed. Try again.';
}

export function getStepUpVerificationCopy(actionLabel: string) {
  return {
    body: `${actionLabel} may require a fresh phone, password, KYC, or provider check before the server accepts it.`,
    title: 'Step-up verification may apply',
  };
}

function getErrorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  const status = Number((error as { status?: unknown }).status);
  return Number.isFinite(status) ? status : undefined;
}

function getErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function getErrorName(error: unknown) {
  if (typeof error !== 'object' || error === null || !('name' in error)) return undefined;
  const name = (error as { name?: unknown }).name;
  return typeof name === 'string' ? name : undefined;
}

function getErrorMessage(error: unknown) {
  if (typeof error !== 'object' || error === null || !('message' in error)) return '';
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message.toLowerCase() : '';
}
