import { requireAdminUser } from "../_shared/auth.ts";
import { parseActionEnvelope } from "../_shared/envelope.ts";
import { ActionError } from "../_shared/errors.ts";
import {
  checkIdempotency,
  hashBody,
  hashIdempotencyKey,
  storeIdempotencyResult,
} from "../_shared/idempotency.ts";
import { firstForwardedIp } from "../_shared/request.ts";
import { type SupabaseActionClient } from "../_shared/supabase.ts";
import {
  assertRecord,
  assertString,
  assertUuid,
} from "../_shared/validation.ts";
import { mapDareQueryError } from "./dare_errors.ts";

type AdminReasonPayload = {
  reason: string;
};

type ApproveWithdrawalRpcRow = {
  withdrawal_request_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: "approved" | "processing" | "completed";
  provider: string | null;
  provider_transfer_reference: string | null;
  processed_at: string | null;
};

type RejectWithdrawalRpcRow = {
  withdrawal_request_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: "rejected";
  failure_reason: string | null;
  processed_at: string | null;
};

type FreezeUserRpcRow = {
  user_id: string;
  account_status: "frozen";
  wallet_accounts_frozen: number;
  jury_opt_in: boolean;
  updated_at: string;
};

export type ApproveWithdrawalResponse = {
  withdrawalRequestId: string;
  userId: string;
  amount: number;
  currency: string;
  status: "approved" | "processing" | "completed";
  provider: string | null;
  providerTransferReference: string | null;
  processedAt: string | null;
};

export type RejectWithdrawalResponse = {
  withdrawalRequestId: string;
  userId: string;
  amount: number;
  currency: string;
  status: "rejected";
  failureReason: string | null;
  processedAt: string | null;
};

export type FreezeUserResponse = {
  userId: string;
  accountStatus: "frozen";
  walletAccountsFrozen: number;
  juryOptIn: boolean;
  updatedAt: string;
};

