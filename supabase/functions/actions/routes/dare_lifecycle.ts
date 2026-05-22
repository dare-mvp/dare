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

type ForfeitDareRpcRow = {
  dare_id: string;
  status: "forfeited";
  forfeiter_id: string;
  winner_id: string;
  court_phase: "forfeited";
  completed_at: string;
};

export type ForfeitDareResponse = {
  dareId: string;
  status: "forfeited";
  forfeiterId: string;
  winnerId: string;
  courtPhase: "forfeited";
  completedAt: string;
};

export async function forfeitDare(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: ForfeitDareResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    dareId: validatedDareId,
    action: "forfeit",
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
      data: stored.responseBody as ForfeitDareResponse,
    };
  }

  const row = await callForfeitDareRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
  );
  const data = mapForfeitDareResponse(row);
  await insertAuditLog(request, serviceClient, authUser.id, data);
  await insertForfeitNotifications(serviceClient, data);
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

async function callForfeitDareRpc(
  serviceClient: SupabaseActionClient,
  actorId: string,
  dareId: string,
): Promise<ForfeitDareRpcRow> {
  const { data, error } = await serviceClient.rpc<ForfeitDareRpcRow[]>(
    "forfeit_dare_action",
    { p_actor_user_id: actorId, p_dare_id: dareId },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapForfeitDareResponse(row: ForfeitDareRpcRow): ForfeitDareResponse {
  return {
    dareId: row.dare_id,
    status: row.status,
    forfeiterId: row.forfeiter_id,
    winnerId: row.winner_id,
    courtPhase: row.court_phase,
    completedAt: row.completed_at,
  };
}

async function insertAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  data: ForfeitDareResponse,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action: "dare.forfeited",
    target_type: "dare",
    target_id: data.dareId,
    metadata: data,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}

async function insertForfeitNotifications(
  serviceClient: SupabaseActionClient,
  data: ForfeitDareResponse,
): Promise<void> {
  const rows = [
    {
      user_id: data.forfeiterId,
      type: "match_result",
      title: "DARE forfeited",
      body: "You forfeited this DARE.",
      action: { type: "dare", dareId: data.dareId },
    },
    {
      user_id: data.winnerId,
      type: "match_result",
      title: "Opponent forfeited",
      body: "This DARE is ready for settlement.",
      action: { type: "dare", dareId: data.dareId },
    },
  ];

  await Promise.all(rows.map(async (row) => {
    const { error } = await serviceClient.from("notifications").insert(row);
    if (error) throw mapDareQueryError(error);
  }));
}
