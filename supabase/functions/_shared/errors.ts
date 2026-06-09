export const ACTION_ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "ACCOUNT_RESTRICTED",
  "KYC_REQUIRED",
  "LIMIT_EXCEEDED",
  "INSUFFICIENT_FUNDS",
  "ACTIVE_COURT_COMMITMENT",
  "LIVE_COURT_REQUIRED",
  "INVALID_STATE",
  "IDEMPOTENCY_CONFLICT",
  "ALREADY_PROCESSED",
  "PROVIDER_UNAVAILABLE",
  "VALIDATION_FAILED",
  "RATE_LIMITED",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "INTERNAL_ERROR",
] as const;

export type ActionErrorCode = typeof ACTION_ERROR_CODES[number];

type ErrorDefinition = {
  status: number;
  retryable: boolean;
  message: string;
};

export const ERROR_DEFINITIONS: Record<ActionErrorCode, ErrorDefinition> = {
  UNAUTHENTICATED: {
    status: 401,
    retryable: false,
    message: "Authentication is required.",
  },
  FORBIDDEN: {
    status: 403,
    retryable: false,
    message: "You do not have permission to perform this action.",
  },
  ACCOUNT_RESTRICTED: {
    status: 403,
    retryable: false,
    message: "This account is restricted for this action.",
  },
  KYC_REQUIRED: {
    status: 403,
    retryable: false,
    message: "Additional verification is required.",
  },
  LIMIT_EXCEEDED: {
    status: 429,
    retryable: false,
    message: "This action exceeds the allowed limit.",
  },
  INSUFFICIENT_FUNDS: {
    status: 409,
    retryable: false,
    message: "Available balance is too low for this action.",
  },
  ACTIVE_COURT_COMMITMENT: {
    status: 409,
    retryable: false,
    message: "Finish your current Court before accepting another DARE.",
  },
  LIVE_COURT_REQUIRED: {
    status: 409,
    retryable: false,
    message: "Join the live video Court before submitting a result.",
  },
  INVALID_STATE: {
    status: 409,
    retryable: false,
    message: "The resource is not in the required state.",
  },
  IDEMPOTENCY_CONFLICT: {
    status: 409,
    retryable: false,
    message: "The idempotency key was already used with different input.",
  },
  ALREADY_PROCESSED: {
    status: 409,
    retryable: false,
    message: "This action has already been processed.",
  },
  PROVIDER_UNAVAILABLE: {
    status: 502,
    retryable: true,
    message: "The provider is temporarily unavailable.",
  },
  VALIDATION_FAILED: {
    status: 400,
    retryable: false,
    message: "The request is invalid.",
  },
  RATE_LIMITED: {
    status: 429,
    retryable: true,
    message: "Too many requests. Try again later.",
  },
  NOT_FOUND: {
    status: 404,
    retryable: false,
    message: "The requested resource was not found.",
  },
  METHOD_NOT_ALLOWED: {
    status: 405,
    retryable: false,
    message: "This HTTP method is not allowed for the route.",
  },
  INTERNAL_ERROR: {
    status: 500,
    retryable: true,
    message: "An unexpected error occurred.",
  },
};

export type ActionErrorOptions = {
  message?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
};

export class ActionError extends Error {
  readonly code: ActionErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(code: ActionErrorCode, options: ActionErrorOptions = {}) {
    const definition = ERROR_DEFINITIONS[code];
    super(options.message ?? definition.message);
    this.name = "ActionError";
    this.code = code;
    this.status = definition.status;
    this.retryable = definition.retryable;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export function isActionError(error: unknown): error is ActionError {
  return error instanceof ActionError;
}

export function toActionError(error: unknown): ActionError {
  if (isActionError(error)) {
    return error;
  }

  return new ActionError("INTERNAL_ERROR", { cause: error });
}

export function getPublicActionErrorMessage(error: ActionError): string {
  return ERROR_DEFINITIONS[error.code].message;
}
