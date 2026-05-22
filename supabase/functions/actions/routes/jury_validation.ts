import {
  assertInteger,
  assertOneOf,
  assertRecord,
  assertString,
  validationError,
} from "../_shared/validation.ts";

const JURY_VOTES = ["A", "B", "void", "escalate"] as const;

export type AssignJuryCasePayload = {
  assignmentCount?: 3 | 5 | 7;
};

export type CastJuryVotePayload = {
  vote: typeof JURY_VOTES[number];
  rationale: string;
};

export function validateAssignJuryCasePayload(
  value: unknown,
): AssignJuryCasePayload {
  const payload = assertRecord(value, "payload");
  if (
    payload.assignmentCount === undefined || payload.assignmentCount === null
  ) {
    return {};
  }

  const assignmentCount = assertInteger(
    payload.assignmentCount,
    "payload.assignmentCount",
    { min: 3, max: 7 },
  );

  if (![3, 5, 7].includes(assignmentCount)) {
    throw validationError("payload.assignmentCount", "must be 3, 5, or 7");
  }

  return { assignmentCount: assignmentCount as 3 | 5 | 7 };
}

export function validateCastJuryVotePayload(
  value: unknown,
): CastJuryVotePayload {
  const payload = assertRecord(value, "payload");

  return {
    vote: assertOneOf(payload.vote, JURY_VOTES, "payload.vote"),
    rationale: assertString(payload.rationale, "payload.rationale", {
      min: 20,
      max: 3000,
    }),
  };
}
