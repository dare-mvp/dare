import { assertBackendConfigured } from '../config/env';
import { supabaseClient } from '../supabase/client';
import { ActionError, ActionRequestOptions, ActionResult } from './types';

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

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }

  return fallback;
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

export async function callAction<T>(path: string, options: ActionRequestOptions = {}): Promise<ActionResult<T>> {
  let config: ReturnType<typeof assertBackendConfigured>;
  try {
    config = assertBackendConfigured();
  } catch (error) {
    return {
      data: null,
      error: {
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Backend is not configured.',
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
      return {
        data: null,
        error: {
          code: mapStatusToCode(response.status),
          message: getErrorMessage(payload, 'The request could not be completed.'),
          retryable: response.status === 429 || response.status >= 500,
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
  } catch (error) {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed.',
        retryable: true,
      },
      ok: false,
    };
  }
}
