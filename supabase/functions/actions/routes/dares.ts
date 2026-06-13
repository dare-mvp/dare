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
import {
  insertAcceptAuditLog,
  insertAcceptNotification,
  insertCreateAuditLog,
  maybeNotifyTarget,
} from "./dare_side_effects.ts";
import {
  type CreateDarePayload,
  validateCreateDarePayload,
} from "./dare_validation.ts";

type CreateDareRpcRow = {
  dare_id: string;
  constitution_id: string;
  escrow_hold_id: string;
  ledger_entry_id: string;
  status: "open" | "targeted_pending";
  dare_type: "skill" | "task";
  funding_model: "two_sided_stake" | "darer_reward";
  stake_amount: number;
  reward_amount: number;
  escrow_amount: number;
  currency: "NGN";
  challenger_id: string | null;
};

type AcceptDareRpcRow = {
  dare_id: string;
  court_session_id: string;
  escrow_hold_id: string | null;
  ledger_entry_id: string | null;
  status: "ready_check";
  dare_type: "skill" | "task";
  funding_model: "two_sided_stake" | "darer_reward";
  stake_amount: number;
  reward_amount: number;
  escrow_amount: number;
  currency: "NGN";
};

type CancelDareRpcRow = {
  dare_id: string;
  status: "cancelled";
  escrow_hold_id: string;
  release_ledger_entry_id: string;
  refunded_amount: number;
  currency: "NGN";
};

export type CreateDareResponse = {
  dareId: string;
  constitutionId: string;
  issuerEscrowHoldId: string;
  issuerLedgerEntryId: string;
  status: "open" | "targeted_pending";
  dareType: "skill" | "task";
  fundingModel: "two_sided_stake" | "darer_reward";
  stakeAmount: number;
  rewardAmount: number;
  escrowAmount: number;
  currency: "NGN";
  challengerId: string | null;
};

export type AcceptDareResponse = {
  dareId: string;
  courtSessionId: string;
  challengerEscrowHoldId: string | null;
  challengerLedgerEntryId: string | null;
  status: "ready_check";
  dareType: "skill" | "task";
  fundingModel: "two_sided_stake" | "darer_reward";
  stakeAmount: number;
  rewardAmount: number;
  escrowAmount: number;
  currency: "NGN";
};

export type CancelDareResponse = {
  dareId: string;
  status: "cancelled";
  issuerEscrowHoldId: string;
  releaseLedgerEntryId: string;
  refundedAmount: number;
  currency: "NGN";
};

export async function createDare(
  request: Request,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: CreateDareResponse }> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateCreateDarePayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody(envelope.payload);
  const stored = await checkIdempotency(
    keyHash,
    bodyHash,
    authUser.id,
    serviceClient,
  );

  if (stored) {
    return {
      requestId: envelope.requestId,
      data: stored.responseBody as CreateDareResponse,
    };
  }

  const rpcRow = await callCreateDareRpc(
    serviceClient,
    authUser.id,
    envelope.payload,
    `create_dare:${keyHash}:issuer`,
  );
  const data = mapCreateDareResponse(rpcRow);
  await insertCreateAuditLog(request, serviceClient, authUser.id, data);
  await maybeNotifyTarget(serviceClient, data, envelope.payload);
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

export async function acceptDare(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: AcceptDareResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({ dareId: validatedDareId });
  const stored = await checkIdempotency(
    keyHash,
    bodyHash,
    authUser.id,
    serviceClient,
  );

  if (stored) {
    return {
      requestId: envelope.requestId,
      data: stored.responseBody as AcceptDareResponse,
    };
  }

  const rpcRow = await callAcceptDareRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    `accept_dare:${keyHash}:challenger`,
  );
  const data = mapAcceptDareResponse(rpcRow);
  await insertAcceptAuditLog(request, serviceClient, authUser.id, data);
  await insertAcceptNotification(serviceClient, authUser.id, data);
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

export async function cancelDare(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: CancelDareResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    dareId: validatedDareId,
    action: "cancel",
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
      data: stored.responseBody as CancelDareResponse,
    };
  }

  const row = await callCancelDareRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    `cancel_dare:${keyHash}:issuer`,
  );
  const data = mapCancelDareResponse(row);
  await insertCancelAuditLog(request, serviceClient, authUser.id, data);
  await insertCancelNotification(serviceClient, authUser.id, data);
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

