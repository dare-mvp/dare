export type ActionErrorCode =
  | 'BAD_REQUEST'
  | 'FORBIDDEN'
  | 'LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNAUTHENTICATED'
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
