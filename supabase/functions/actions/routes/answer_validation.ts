import {
  assertRecord,
  assertString,
  assertUuid,
} from "../_shared/validation.ts";

export type SubmitAnswerPayload = {
  questionId: string;
  answerText: string;
};

export function validateSubmitAnswerPayload(
  value: unknown,
): SubmitAnswerPayload {
  const payload = assertRecord(value, "payload");
  return {
    questionId: assertUuid(payload.questionId, "payload.questionId"),
    answerText: assertString(payload.answerText, "payload.answerText", {
      min: 1,
      max: 2000,
    }),
  };
}
