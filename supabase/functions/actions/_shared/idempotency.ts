import { ActionError } from "./errors.ts";
import { type SupabaseActionClient } from "./supabase.ts";
import { assertIdempotencyKey } from "./validation.ts";

export function normalizeIdempotencyKey(value: unknown): string {
  return assertIdempotencyKey(value);
}

export function hashIdempotencyKey(key: string): Promise<string> {
  return sha256Hex(key);
}

// Hash the request payload so a replay with a different body is detected.
export function hashBody(body: unknown): Promise<string> {
  return sha256Hex(JSON.stringify(body));
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export type IdempotencyRecord = {
  statusCode: number;
  responseBody: unknown;
};

type IdempotencyRow = {
  user_id: string;
  body_hash: string;
  status_code: number;
  response_body: unknown;
};

// Must be called with the service client — idempotency_records is not accessible
// to anon/authenticated roles.
export async function checkIdempotency(
  keyHash: string,
  bodyHash: string,
  userId: string,
  serviceClient: SupabaseActionClient,
): Promise<IdempotencyRecord | null> {
  const { data, error } = await serviceClient
    .from<IdempotencyRow>("idempotency_records")
    .select("user_id,body_hash,status_code,response_body")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) {
    throw new ActionError("INTERNAL_ERROR", { cause: error });
  }

  if (!data) {
    return null;
  }

  if (data.user_id !== userId) {
    // Key belongs to another user — refuse without revealing the record exists.
    throw new ActionError("IDEMPOTENCY_CONFLICT");
  }

  if (data.body_hash !== bodyHash) {
    throw new ActionError("IDEMPOTENCY_CONFLICT");
  }

  return { statusCode: data.status_code, responseBody: data.response_body };
}

// Must be called with the service client. Silently succeeds on a duplicate-key
// violation (23505) — a concurrent request won the race, which is safe.
export async function storeIdempotencyResult(
  keyHash: string,
  bodyHash: string,
  userId: string,
  statusCode: number,
  responseBody: unknown,
  serviceClient: SupabaseActionClient,
): Promise<void> {
  const { error } = await serviceClient.from("idempotency_records").insert({
    key_hash: keyHash,
    body_hash: bodyHash,
    user_id: userId,
    status_code: statusCode,
    response_body: responseBody,
  });

  if (error) {
    if ((error as { code?: string }).code === "23505") return;
    throw new ActionError("INTERNAL_ERROR", { cause: error });
  }
}
