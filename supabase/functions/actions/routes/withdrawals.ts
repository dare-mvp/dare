import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { parseActionEnvelope } from "../_shared/envelope.ts";
import { ActionError } from "../_shared/errors.ts";
import {
  checkIdempotency,
  hashBody,
  hashIdempotencyKey,
  storeIdempotencyResult,
} from "../_shared/idempotency.ts";
import { firstForwardedIp } from "../_shared/request.ts";
import {
  type SupabaseActionClient,
  type SupabaseQueryError,
} from "../_shared/supabase.ts";
import {
  validateWithdrawalPayload,
  type WithdrawalPayload,
} from "./withdrawal_validation.ts";

type ProfileRow = {
  id: string;
  account_status: string;
  risk_status: string;
  kyc_tier: string;
};

type WalletSummaryRow = {
  wallet_account_id: string;
  user_id: string;
  currency: string;
  account_status: string;
  available_balance: number;
  pending_withdrawal_balance: number;
};

type WithdrawalRpcRow = {
  withdrawal_request_id: string;
  ledger_entry_id: string;
  status: "pending";
  amount: number;
  currency: "NGN";
};

type WithdrawalResponse = {
  withdrawalRequestId: string;
  ledgerEntryId: string;
  amount: number;
  currency: "NGN";
  status: "pending";
};

export async function requestWithdrawal(
  request: Request,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: WithdrawalResponse }> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateWithdrawalPayload,
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
      data: stored.responseBody as WithdrawalResponse,
    };
  }

  const profile = await getProfile(client, authUser.id);
  assertProfileCanWithdraw(profile);

  const wallet = await getWalletSummary(
    client,
    authUser.id,
    envelope.payload.currency,
  );
  assertWalletCanWithdraw(wallet, envelope.payload.amount);

  const rpcRow = await createWithdrawalQueueItem(
    serviceClient,
    authUser.id,
    wallet.wallet_account_id,
    envelope.payload,
    `withdrawal:${keyHash}`,
  );
  const data = mapWithdrawalResponse(rpcRow);

  await insertNotification(serviceClient, authUser.id, data);
  await insertAuditLog(request, serviceClient, authUser.id, data, {
    amount: data.amount,
    currency: data.currency,
    destinationType: envelope.payload.destination.type,
    bankCode: envelope.payload.destination.bankCode,
  });
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

async function getProfile(
  client: SupabaseActionClient,
  userId: string,
): Promise<ProfileRow> {
  const { data, error } = await client.from<ProfileRow>("profiles")
    .select("id,account_status,risk_status,kyc_tier")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw mapQueryError(error);
  if (!data) {
    throw new ActionError("NOT_FOUND", { message: "Profile was not found." });
  }
  return data;
}

function assertProfileCanWithdraw(profile: ProfileRow): void {
  if (profile.account_status !== "active") {
    throw new ActionError("ACCOUNT_RESTRICTED");
  }

  if (!["normal", "watch"].includes(profile.risk_status)) {
    throw new ActionError("ACCOUNT_RESTRICTED");
  }

  if (profile.kyc_tier === "kyc0") {
    throw new ActionError("KYC_REQUIRED");
  }
}

async function getWalletSummary(
  client: SupabaseActionClient,
  userId: string,
  currency: string,
): Promise<WalletSummaryRow> {
  const { data, error } = await client.from<WalletSummaryRow>("wallet_summary")
    .select(
      "wallet_account_id,user_id,currency,account_status,available_balance,pending_withdrawal_balance",
    )
    .eq("user_id", userId)
    .eq("currency", currency)
    .maybeSingle();

  if (error) throw mapQueryError(error);
  if (!data) {
    throw new ActionError("NOT_FOUND", { message: "Wallet was not found." });
  }
  return data;
}

function assertWalletCanWithdraw(
  wallet: WalletSummaryRow,
  amount: number,
): void {
  if (wallet.account_status !== "active") {
    throw new ActionError("ACCOUNT_RESTRICTED");
  }

  const withdrawable = wallet.available_balance -
    wallet.pending_withdrawal_balance;
  if (withdrawable < amount) {
    throw new ActionError("INSUFFICIENT_FUNDS");
  }
}

async function createWithdrawalQueueItem(
  serviceClient: SupabaseActionClient,
  userId: string,
  walletAccountId: string,
  payload: WithdrawalPayload,
  ledgerIdempotencyKey: string,
): Promise<WithdrawalRpcRow> {
  const { data, error } = await serviceClient.rpc<WithdrawalRpcRow[]>(
    "request_withdrawal",
    {
      p_user_id: userId,
      p_wallet_account_id: walletAccountId,
      p_amount: payload.amount,
      p_currency: payload.currency,
      p_bank_code: payload.destination.bankCode,
      p_account_number: payload.destination.accountNumberToken,
      p_account_name: payload.destination.accountName,
      p_ledger_idempotency_key: ledgerIdempotencyKey,
    },
  );

  if (error) throw mapQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapWithdrawalResponse(row: WithdrawalRpcRow): WithdrawalResponse {
  return {
    withdrawalRequestId: row.withdrawal_request_id,
    ledgerEntryId: row.ledger_entry_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
  };
}

async function insertNotification(
  serviceClient: SupabaseActionClient,
  userId: string,
  withdrawal: WithdrawalResponse,
): Promise<void> {
  const { error } = await serviceClient.from("notifications").insert({
    user_id: userId,
    type: "system",
    title: "Withdrawal requested",
    body: "Your withdrawal request is queued for review.",
    action: {
      type: "withdrawal_request",
      withdrawalRequestId: withdrawal.withdrawalRequestId,
    },
  });

  if (error) throw mapQueryError(error);
}

async function insertAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  withdrawal: WithdrawalResponse,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action: "wallet.withdrawal_requested",
    target_type: "withdrawal_request",
    target_id: withdrawal.withdrawalRequestId,
    metadata,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });

  if (error) throw mapQueryError(error);
}

function mapQueryError(error: SupabaseQueryError): ActionError {
  if (error.code === "42501") {
    return new ActionError("FORBIDDEN", { cause: error });
  }

  if (error.message === "insufficient_funds") {
    return new ActionError("INSUFFICIENT_FUNDS", { cause: error });
  }

  if (error.message === "wallet_not_found") {
    return new ActionError("NOT_FOUND", { cause: error });
  }

  if (error.message === "wallet_restricted") {
    return new ActionError("ACCOUNT_RESTRICTED", { cause: error });
  }

  if (error.code === "23505") {
    return new ActionError("IDEMPOTENCY_CONFLICT", { cause: error });
  }

  return new ActionError("INTERNAL_ERROR", {
    message: "Database operation failed.",
    cause: error,
  });
}
