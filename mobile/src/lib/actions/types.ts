export type ActionErrorCode =
  | 'ACCOUNT_RESTRICTED'
  | 'ALREADY_PROCESSED'
  | 'ACTIVE_COURT_COMMITMENT'
  | 'BAD_REQUEST'
  | 'FORBIDDEN'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_STATE'
  | 'KYC_REQUIRED'
  | 'LIMIT_EXCEEDED'
  | 'LIVE_COURT_REQUIRED'
  | 'METHOD_NOT_ALLOWED'
  | 'NETWORK_ERROR'
  | 'NOT_FOUND'
  | 'PROVIDER_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNAUTHENTICATED'
  | 'VALIDATION_FAILED'
  | 'UNKNOWN';

export type ActionError = {
  code: ActionErrorCode;
  message: string;
  retryable: boolean;
  status?: number;
};

export type ActionResult<T> =
  | {
      data: T;
      error: null;
      ok: true;
    }
  | {
      data: null;
      error: ActionError;
      ok: false;
    };

export type ActionRequestOptions = {
  body?: unknown;
  idempotencyKey?: string;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
  signal?: AbortSignal;
};
