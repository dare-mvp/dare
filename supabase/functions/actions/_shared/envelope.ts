import { ActionError } from "./errors.ts";
import {
  assertIdempotencyKey,
  assertRecord,
  assertUuid,
  type Validator,
} from "./validation.ts";

export type ActionEnvelope<TPayload = unknown> = {
  requestId: string;
  idempotencyKey?: string;
  payload: TPayload;
};

export type ParseEnvelopeOptions<TPayload> = {
  requireIdempotencyKey?: boolean;
  validatePayload?: Validator<TPayload>;
};

export async function parseActionEnvelope<TPayload = unknown>(
  request: Request,
  options: ParseEnvelopeOptions<TPayload> = {},
): Promise<ActionEnvelope<TPayload>> {
  const body = await readJsonBody(request);
  const envelope = assertRecord(body, "body");
  const requestId = assertUuid(envelope.requestId, "requestId");

  const idempotencyKey = envelope.idempotencyKey === undefined
    ? undefined
    : assertIdempotencyKey(envelope.idempotencyKey);

  if (options.requireIdempotencyKey && idempotencyKey === undefined) {
    throw new ActionError("VALIDATION_FAILED", {
      message: "idempotencyKey is required.",
      details: { path: "idempotencyKey", reason: "required" },
    });
  }

  const rawPayload = envelope.payload ?? {};
  const payload = options.validatePayload
    ? options.validatePayload(rawPayload, "payload")
    : rawPayload as TPayload;

  return {
    requestId,
    idempotencyKey,
    payload,
  };
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ActionError("VALIDATION_FAILED", {
      message: "Content-Type must be application/json.",
      details: { path: "headers.content-type", reason: "invalid_content_type" },
    });
  }

  try {
    return await request.json();
  } catch (error) {
    throw new ActionError("VALIDATION_FAILED", {
      message: "Request body must be valid JSON.",
      details: { path: "body", reason: "invalid_json" },
      cause: error,
    });
  }
}
