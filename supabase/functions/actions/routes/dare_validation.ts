import {
  assertInteger,
  assertOneOf,
  assertOptionalString,
  assertRecord,
  assertString,
  validationError,
} from "../_shared/validation.ts";

const CURRENCIES = ["NGN"] as const;
const CATEGORIES = [
  "knowledge",
  "physical",
  "verbal",
  "sports",
  "creative",
  "other",
] as const;

export type CreateDarePayload = {
  title: string;
  description?: string;
  category: typeof CATEGORIES[number];
  stakeAmount: number;
  currency: typeof CURRENCIES[number];
  durationSeconds: number;
  targetUsername?: string | null;
  constitution: {
    test: string;
    rules: string;
    proofMethod?: string | null;
    edgeCases?: string | null;
  };
};

export function validateCreateDarePayload(value: unknown): CreateDarePayload {
  const payload = assertRecord(value, "payload");
  const constitution = assertRecord(
    payload.constitution,
    "payload.constitution",
  );
  const targetUsername = nullableUsername(
    payload.targetUsername,
    "payload.targetUsername",
  );

  return {
    title: assertString(payload.title, "payload.title", { min: 5, max: 140 }),
    description: assertOptionalString(
      payload.description,
      "payload.description",
      {
        min: 1,
        max: 1000,
      },
    ),
    category: assertOneOf(payload.category, CATEGORIES, "payload.category"),
    stakeAmount: assertInteger(payload.stakeAmount, "payload.stakeAmount", {
      min: 1_000,
      max: 5_000_000,
    }),
    currency: assertOneOf(payload.currency, CURRENCIES, "payload.currency"),
    durationSeconds: assertInteger(
      payload.durationSeconds,
      "payload.durationSeconds",
      { min: 30, max: 3600 },
    ),
    targetUsername,
    constitution: {
      test: assertString(constitution.test, "payload.constitution.test", {
        min: 5,
        max: 1000,
      }),
      rules: assertString(constitution.rules, "payload.constitution.rules", {
        min: 3,
        max: 3000,
      }),
      proofMethod: nullableString(
        constitution.proofMethod,
        "payload.constitution.proofMethod",
        500,
      ),
      edgeCases: nullableString(
        constitution.edgeCases,
        "payload.constitution.edgeCases",
        1000,
      ),
    },
  };
}

function nullableUsername(
  value: unknown,
  path: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const username = assertString(value, path, { min: 3, max: 30 });
  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    throw validationError(
      path,
      "must contain only letters, numbers, and underscores",
    );
  }
  return username;
}

function nullableString(
  value: unknown,
  path: string,
  max: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return assertString(value, path, { min: 1, max });
}
