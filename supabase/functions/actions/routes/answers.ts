import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { parseActionEnvelope } from "../_shared/envelope.ts";
import { ActionError } from "../_shared/errors.ts";
import {
  checkIdempotency,
  hashBody,
  hashIdempotencyKey,
  storeIdempotencyResult,
} from "../_shared/idempotency.ts";
import { type SupabaseActionClient } from "../_shared/supabase.ts";
import { assertUuid } from "../_shared/validation.ts";
import { mapDareQueryError } from "./dare_errors.ts";
import {
  type SubmitAnswerPayload,
  validateSubmitAnswerPayload,
} from "./answer_validation.ts";

type SubmitAnswerRpcRow = {
  answer_id: string;
  dare_id: string;
  question_id: string;
  round_index: number;
  selected_option: number | null;
  correct: boolean;
  response_ms: number | null;
  score_a: number;
  score_b: number;
  phase: "active";
};

type SubmitAnswerResponse = {
  answerId: string;
  dareId: string;
  questionId: string;
  roundIndex: number;
  selectedOption: number | null;
  correct: boolean;
  responseMs: number | null;
  scoreA: number;
  scoreB: number;
  phase: "active";
};

export async function submitAnswer(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: SubmitAnswerResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateSubmitAnswerPayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    dareId: validatedDareId,
    ...envelope.payload,
  });
  const stored = await checkIdempotency(
    keyHash,
    bodyHash,
    authUser.id,
    serviceClient,
  );

  if (stored) {
    return {
      requestId: envelope.requestId,
      data: stored.responseBody as SubmitAnswerResponse,
    };
  }

  const row = await callSubmitAnswerRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    envelope.payload,
  );
  const data = mapSubmitAnswerResponse(row);
  await storeIdempotencyResult(
    keyHash,
    bodyHash,
    authUser.id,
    200,
    data,
    serviceClient,
  );

  return { requestId: envelope.requestId, data };
}

async function callSubmitAnswerRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
  payload: SubmitAnswerPayload,
): Promise<SubmitAnswerRpcRow> {
  const { data, error } = await serviceClient.rpc<SubmitAnswerRpcRow[]>(
    "submit_dare_answer_action",
    {
      p_user_id: userId,
      p_dare_id: dareId,
      p_prompt_id: payload.questionId,
      p_answer_text: payload.answerText,
    },
  );

  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapSubmitAnswerResponse(
  row: SubmitAnswerRpcRow,
): SubmitAnswerResponse {
  return {
    answerId: row.answer_id,
    dareId: row.dare_id,
    questionId: row.question_id,
    roundIndex: row.round_index,
    selectedOption: row.selected_option,
    correct: row.correct,
    responseMs: row.response_ms,
    scoreA: row.score_a,
    scoreB: row.score_b,
    phase: row.phase,
  };
}
