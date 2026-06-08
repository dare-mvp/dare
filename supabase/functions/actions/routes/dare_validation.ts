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
const RESOLUTION_TYPES = [
  "answer_key",
  "witnessed",
  "evidence",
] as const;
const DARE_TYPES = ["skill", "task"] as const;

export type CreateDarePayload = {
  title: string;
  description?: string;
  category: typeof CATEGORIES[number];
  dareType: typeof DARE_TYPES[number];
  resolutionType: typeof RESOLUTION_TYPES[number];
  stakeAmount: number;
  rewardAmount?: number;
  currency: typeof CURRENCIES[number];
  durationSeconds: number;
  targetUsername?: string | null;
  constitution: {
    answerKey?: string | null;
    answerKeyRules?: string | null;
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

  const dareType = payload.dareType === undefined
    ? "skill"
    : assertOneOf(payload.dareType, DARE_TYPES, "payload.dareType");
  const stakeAmount = assertInteger(payload.stakeAmount ?? 0, "payload.stakeAmount", {
    min: 0,
    max: 5_000_000,
  });
  const rewardAmount = payload.rewardAmount === undefined
    ? 0
    : assertInteger(payload.rewardAmount, "payload.rewardAmount", {
      min: 0,
      max: 5_000_000,
    });

  if (dareType === "skill" && stakeAmount < 1_000) {
    throw validationError("payload.stakeAmount", "must be at least 1000 kobo for Skill-Based DAREs");
  }

  if (dareType === "task" && rewardAmount < 1_000) {
    throw validationError("payload.rewardAmount", "must be at least 1000 kobo for Task-Based DAREs");
  }

  const resolutionType = payload.resolutionType === undefined
    ? "answer_key"
    : assertOneOf(
      payload.resolutionType,
      RESOLUTION_TYPES,
      "payload.resolutionType",
    );
  const answerKey = nullableString(
    constitution.answerKey,
    "payload.constitution.answerKey",
    1000,
  );

  if (resolutionType === "answer_key" && !answerKey) {
    throw validationError(
      "payload.constitution.answerKey",
      "is required for Answer Key DAREs",
    );
  }

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
    dareType,
    resolutionType,
    stakeAmount: dareType === "skill" ? stakeAmount : 0,
    rewardAmount: dareType === "task" ? rewardAmount : 0,
    currency: assertOneOf(payload.currency, CURRENCIES, "payload.currency"),
    durationSeconds: assertInteger(
      payload.durationSeconds,
      "payload.durationSeconds",
      { min: 30, max: 3600 },
    ),
    targetUsername,
    constitution: {
      answerKey,
      answerKeyRules: nullableString(
        constitution.answerKeyRules,
        "payload.constitution.answerKeyRules",
        1000,
      ),
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
