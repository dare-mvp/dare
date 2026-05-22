import { CORS_HEADERS } from "./cors.ts";
import { type ActionError, toActionError } from "./errors.ts";

export type SuccessEnvelope<TData> = {
  ok: true;
  data: TData;
  requestId: string;
};

export type ErrorEnvelope = {
  ok: false;
  error: {
    code: ActionError["code"];
    message: string;
    retryable: boolean;
  };
  requestId: string;
};

type ResponseInitOptions = {
  status?: number;
  headers?: HeadersInit;
};

export function jsonResponse<TBody>(
  body: TBody,
  options: ResponseInitOptions = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export function successResponse<TData>(
  data: TData,
  requestId: string,
  options: ResponseInitOptions = {},
): Response {
  return jsonResponse<SuccessEnvelope<TData>>(
    { ok: true, data, requestId },
    options,
  );
}

export function errorResponse(
  error: unknown,
  requestId: string,
): Response {
  const actionError = toActionError(error);

  return jsonResponse<ErrorEnvelope>(
    {
      ok: false,
      error: {
        code: actionError.code,
        message: actionError.message,
        retryable: actionError.retryable,
      },
      requestId,
    },
    { status: actionError.status },
  );
}
