import { ActionError } from "./errors.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9:_-]{12,128}$/;

export type Validator<T> = (value: unknown, path?: string) => T;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertRecord(
  value: unknown,
  path = "value",
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw validationError(path, "must be an object");
  }

  return value;
}

export function assertString(
  value: unknown,
  path = "value",
  options: { min?: number; max?: number; trim?: boolean } = {},
): string {
  if (typeof value !== "string") {
    throw validationError(path, "must be a string");
  }

  const next = options.trim === false ? value : value.trim();
  if (options.min !== undefined && next.length < options.min) {
    throw validationError(path, `must be at least ${options.min} characters`);
  }

  if (options.max !== undefined && next.length > options.max) {
    throw validationError(path, `must be at most ${options.max} characters`);
  }

  return next;
}

export function assertOptionalString(
  value: unknown,
  path = "value",
  options: { min?: number; max?: number; trim?: boolean } = {},
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return assertString(value, path, options);
}

export function assertInteger(
  value: unknown,
  path = "value",
  options: { min?: number; max?: number } = {},
): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw validationError(path, "must be an integer");
  }

  if (options.min !== undefined && value < options.min) {
    throw validationError(
      path,
      `must be greater than or equal to ${options.min}`,
    );
  }

  if (options.max !== undefined && value > options.max) {
    throw validationError(path, `must be less than or equal to ${options.max}`);
  }

  return value;
}

export function assertUuid(value: unknown, path = "value"): string {
  const id = assertString(value, path);
  if (!UUID_RE.test(id)) {
    throw validationError(path, "must be a valid UUID");
  }

  return id;
}

export function assertIdempotencyKey(
  value: unknown,
  path = "idempotencyKey",
): string {
  const key = assertString(value, path);
  if (!IDEMPOTENCY_KEY_RE.test(key)) {
    throw validationError(
      path,
      "must be 12-128 characters using letters, numbers, colon, underscore, or hyphen",
    );
  }

  return key;
}

export function assertOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path = "value",
): T[number] {
  const next = assertString(value, path);
  if (!allowed.includes(next)) {
    throw validationError(path, `must be one of: ${allowed.join(", ")}`);
  }

  return next;
}

export function validationError(
  path: string,
  message: string,
): ActionError {
  return new ActionError("VALIDATION_FAILED", {
    message: `${path} ${message}.`,
    details: { path, reason: message },
  });
}
