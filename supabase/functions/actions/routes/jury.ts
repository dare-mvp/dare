import { requireAdminUser, requireAuthenticatedUser } from "../_shared/auth.ts";
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
import { firstForwardedIp } from "../_shared/request.ts";
import { mapDareQueryError } from "./dare_errors.ts";
import {
  type AssignJuryCasePayload,
  type CastJuryVotePayload,
  validateAssignJuryCasePayload,
  validateCastJuryVotePayload,
} from "./jury_validation.ts";

type AssignJuryCaseRpcRow = {
  jury_case_id: string;
  dare_id: string;
  status: "jury_voting";
  dare_status: "jury_open";
  assigned_count: number;
  votes_needed: number;
  due_at: string;
};

type CastJuryVoteRpcRow = {
  jury_case_id: string;
  assignment_id: string;
  vote_id: string;
  status: "jury_voting" | "settlement_pending" | "escalated";
  verdict: "A" | "B" | "void" | "escalate" | null;
  dare_id: string;
  dare_status: "jury_open" | "completed" | "dispute_pending";
  winner_id: string | null;
  votes_cast: number;
  votes_needed: number;
};

export type AssignJuryCaseResponse = {
  juryCaseId: string;
  dareId: string;
  status: "jury_voting";
  dareStatus: "jury_open";
  assignedCount: number;
  votesNeeded: number;
  dueAt: string;
};

export type CastJuryVoteResponse = {
  juryCaseId: string;
  assignmentId: string;
  voteId: string;
  status: "jury_voting" | "settlement_pending" | "escalated";
  verdict: "A" | "B" | "void" | "escalate" | null;
  dareId: string;
  dareStatus: "jury_open" | "completed" | "dispute_pending";
  winnerId: string | null;
  votesCast: number;
  votesNeeded: number;
};

export async function assignJuryCase(
  request: Request,
  juryCaseId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: AssignJuryCaseResponse }> {
  const validatedCaseId = assertUuid(juryCaseId, "juryCaseId");
  const authUser = await requireAdminUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateAssignJuryCasePayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    juryCaseId: validatedCaseId,
    payload: envelope.payload,
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
      data: stored.responseBody as AssignJuryCaseResponse,
    };
  }

  const row = await callAssignJuryCaseRpc(
    serviceClient,
    authUser.id,
    validatedCaseId,
    envelope.payload,
  );
  const data = mapAssignJuryCaseResponse(row);
  await insertAuditLog(
    request,
    serviceClient,
    authUser.id,
    "jury.assigned",
    data.juryCaseId,
    "admin",
    data,
  );
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

export async function castJuryVote(
  request: Request,
  juryCaseId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: CastJuryVoteResponse }> {
  const validatedCaseId = assertUuid(juryCaseId, "juryCaseId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateCastJuryVotePayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    juryCaseId: validatedCaseId,
    payload: envelope.payload,
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
      data: stored.responseBody as CastJuryVoteResponse,
    };
  }

  const row = await callCastJuryVoteRpc(
    serviceClient,
    authUser.id,
    validatedCaseId,
    envelope.payload,
  );
  const data = mapCastJuryVoteResponse(row);
  await insertAuditLog(
    request,
    serviceClient,
    authUser.id,
    "jury.vote_cast",
    data.juryCaseId,
    "user",
    data,
  );
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

async function callAssignJuryCaseRpc(
  serviceClient: SupabaseActionClient,
  adminUserId: string,
  juryCaseId: string,
  payload: AssignJuryCasePayload,
): Promise<AssignJuryCaseRpcRow> {
  const { data, error } = await serviceClient.rpc<AssignJuryCaseRpcRow[]>(
    "assign_jury_case_action",
    {
      p_admin_user_id: adminUserId,
      p_jury_case_id: juryCaseId,
      p_assignment_count: payload.assignmentCount ?? null,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callCastJuryVoteRpc(
  serviceClient: SupabaseActionClient,
  jurorId: string,
  juryCaseId: string,
  payload: CastJuryVotePayload,
): Promise<CastJuryVoteRpcRow> {
  const { data, error } = await serviceClient.rpc<CastJuryVoteRpcRow[]>(
    "cast_jury_vote_action",
    {
      p_juror_id: jurorId,
      p_jury_case_id: juryCaseId,
      p_vote: payload.vote,
      p_rationale: payload.rationale,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapAssignJuryCaseResponse(
  row: AssignJuryCaseRpcRow,
): AssignJuryCaseResponse {
  return {
    juryCaseId: row.jury_case_id,
    dareId: row.dare_id,
    status: row.status,
    dareStatus: row.dare_status,
    assignedCount: row.assigned_count,
    votesNeeded: row.votes_needed,
    dueAt: row.due_at,
  };
}

function mapCastJuryVoteResponse(
  row: CastJuryVoteRpcRow,
): CastJuryVoteResponse {
  return {
    juryCaseId: row.jury_case_id,
    assignmentId: row.assignment_id,
    voteId: row.vote_id,
    status: row.status,
    verdict: row.verdict,
    dareId: row.dare_id,
    dareStatus: row.dare_status,
    winnerId: row.winner_id,
    votesCast: row.votes_cast,
    votesNeeded: row.votes_needed,
  };
}

async function insertAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  action: string,
  juryCaseId: string,
  actorType: "admin" | "user",
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: actorType,
    action,
    target_type: "jury_case",
    target_id: juryCaseId,
    metadata,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
