import {
  assertInteger,
  assertRecord,
  assertUuid,
} from "../_shared/validation.ts";

export type SubmitAnswerPayload = {
  roundIndex: number;
  questionId: string;
  selectedOption: number;
};

export function validateSubmitAnswerPayload(
  value: unknown,
): SubmitAnswerPayload {
  const payload = assertRecord(value, "payload");
  return {
    roundIndex: assertInteger(payload.roundIndex, "payload.roundIndex", {
      min: 0,
      max: 50,
    }),
    questionId: assertUuid(payload.questionId, "payload.questionId"),
    selectedOption: assertInteger(
      payload.selectedOption,
      "payload.selectedOption",
      {
        min: 0,
        max: 5,
      },
    ),
  };
}
