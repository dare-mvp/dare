import { ActionErrorCode } from '../actions/types';

export const GENERIC_REQUEST_ERROR = 'We could not complete that request. Try again.';
export const GENERIC_LOAD_ERROR = 'We could not load the latest information. Try again.';
export const GENERIC_SAVE_ERROR = 'We could not save your changes. Try again.';

export function getActionUserMessage(code: ActionErrorCode) {
  switch (code) {
    case 'BAD_REQUEST':
      return 'Check the details and try again.';
    case 'FORBIDDEN':
      return 'This action is not available for your account.';
    case 'LIMIT_EXCEEDED':
      return 'This request cannot be completed with the current limits.';
    case 'NETWORK_ERROR':
      return 'Check your connection and try again.';
    case 'NOT_FOUND':
      return 'This item is no longer available.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Wait a moment and try again.';
    case 'SERVER_ERROR':
      return 'We could not complete this right now. Try again later.';
    case 'UNAUTHENTICATED':
      return 'Sign in again to continue.';
    case 'UNKNOWN':
    default:
      return GENERIC_REQUEST_ERROR;
  }
}

export function getAuthUserMessage(status?: number) {
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
