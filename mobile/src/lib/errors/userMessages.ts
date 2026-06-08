import { ActionErrorCode } from '../actions/types';

export const GENERIC_REQUEST_ERROR = 'We could not complete that request. Try again.';
export const GENERIC_LOAD_ERROR = 'We could not load the latest information. Try again.';
export const GENERIC_SAVE_ERROR = 'We could not save your changes. Try again.';

export function getActionUserMessage(code: ActionErrorCode) {
  switch (code) {
    case 'ACCOUNT_RESTRICTED':
      return 'This action is not available for your account.';
    case 'ALREADY_PROCESSED':
      return 'This action has already been processed.';
    case 'BAD_REQUEST':
      return 'Check the details and try again.';
    case 'FORBIDDEN':
      return 'This action is not available for your account.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'This request was already used with different details. Try again.';
    case 'INSUFFICIENT_FUNDS':
      return 'Available balance is too low for this stake.';
    case 'INVALID_STATE':
      return 'This request cannot be completed in its current state.';
    case 'KYC_REQUIRED':
      return 'Complete verification before creating money-backed DAREs.';
    case 'LIMIT_EXCEEDED':
      return 'This request cannot be completed with the current limits.';
    case 'METHOD_NOT_ALLOWED':
      return GENERIC_REQUEST_ERROR;
    case 'NETWORK_ERROR':
      return 'Check your connection and try again.';
    case 'NOT_FOUND':
      return 'This item is no longer available.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Wait a moment and try again.';
    case 'SERVER_ERROR':
      return 'We could not complete this right now. Try again later.';
    case 'PROVIDER_UNAVAILABLE':
      return 'The payment provider is temporarily unavailable. Try again later.';
    case 'UNAUTHENTICATED':
      return 'Sign in again to continue.';
    case 'VALIDATION_FAILED':
      return 'Check the details and try again.';
    case 'UNKNOWN':
    default:
      return GENERIC_REQUEST_ERROR;
  }
}

export function getAuthUserMessage(status?: number, code?: string) {
  if (code === 'user_already_exists' || code === 'email_exists' || code === 'identity_already_exists') {
    return 'An account already exists for this email. Sign in instead.';
  }

  if (code === 'weak_password') {
    return 'Use a stronger password to continue.';
  }

  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return 'Enter a valid email address.';
  }

  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'Too many attempts. Wait a few minutes and try again.';
  }

  if (code === 'invalid_credentials') {
    return 'Email or password is incorrect.';
  }

  if (status === 429) {
    return 'Too many attempts. Wait a few minutes and try again.';
  }

  if (status === 400 || status === 422) {
    return 'Check your account details and try again.';
  }

  if (status === 401 || status === 403) {
    return 'Email or password is incorrect.';
  }

  if (status && status >= 500) {
    return 'Sign-in is temporarily unavailable. Try again later.';
  }

  return 'Authentication could not be completed. Try again.';
}

export function getLoadUserMessage(resource = 'information') {
  return `We could not load the latest ${resource}. Try again.`;
}

export function getUploadUserMessage() {
  return 'We could not upload that file. Check the file and try again.';
}
