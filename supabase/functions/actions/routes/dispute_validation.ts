import {
  assertOneOf,
  assertRecord,
  assertString,
  assertUuid,
  validationError,
} from "../_shared/validation.ts";

const DISPUTE_REASONS = [
  "score_issue",
  "timer_issue",
  "rules_issue",
  "technical_issue",
  "abuse_or_cheating",
  "other",
] as const;

const ADMIN_VERDICTS = ["A", "B", "void", "uphold", "overturn"] as const;

export type FileDisputePayload = {
  reason: typeof DISPUTE_REASONS[number];
  summary: string;
  evidenceObjectIds: string[];
};

export type ResolveJuryCasePayload = {
  verdict: typeof ADMIN_VERDICTS[number];
  adminNote: string;
};

export function validateFileDisputePayload(
  value: unknown,
): FileDisputePayload {
  const payload = assertRecord(value, "payload");

  return {
    reason: assertOneOf(
      payload.reason,
      DISPUTE_REASONS,
      "payload.reason",
    ),
    summary: assertString(payload.summary, "payload.summary", {
      min: 10,
      max: 2800,
    }),
    evidenceObjectIds: assertEvidenceObjectIds(payload.evidenceObjectIds),
  };
}

export function validateResolveJuryCasePayload(
  value: unknown,
): ResolveJuryCasePayload {
  const payload = assertRecord(value, "payload");

  return {
    verdict: assertOneOf(payload.verdict, ADMIN_VERDICTS, "payload.verdict"),
    adminNote: assertString(payload.adminNote, "payload.adminNote", {
      min: 10,
      max: 2000,
    }),
  };
}

function assertEvidenceObjectIds(value: unknown): string[] {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw validationError("payload.evidenceObjectIds", "must be an array");
  }

  if (value.length > 1) {
    throw validationError(
      "payload.evidenceObjectIds",
      "must contain at most 1 item for the MVP dispute packet",
    );
  }

  return value.map((id, index) =>
    assertUuid(id, `payload.evidenceObjectIds.${index}`)
  );
}
