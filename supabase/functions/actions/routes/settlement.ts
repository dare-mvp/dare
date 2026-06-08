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
import { firstForwardedIp } from "../_shared/request.ts";
import { mapDareQueryError } from "./dare_errors.ts";

type CompleteDareRpcRow = {
  dare_id: string;
  status: "completed" | "settled";
  winner_id: string | null;
  score_a: number;
  score_b: number;
  phase: string;
  completed_at: string | null;
  dispute_deadline_at: string | null;
};

type SettleDareRpcRow = {
  dare_id: string;
  status: "settled";
  winner_id: string | null;
  payout_amount: number;
  refunded_amount: number;
  ledger_entries_created: number;
};

type CompleteDareResponse = {
  dareId: string;
  status: "completed" | "settled";
  winnerId: string | null;
  scoreA: number;
  scoreB: number;
  phase: string;
  completedAt: string | null;
  disputeDeadlineAt: string | null;
};

type SettleDareResponse = {
  dareId: string;
  status: "settled";
  winnerId: string | null;
  payoutAmount: number;
  refundedAmount: number;
  ledgerEntriesCreated: number;
};

export async function completeDare(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: CompleteDareResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    dareId: validatedDareId,
    action: "complete",
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
      data: stored.responseBody as CompleteDareResponse,
    };
  }

  const row = await callCompleteRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
  );
  const data = mapCompleteDareResponse(row);
  await insertAuditLog(
    request,
    serviceClient,
    authUser.id,
    "dare.completed",
    data.dareId,
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

export async function settleDare(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: SettleDareResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    dareId: validatedDareId,
    action: "settle",
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
      data: stored.responseBody as SettleDareResponse,
    };
  }

  const row = await callSettleRpc(serviceClient, authUser.id, validatedDareId);
  const data = mapSettleDareResponse(row);
  await insertAuditLog(
    request,
    serviceClient,
    authUser.id,
    "dare.settled",
    data.dareId,
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

async function callCompleteRpc(
  serviceClient: SupabaseActionClient,
  actorId: string,
  dareId: string,
): Promise<CompleteDareRpcRow> {
  const { data, error } = await serviceClient.rpc<CompleteDareRpcRow[]>(
    "complete_dare_action",
    { p_actor_user_id: actorId, p_dare_id: dareId },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callSettleRpc(
  serviceClient: SupabaseActionClient,
  actorId: string,
  dareId: string,
): Promise<SettleDareRpcRow> {
  const { data, error } = await serviceClient.rpc<SettleDareRpcRow[]>(
    "settle_dare_action",
    { p_actor_user_id: actorId, p_dare_id: dareId },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapCompleteDareResponse(
  row: CompleteDareRpcRow,
): CompleteDareResponse {
  return {
    dareId: row.dare_id,
    status: row.status,
    winnerId: row.winner_id,
    scoreA: row.score_a,
    scoreB: row.score_b,
    phase: row.phase,
    completedAt: row.completed_at,
    disputeDeadlineAt: row.dispute_deadline_at,
  };
}

function mapSettleDareResponse(row: SettleDareRpcRow): SettleDareResponse {
  return {
    dareId: row.dare_id,
    status: row.status,
    winnerId: row.winner_id,
    payoutAmount: row.payout_amount,
    refundedAmount: row.refunded_amount,
    ledgerEntriesCreated: row.ledger_entries_created,
  };
}

async function insertAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  action: string,
  dareId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action,
    target_type: "dare",
    target_id: dareId,
    metadata,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