export async function approveWithdrawal(
  request: Request,
  withdrawalRequestId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: ApproveWithdrawalResponse }> {
  const validatedId = assertUuid(withdrawalRequestId, "withdrawalRequestId");
  const authUser = await requireAdminUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateAdminReasonPayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    withdrawalRequestId: validatedId,
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
      data: stored.responseBody as ApproveWithdrawalResponse,
    };
  }

  const row = await callApproveWithdrawalRpc(
    serviceClient,
    authUser.id,
    validatedId,
    envelope.payload.reason,
  );
  const data = mapApproveWithdrawalResponse(row);
  await insertAdminAuditLog(
    request,
    serviceClient,
    authUser.id,
    "wallet.withdrawal_approved",
    "withdrawal_request",
    data.withdrawalRequestId,
    { ...data, reason: envelope.payload.reason },
  );
  await insertNotification(
    serviceClient,
    data.userId,
    "Withdrawal approved",
    "Your withdrawal was approved and is queued for provider transfer.",
    {
      type: "withdrawal_request",
      withdrawalRequestId: data.withdrawalRequestId,
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

export async function rejectWithdrawal(
  request: Request,
  withdrawalRequestId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: RejectWithdrawalResponse }> {
  const validatedId = assertUuid(withdrawalRequestId, "withdrawalRequestId");
  const authUser = await requireAdminUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateAdminReasonPayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    withdrawalRequestId: validatedId,
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
      data: stored.responseBody as RejectWithdrawalResponse,
    };
  }

  const row = await callRejectWithdrawalRpc(
    serviceClient,
    authUser.id,
    validatedId,
    envelope.payload.reason,
  );
  const data = mapRejectWithdrawalResponse(row);
  await insertAdminAuditLog(
    request,
    serviceClient,
    authUser.id,
    "wallet.withdrawal_rejected",
    "withdrawal_request",
    data.withdrawalRequestId,
    { ...data, reason: envelope.payload.reason },
  );
  await insertNotification(
    serviceClient,
    data.userId,
    "Withdrawal rejected",
    "Your withdrawal request was rejected after review.",
    {
      type: "withdrawal_request",
      withdrawalRequestId: data.withdrawalRequestId,
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

export async function freezeUser(
  request: Request,
  userId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: FreezeUserResponse }> {
  const targetUserId = assertUuid(userId, "userId");
  const authUser = await requireAdminUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateAdminReasonPayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    userId: targetUserId,
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
      data: stored.responseBody as FreezeUserResponse,
    };
  }

  const row = await callFreezeUserRpc(
    serviceClient,
    authUser.id,
    targetUserId,
    envelope.payload.reason,
  );
  const data = mapFreezeUserResponse(row);
  await insertAdminAuditLog(
    request,
    serviceClient,
    authUser.id,
    "user.frozen",
    "profile",
    data.userId,
    { ...data, reason: envelope.payload.reason },
  );
  await insertNotification(
    serviceClient,
    data.userId,
    "Account frozen",
    "Your account has been frozen while an admin review is in progress.",
    { type: "account_status", status: data.accountStatus },
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

function validateAdminReasonPayload(value: unknown): AdminReasonPayload {
  const payload = assertRecord(value, "payload");
  return {
    reason: assertString(payload.reason, "payload.reason", {
      min: 5,
      max: 1000,
    }),
  };
}

async function callApproveWithdrawalRpc(
  serviceClient: SupabaseActionClient,
  adminUserId: string,
  withdrawalRequestId: string,
  reason: string,
): Promise<ApproveWithdrawalRpcRow> {
  const { data, error } = await serviceClient.rpc<ApproveWithdrawalRpcRow[]>(
    "approve_withdrawal_admin_action",
    {
      p_admin_user_id: adminUserId,
      p_withdrawal_request_id: withdrawalRequestId,
      p_admin_note: reason,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callRejectWithdrawalRpc(
  serviceClient: SupabaseActionClient,
  adminUserId: string,
  withdrawalRequestId: string,
  reason: string,
): Promise<RejectWithdrawalRpcRow> {
  const { data, error } = await serviceClient.rpc<RejectWithdrawalRpcRow[]>(
    "reject_withdrawal_admin_action",
    {
      p_admin_user_id: adminUserId,
      p_withdrawal_request_id: withdrawalRequestId,
      p_admin_note: reason,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callFreezeUserRpc(
  serviceClient: SupabaseActionClient,
  adminUserId: string,
  userId: string,
  reason: string,
): Promise<FreezeUserRpcRow> {
  const { data, error } = await serviceClient.rpc<FreezeUserRpcRow[]>(
    "freeze_user_admin_action",
    {
      p_admin_user_id: adminUserId,
      p_target_user_id: userId,
      p_admin_note: reason,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapApproveWithdrawalResponse(
  row: ApproveWithdrawalRpcRow,
): ApproveWithdrawalResponse {
  return {
    withdrawalRequestId: row.withdrawal_request_id,
    userId: row.user_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    providerTransferReference: row.provider_transfer_reference,
    processedAt: row.processed_at,
  };
}

function mapRejectWithdrawalResponse(
  row: RejectWithdrawalRpcRow,
): RejectWithdrawalResponse {
  return {
    withdrawalRequestId: row.withdrawal_request_id,
    userId: row.user_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    failureReason: row.failure_reason,
    processedAt: row.processed_at,
  };
}

function mapFreezeUserResponse(row: FreezeUserRpcRow): FreezeUserResponse {
  return {
    userId: row.user_id,
    accountStatus: row.account_status,
    walletAccountsFrozen: row.wallet_accounts_frozen,
    juryOptIn: row.jury_opt_in,
    updatedAt: row.updated_at,
  };
}

async function insertNotification(
  serviceClient: SupabaseActionClient,
  userId: string,
  title: string,
  body: string,
  action: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("notifications").insert({
    user_id: userId,
    type: "system",
    title,
    body,
    action,
  });
  if (error) throw mapDareQueryError(error);
}

async function insertAdminAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  adminUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: adminUserId,
    actor_type: "admin",
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
