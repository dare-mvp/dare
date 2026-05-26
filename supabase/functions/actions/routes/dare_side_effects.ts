import { firstForwardedIp } from "../_shared/request.ts";
import { type SupabaseActionClient } from "../_shared/supabase.ts";
import { mapDareQueryError } from "./dare_errors.ts";
import { type CreateDarePayload } from "./dare_validation.ts";
import { type AcceptDareResponse, type CreateDareResponse } from "./dares.ts";

export async function maybeNotifyTarget(
  serviceClient: SupabaseActionClient,
  dare: CreateDareResponse,
  payload: CreateDarePayload,
): Promise<void> {
  if (!dare.challengerId) return;

  const { error } = await serviceClient.from("notifications").insert({
    user_id: dare.challengerId,
    type: "dare_received",
    title: "DARE received",
    body: payload.title,
    action: { type: "dare", dareId: dare.dareId },
  });
  if (error) throw mapDareQueryError(error);
}

export async function insertAcceptNotification(
  serviceClient: SupabaseActionClient,
  accepterId: string,
  dare: AcceptDareResponse,
): Promise<void> {
  const { data: dareRow, error: dareError } = await serviceClient
    .from<{ challenger_id: string | null; issuer_id: string; title: string }>(
      "dares",
    )
    .select("issuer_id,challenger_id,title")
    .eq("id", dare.dareId)
    .maybeSingle();
  if (dareError) throw mapDareQueryError(dareError);
  if (!dareRow) return;

  const participantIds = [
    dareRow.issuer_id,
    dareRow.challenger_id,
  ].filter((id): id is string => Boolean(id));
  const rows = participantIds.map((userId) => ({
    user_id: userId,
    type: "court_starting",
    title: userId === accepterId ? "Court is ready" : "Opponent accepted",
    body: userId === accepterId
      ? "The DARE is ready for both players."
      : `${dareRow.title} is ready. Open the court and ready up.`,
    action: {
      type: "dare",
      dareId: dare.dareId,
      courtSessionId: dare.courtSessionId,
    },
  }));

  const { error } = await (serviceClient.from("notifications") as any)
    .insert(rows);
  if (error) throw mapDareQueryError(error);
}

export async function insertCreateAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  dare: CreateDareResponse,
): Promise<void> {
  await insertAuditLog(
    request,
    serviceClient,
    userId,
    "dare.created",
    dare.dareId,
    {
      stakeAmount: dare.stakeAmount,
      currency: dare.currency,
      status: dare.status,
      challengerId: dare.challengerId,
    },
  );
}

export async function insertAcceptAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  dare: AcceptDareResponse,
): Promise<void> {
  await insertAuditLog(
    request,
    serviceClient,
    userId,
    "dare.accepted",
    dare.dareId,
    {
      stakeAmount: dare.stakeAmount,
      currency: dare.currency,
      courtSessionId: dare.courtSessionId,
    },
  );
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
