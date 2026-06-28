import assert from 'node:assert/strict';

import {
  getOtpRetryLabel,
  getPhoneOtpErrorMessage,
  maskPhoneNumber,
  normalizeOtpCode,
  normalizePhoneNumber,
  validateOtpCode,
  validatePhoneNumber,
} from './phoneOtp';

assert.equal(normalizePhoneNumber(' +234 801-234-5678 '), '+2348012345678');
assert.equal(validatePhoneNumber('+2348012345678'), null);
assert.equal(validatePhoneNumber('08012345678'), 'Start with country code, for example +234 or +254.');
assert.equal(validatePhoneNumber('+120'), 'Use a valid international phone number.');

assert.equal(normalizeOtpCode('12 34-56 9'), '123456');
assert.equal(validateOtpCode('123456'), null);
assert.equal(validateOtpCode('12345'), 'Enter the 6 digit code.');

assert.equal(maskPhoneNumber('+2348012345678'), '+234***5678');
assert.equal(getOtpRetryLabel(0), 'Resend code');
assert.equal(getOtpRetryLabel(41), 'Resend in 41s');
assert.equal(
  getPhoneOtpErrorMessage({ code: 'over_sms_send_rate_limit', status: 429 }),
  'Too many code attempts. Wait a few minutes, then request a new code.',
);
assert.equal(
  getPhoneOtpErrorMessage({ code: 'phone_provider_disabled', status: 400 }),
  'Phone sign-in is not configured yet. Use email sign-in for now.',
);
assert.equal(
  getPhoneOtpErrorMessage({ status: 408 }),
  'Phone verification timed out. Check your connection, then try again.',
);
assert.equal(
  getPhoneOtpErrorMessage({ code: 'auth_session_missing', status: 401 }),
  'Your signed-in session expired. Sign in again, then request a new code.',
);
