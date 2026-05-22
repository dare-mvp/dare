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
  type FileDisputePayload,
  type ResolveJuryCasePayload,
  validateFileDisputePayload,
  validateResolveJuryCasePayload,
} from "./dispute_validation.ts";

type FileDisputeRpcRow = {
  jury_case_id: string;
  dare_id: string;
  status: "filed";
  dare_status: "dispute_pending";
  court_phase: "disputed";
  opponent_user_id: string;
  evidence_a_id: string | null;
  evidence_b_id: string | null;
};

type ResolveJuryCaseRpcRow = {
  jury_case_id: string;
  dare_id: string;
  status: "settlement_pending";
  verdict: "A" | "B" | "void" | "uphold" | "overturn";
  dare_status: "completed";
  winner_id: string | null;
  court_phase: "completed";
};

export type FileDisputeResponse = {
  juryCaseId: string;
  dareId: string;
  status: "filed";
  dareStatus: "dispute_pending";
  courtPhase: "disputed";
  opponentUserId: string;
  evidenceAId: string | null;
  evidenceBId: string | null;
};

export type ResolveJuryCaseResponse = {
  juryCaseId: string;
  dareId: string;
  status: "settlement_pending";
  verdict: "A" | "B" | "void" | "uphold" | "overturn";
  dareStatus: "completed";
  winnerId: string | null;
  courtPhase: "completed";
};

export async function fileDispute(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: FileDisputeResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateFileDisputePayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    dareId: validatedDareId,
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
      data: stored.responseBody as FileDisputeResponse,
    };
  }

  const row = await callFileDisputeRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    envelope.payload,
  );
  const data = mapFileDisputeResponse(row);
  await insertDisputeAuditLog(
    request,
    serviceClient,
    authUser.id,
    "dispute.filed",
    data.juryCaseId,
    data,
  );
  await insertDisputeNotification(serviceClient, data);
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

export async function resolveJuryCase(
  request: Request,
  juryCaseId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: ResolveJuryCaseResponse }> {
  const validatedCaseId = assertUuid(juryCaseId, "juryCaseId");
  const authUser = await requireAdminUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateResolveJuryCasePayload,
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
      data: stored.responseBody as ResolveJuryCaseResponse,
    };
  }

  const row = await callResolveJuryCaseRpc(
    serviceClient,
    authUser.id,
    validatedCaseId,
    envelope.payload,
  );
  const data = mapResolveJuryCaseResponse(row);
  await insertAdminAuditLog(
    request,
    serviceClient,
    authUser.id,
    "dispute.admin_resolved",
    data.juryCaseId,
    {
      ...data,
      adminNote: envelope.payload.adminNote,
    },
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

async function callFileDisputeRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
  payload: FileDisputePayload,
): Promise<FileDisputeRpcRow> {
  const { data, error } = await serviceClient.rpc<FileDisputeRpcRow[]>(
    "file_dispute_action",
    {
      p_user_id: userId,
      p_dare_id: dareId,
      p_reason: payload.reason,
      p_summary: payload.summary,
      p_evidence_object_ids: payload.evidenceObjectIds,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callResolveJuryCaseRpc(
  serviceClient: SupabaseActionClient,
  adminUserId: string,
  juryCaseId: string,
  payload: ResolveJuryCasePayload,
): Promise<ResolveJuryCaseRpcRow> {
  const { data, error } = await serviceClient.rpc<ResolveJuryCaseRpcRow[]>(
    "resolve_jury_case_admin_action",
    {
      p_admin_user_id: adminUserId,
      p_jury_case_id: juryCaseId,
      p_verdict: payload.verdict,
      p_admin_note: payload.adminNote,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapFileDisputeResponse(
  row: FileDisputeRpcRow,
): FileDisputeResponse {
  return {
    juryCaseId: row.jury_case_id,
    dareId: row.dare_id,
    status: row.status,
    dareStatus: row.dare_status,
    courtPhase: row.court_phase,
    opponentUserId: row.opponent_user_id,
    evidenceAId: row.evidence_a_id,
    evidenceBId: row.evidence_b_id,
  };
}

function mapResolveJuryCaseResponse(
  row: ResolveJuryCaseRpcRow,
): ResolveJuryCaseResponse {
  return {
    juryCaseId: row.jury_case_id,
    dareId: row.dare_id,
    status: row.status,
    verdict: row.verdict,
    dareStatus: row.dare_status,
    winnerId: row.winner_id,
    courtPhase: row.court_phase,
  };
}

async function insertDisputeNotification(
  serviceClient: SupabaseActionClient,
  dispute: FileDisputeResponse,
): Promise<void> {
  const { error } = await serviceClient.from("notifications").insert({
    user_id: dispute.opponentUserId,
    type: "dispute_filed",
    title: "Dispute filed",
    body: "A dispute was filed for this DARE.",
    action: {
      type: "jury_case",
      dareId: dispute.dareId,
      juryCaseId: dispute.juryCaseId,
    },
  });
  if (error) throw mapDareQueryError(error);
}

async function insertDisputeAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  action: string,
  juryCaseId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action,
    target_type: "jury_case",
    target_id: juryCaseId,
    metadata,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}

async function insertAdminAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  adminUserId: string,
  action: string,
  juryCaseId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: adminUserId,
    actor_type: "admin",
    action,
    target_type: "jury_case",
    target_id: juryCaseId,
    metadata,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
