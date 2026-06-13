type ActionEnvelope<TPayload> = {
  requestId: string;
  idempotencyKey: string;
  payload: TPayload;
};

type ActionErrorEnvelope = {
  ok?: false;
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
  };
  requestId?: string;
};

export class AdminActionError extends Error {
  readonly code: string;
  readonly requestId: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(
    message: string,
    options: {
      code: string;
      requestId: string;
      retryable: boolean;
      status: number;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = 'AdminActionError';
    this.code = options.code;
    this.requestId = options.requestId;
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

async function postAdminAction<TPayload>(
  path: string,
  scope: string,
  payload: TPayload,
  accessToken: string,
): Promise<void> {
  const body: ActionEnvelope<TPayload> = {
    requestId: crypto.randomUUID(),
    idempotencyKey: `${scope}:${crypto.randomUUID()}`,
    payload,
  };

  let response: Response;
  try {
    response = await fetch(`${adminActionBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-request-id': body.requestId,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new AdminActionError('Admin action request failed.', {
      code: 'NETWORK_ERROR',
      requestId: body.requestId,
      retryable: true,
      status: 0,
      cause: error,
    });
  }

  if (!response.ok) {
    const errorBody = await readActionErrorEnvelope(response);
    const requestId = typeof errorBody?.requestId === 'string'
      ? errorBody.requestId
      : body.requestId;
    const code = typeof errorBody?.error?.code === 'string'
      ? errorBody.error.code
      : 'ADMIN_ACTION_FAILED';
    const message = typeof errorBody?.error?.message === 'string'
      ? errorBody.error.message
      : 'Admin action failed.';

    throw new AdminActionError(message, {
      code,
      requestId,
      retryable: errorBody?.error?.retryable === true,
      status: response.status,
    });
  }
}

function adminActionBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new AdminActionError('Admin action API is not configured.', {
      code: 'ADMIN_ACTION_API_NOT_CONFIGURED',
      requestId: crypto.randomUUID(),
      retryable: false,
      status: 0,
    });
  }

  try {
    return new URL(value).origin;
  } catch (error) {
    throw new AdminActionError('Admin action API is not configured.', {
      code: 'ADMIN_ACTION_API_NOT_CONFIGURED',
      requestId: crypto.randomUUID(),
      retryable: false,
      status: 0,
      cause: error,
    });
  }
}

async function readActionErrorEnvelope(
  response: Response,
): Promise<ActionErrorEnvelope | null> {
  try {
    const body = await response.json();
    return isActionErrorEnvelope(body) ? body : null;
  } catch {
    return null;
  }
}

function isActionErrorEnvelope(value: unknown): value is ActionErrorEnvelope {
  return typeof value === 'object' && value !== null;
}

export function approveWithdrawal(id: string, reason: string, accessToken: string): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/withdrawals/${id}/approve`,
    `approve-withdrawal:${id}`,
    { reason },
    accessToken,
  );
}

export function rejectWithdrawal(id: string, reason: string, accessToken: string): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/withdrawals/${id}/reject`,
    `reject-withdrawal:${id}`,
    { reason },
    accessToken,
  );
}

export function decideKyc(
  verificationId: string,
  payload: {
    verdict: 'approved' | 'rejected';
    kycTierGranted?: 'kyc1' | 'kyc2' | 'kyc3';
    adminNote?: string;
  },
  accessToken: string,
): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/kyc/${verificationId}/decide`,
    `decide-kyc:${verificationId}`,
    payload,
    accessToken,
  );
}

export function freezeUser(userId: string, reason: string, accessToken: string): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/users/${userId}/freeze`,
    `freeze-user:${userId}`,
    { reason },
    accessToken,
  );
}

export function assignJuryCase(
  caseId: string,
  accessToken: string,
  assignmentCount?: 3 | 5 | 7,
): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/jury-cases/${caseId}/assign`,
    `assign-jury-case:${caseId}`,
    assignmentCount != null ? { assignmentCount } : {},
    accessToken,
  );
}

export function resolveJuryCase(
  caseId: string,
  payload: {
    verdict: 'A' | 'B' | 'void' | 'uphold' | 'overturn';
    adminNote: string;
  },
  accessToken: string,
): Promise<void> {
  return postAdminAction(
    `/functions/v1/actions/admin/jury-cases/${caseId}/resolve`,
    `resolve-jury-case:${caseId}`,
    payload,
    accessToken,
  );
}
