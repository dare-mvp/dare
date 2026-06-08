import { assertBackendConfigured } from '../config/env';
import { getActionUserMessage } from '../errors/userMessages';
import { supabaseClient } from '../supabase/client';
import { ActionError, ActionRequestOptions, ActionResult } from './types';

const backendActionCodes: ActionError['code'][] = [
  'ACCOUNT_RESTRICTED',
  'ALREADY_PROCESSED',
  'FORBIDDEN',
  'IDEMPOTENCY_CONFLICT',
  'INSUFFICIENT_FUNDS',
  'INVALID_STATE',
  'KYC_REQUIRED',
  'LIMIT_EXCEEDED',
  'METHOD_NOT_ALLOWED',
  'NOT_FOUND',
  'PROVIDER_UNAVAILABLE',
  'RATE_LIMITED',
  'UNAUTHENTICATED',
  'VALIDATION_FAILED',
];

function mapStatusToCode(status: number): ActionError['code'] {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409 || status === 422) return 'LIMIT_EXCEEDED';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

async function getAccessToken() {
  const { data } = await supabaseClient?.auth.getSession() ?? { data: { session: null } };
  return data.session?.access_token ?? null;
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function unwrapSuccessEnvelope<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'ok' in payload &&
    'data' in payload &&
    (payload as { ok?: unknown }).ok === true
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

function getBackendError(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) return null;
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== 'object') return null;

  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string' || !backendActionCodes.includes(code as ActionError['code'])) {
    return null;
  }

  const retryable = (error as { retryable?: unknown }).retryable;
  return {
    code: code as ActionError['code'],
    retryable: typeof retryable === 'boolean' ? retryable : undefined,
  };
}

export async function callAction<T>(path: string, options: ActionRequestOptions = {}): Promise<ActionResult<T>> {
  let config: ReturnType<typeof assertBackendConfigured>;
  try {
    config = assertBackendConfigured();
  } catch {
    const code = 'BAD_REQUEST';
    return {
      data: null,
      error: {
        code,
        message: getActionUserMessage(code),
        retryable: false,
      },
      ok: false,
    };
  }

  const method = options.method ?? (options.body ? 'POST' : 'GET');

  try {
    const token = await getAccessToken();
    const response = await fetch(`${config.actionsFunctionUrl}${normalizePath(path)}`, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      method,
      signal: options.signal,
    });

    const payload = await parseJsonSafely(response);

    if (!response.ok) {
      const backendError = getBackendError(payload);
      const code = backendError?.code ?? mapStatusToCode(response.status);
      return {
        data: null,
        error: {
          code,
          message: getActionUserMessage(code),
          retryable: backendError?.retryable ?? (response.status === 429 || response.status >= 500),
          status: response.status,
        },
        ok: false,
      };
    }

    return {
      data: unwrapSuccessEnvelope<T>(payload),
      error: null,
      ok: true,
    };
  } catch {
    const code = 'NETWORK_ERROR';
    return {
      data: null,
      error: {
        code,
        message: getActionUserMessage(code),
        retryable: true,
      },
      ok: false,
    };
  }
}