async function callCreateDareRpc(
  serviceClient: SupabaseActionClient,
  issuerId: string,
  payload: CreateDarePayload,
  ledgerKey: string,
): Promise<CreateDareRpcRow> {
  const { data, error } = await serviceClient.rpc<CreateDareRpcRow[]>(
    "create_dare_action",
    {
      p_issuer_id: issuerId,
      p_title: payload.title,
      p_description: payload.description ?? null,
      p_category: payload.category,
      p_dare_type: payload.dareType,
      p_resolution_type: payload.resolutionType,
      p_stake_amount: payload.stakeAmount,
      p_reward_amount: payload.rewardAmount ?? 0,
      p_currency: payload.currency,
      p_duration_seconds: payload.durationSeconds,
      p_target_username: payload.targetUsername ?? null,
      p_constitution_test: payload.constitution.test,
      p_constitution_rules: payload.constitution.rules,
      p_constitution_proof_method: payload.constitution.proofMethod ?? null,
      p_constitution_edge_cases: payload.constitution.edgeCases ?? null,
      p_answer_key_text: payload.constitution.answerKey ?? null,
      p_answer_key_rules: payload.constitution.answerKeyRules ?? null,
      p_ledger_idempotency_key: ledgerKey,
    },
  );

  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callAcceptDareRpc(
  serviceClient: SupabaseActionClient,
  challengerId: string,
  dareId: string,
  ledgerKey: string,
): Promise<AcceptDareRpcRow> {
  const { data, error } = await serviceClient.rpc<AcceptDareRpcRow[]>(
    "accept_dare_action",
    {
      p_challenger_id: challengerId,
      p_dare_id: dareId,
      p_ledger_idempotency_key: ledgerKey,
    },
  );

  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callCancelDareRpc(
  serviceClient: SupabaseActionClient,
  actorId: string,
  dareId: string,
  ledgerKey: string,
): Promise<CancelDareRpcRow> {
  const { data, error } = await serviceClient.rpc<CancelDareRpcRow[]>(
    "cancel_dare_action",
    {
      p_actor_user_id: actorId,
      p_dare_id: dareId,
      p_ledger_idempotency_key: ledgerKey,
    },
  );

  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapCreateDareResponse(row: CreateDareRpcRow): CreateDareResponse {
  return {
    dareId: row.dare_id,
    constitutionId: row.constitution_id,
    issuerEscrowHoldId: row.escrow_hold_id,
    issuerLedgerEntryId: row.ledger_entry_id,
    status: row.status,
    dareType: row.dare_type,
    fundingModel: row.funding_model,
    stakeAmount: row.stake_amount,
    rewardAmount: row.reward_amount,
    escrowAmount: row.escrow_amount,
    currency: row.currency,
    challengerId: row.challenger_id,
  };
}

function mapAcceptDareResponse(row: AcceptDareRpcRow): AcceptDareResponse {
  return {
    dareId: row.dare_id,
    courtSessionId: row.court_session_id,
    challengerEscrowHoldId: row.escrow_hold_id,
    challengerLedgerEntryId: row.ledger_entry_id,
    status: row.status,
    dareType: row.dare_type,
    fundingModel: row.funding_model,
    stakeAmount: row.stake_amount,
    rewardAmount: row.reward_amount,
    escrowAmount: row.escrow_amount,
    currency: row.currency,
  };
}

function mapCancelDareResponse(row: CancelDareRpcRow): CancelDareResponse {
  return {
    dareId: row.dare_id,
    status: row.status,
    issuerEscrowHoldId: row.escrow_hold_id,
    releaseLedgerEntryId: row.release_ledger_entry_id,
    refundedAmount: row.refunded_amount,
    currency: row.currency,
  };
}

async function insertCancelAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  dare: CancelDareResponse,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action: "dare.cancelled",
    target_type: "dare",
    target_id: dare.dareId,
    metadata: dare,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}

async function insertCancelNotification(
  serviceClient: SupabaseActionClient,
  userId: string,
  dare: CancelDareResponse,
): Promise<void> {
  const { error } = await serviceClient.from("notifications").insert({
    user_id: userId,
    type: "system",
    title: "DARE cancelled",
    body: "Your stake has been returned to your wallet.",
    action: { type: "dare", dareId: dare.dareId },
  });
  if (error) throw mapDareQueryError(error);
}
