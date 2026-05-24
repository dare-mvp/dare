import { ActionError } from "../_shared/errors.ts";
import {
  createServiceClient,
  type SupabaseActionClient,
  type SupabaseQueryError,
} from "../_shared/supabase.ts";

type WithdrawalProcessorDependencies = {
  createServiceClient: () => SupabaseActionClient;
  getPaystackSecret: () => string | undefined;
  getProcessorSecret: () => string | undefined;
  paystackClient?: PaystackTransferClient;
};

type PaystackTransferClient = {
  createRecipient(
    params: CreateRecipientParams,
  ): Promise<CreateRecipientResult>;
  initiateTransfer(
    params: InitiateTransferParams,
  ): Promise<InitiateTransferResult>;
};

type CreateRecipientParams = {
  secretKey: string;
  name: string;
  accountNumber: string;
  bankCode: string;
  currency: string;
  withdrawalRequestId: string;
};

type CreateRecipientResult = {
  recipientCode: string;
  raw: unknown;
};

type InitiateTransferParams = {
  secretKey: string;
  amount: number;
  currency: string;
  recipientCode: string;
  reference: string;
  reason: string;
};

type InitiateTransferResult = {
  reference: string;
  status: string;
  raw: unknown;
};

type ClaimedWithdrawalRow = {
  withdrawal_request_id: string;
  user_id: string;
  wallet_account_id: string;
  amount: number;
  currency: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  provider_recipient_code: string | null;
  provider_transfer_reference: string;
  retry_count: number;
};

type ProcessorResult = {
  claimed: number;
  initiated: number;
  failed: number;
  results: Array<{
    withdrawalRequestId: string;
    status: "initiated" | "failed";
    reference: string;
    providerStatus?: string;
    error?: string;
  }>;
};

const DEFAULT_BATCH_LIMIT = 10;

const defaultDependencies: WithdrawalProcessorDependencies = {
  createServiceClient,
  getPaystackSecret: () => Deno.env.get("PAYSTACK_SECRET_KEY"),
  getProcessorSecret: () => Deno.env.get("WITHDRAWAL_PROCESSOR_SECRET"),
  paystackClient: undefined,
};

export function createWithdrawalProcessorHandler(
  dependencies: WithdrawalProcessorDependencies = defaultDependencies,
): (request: Request) => Promise<Response> {
  return async function withdrawalProcessorHandler(
    request: Request,
  ): Promise<Response> {
    if (request.method !== "POST") {
      return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
    }

    try {
      assertAuthorized(request, dependencies.getProcessorSecret());
      const secretKey = requireSecret(
        dependencies.getPaystackSecret(),
        "PAYSTACK_SECRET_KEY",
      );
      const payload = await parseRequestPayload(request);
      const client = dependencies.createServiceClient();
      const paystackClient = dependencies.paystackClient ??
        defaultPaystackTransferClient;

      const result = await processWithdrawals(
        client,
        paystackClient,
        secretKey,
        payload.limit,
      );

      return json({ ok: true, data: result });
    } catch (error) {
      const actionError = error instanceof ActionError
        ? error
        : new ActionError("INTERNAL_ERROR", { cause: error });
      return json(
        {
          ok: false,
          error: {
            code: actionError.code,
            message: actionError.message,
          },
        },
        actionError.status,
      );
    }
  };
}

export const handler = createWithdrawalProcessorHandler();

async function processWithdrawals(
  client: SupabaseActionClient,
  paystackClient: PaystackTransferClient,
  secretKey: string,
  limit: number,
): Promise<ProcessorResult> {
  const withdrawals = await claimWithdrawals(client, limit);
  const result: ProcessorResult = {
    claimed: withdrawals.length,
    initiated: 0,
    failed: 0,
    results: [],
  };

  for (const withdrawal of withdrawals) {
    try {
      const recipientCode = withdrawal.provider_recipient_code ??
        (await createRecipient(client, paystackClient, secretKey, withdrawal));

      await insertPaymentTransaction(client, withdrawal, {
        source: "withdrawal_processor",
      });

      const transfer = await paystackClient.initiateTransfer({
        secretKey,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        recipientCode,
        reference: withdrawal.provider_transfer_reference,
        reason: `DARE withdrawal ${withdrawal.withdrawal_request_id}`,
      });

      if (transfer.reference !== withdrawal.provider_transfer_reference) {
        throw new ActionError("PROVIDER_UNAVAILABLE", {
          message: "Paystack returned a mismatched transfer reference.",
        });
      }

      if (transfer.status === "otp") {
        await markWithdrawalFailed(
          client,
          withdrawal.withdrawal_request_id,
          "paystack_transfer_requires_otp",
        );
        result.failed += 1;
        result.results.push({
          withdrawalRequestId: withdrawal.withdrawal_request_id,
          status: "failed",
          reference: withdrawal.provider_transfer_reference,
          providerStatus: transfer.status,
          error: "paystack_transfer_requires_otp",
        });
        continue;
      }

      await updatePaymentTransaction(
        client,
        withdrawal.provider_transfer_reference,
        "provider_pending",
        transfer.raw,
      );
      result.initiated += 1;
      result.results.push({
        withdrawalRequestId: withdrawal.withdrawal_request_id,
        status: "initiated",
        reference: withdrawal.provider_transfer_reference,
        providerStatus: transfer.status,
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "withdrawal_processing_failed";
      await markWithdrawalFailed(
        client,
        withdrawal.withdrawal_request_id,
        message,
      );
      result.failed += 1;
      result.results.push({
        withdrawalRequestId: withdrawal.withdrawal_request_id,
        status: "failed",
        reference: withdrawal.provider_transfer_reference,
        error: message,
      });
    }
  }

  return result;
}

async function claimWithdrawals(
  client: SupabaseActionClient,
  limit: number,
): Promise<ClaimedWithdrawalRow[]> {
  const { data, error } = await client.rpc<ClaimedWithdrawalRow[]>(
    "claim_paystack_withdrawals",
    { p_limit: limit },
  );

  if (error) throw mapQueryError(error);
  return data ?? [];
}

async function createRecipient(
  client: SupabaseActionClient,
  paystackClient: PaystackTransferClient,
  secretKey: string,
  withdrawal: ClaimedWithdrawalRow,
): Promise<string> {
  const recipient = await paystackClient.createRecipient({
    secretKey,
    name: withdrawal.account_name,
    accountNumber: withdrawal.account_number,
    bankCode: withdrawal.bank_code,
    currency: withdrawal.currency,
    withdrawalRequestId: withdrawal.withdrawal_request_id,
  });

  await updateWithdrawalRequest(client, withdrawal.withdrawal_request_id, {
    provider_recipient_code: recipient.recipientCode,
  });
  return recipient.recipientCode;
}

async function insertPaymentTransaction(
  client: SupabaseActionClient,
  withdrawal: ClaimedWithdrawalRow,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from("payment_transactions").insert({
    user_id: withdrawal.user_id,
    provider: "paystack",
    provider_reference: withdrawal.provider_transfer_reference,
    type: "withdrawal",
    amount: withdrawal.amount,
    currency: withdrawal.currency,
    status: "provider_pending",
    raw_provider_payload: metadata,
  });

  if (error && error.code !== "23505") {
    throw mapQueryError(error);
  }
}

async function updatePaymentTransaction(
  client: SupabaseActionClient,
  reference: string,
  status: string,
  rawProviderPayload: unknown,
): Promise<void> {
  const { error } = await client.from("payment_transactions")
    .update({
      status,
      raw_provider_payload: rawProviderPayload,
    })
    .eq("provider", "paystack")
    .eq("provider_reference", reference)
    .select("id")
    .maybeSingle();

  if (error) throw mapQueryError(error);
}

async function updateWithdrawalRequest(
  client: SupabaseActionClient,
  withdrawalRequestId: string,
  values: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from("withdrawal_requests")
    .update(values)
    .eq("id", withdrawalRequestId)
    .select("id")
    .maybeSingle();

  if (error) throw mapQueryError(error);
}

async function markWithdrawalFailed(
  client: SupabaseActionClient,
  withdrawalRequestId: string,
  reason: string,
): Promise<void> {
  await updateWithdrawalRequest(client, withdrawalRequestId, {
    status: "failed",
    processed_at: new Date().toISOString(),
    failure_reason: reason.slice(0, 500),
  });
}

const defaultPaystackTransferClient: PaystackTransferClient = {
  createRecipient: async (params) => {
    const body = await paystackJsonRequest(
      params.secretKey,
      "https://api.paystack.co/transferrecipient",
      {
        type: "nuban",
        name: params.name,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: params.currency,
        metadata: {
          withdrawal_request_id: params.withdrawalRequestId,
        },
      },
    );
    const data = assertRecord(body.data, "paystack.data");
    return {
      recipientCode: requireString(
        data.recipient_code,
        "paystack.data.recipient_code",
      ),
      raw: body,
    };
  },
  initiateTransfer: async (params) => {
    const body = await paystackJsonRequest(
      params.secretKey,
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount: params.amount,
        currency: params.currency,
        recipient: params.recipientCode,
        reference: params.reference,
        reason: params.reason,
      },
    );
    const data = assertRecord(body.data, "paystack.data");
    return {
      reference: requireString(data.reference, "paystack.data.reference"),
      status: requireString(data.status, "paystack.data.status"),
      raw: body,
    };
  },
};

async function paystackJsonRequest(
  secretKey: string,
  url: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const abort = new AbortController();
  const timeoutId = setTimeout(() => abort.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      signal: abort.signal,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new ActionError("PROVIDER_UNAVAILABLE", { cause: error });
  } finally {
    clearTimeout(timeoutId);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new ActionError("PROVIDER_UNAVAILABLE", { cause: error });
  }

  const record = assertRecord(body, "paystack");
  if (!response.ok || record.status !== true) {
    throw new ActionError("PROVIDER_UNAVAILABLE", {
      message: typeof record.message === "string"
        ? record.message
        : "Paystack transfer request failed.",
      details: { status: response.status },
    });
  }

  return record;
}

function assertAuthorized(
  request: Request,
  configuredSecret: string | undefined,
) {
  const secret = requireSecret(
    configuredSecret,
    "WITHDRAWAL_PROCESSOR_SECRET",
  );
  const bearer = request.headers.get("authorization")?.replace(
    /^Bearer\s+/i,
    "",
  );
  const jobSecret = request.headers.get("x-dare-job-secret");

  if (bearer !== secret && jobSecret !== secret) {
    throw new ActionError("UNAUTHENTICATED", {
      message: "Invalid withdrawal processor secret.",
    });
  }
}

async function parseRequestPayload(
  request: Request,
): Promise<{ limit: number }> {
  if (!request.body) return { limit: DEFAULT_BATCH_LIMIT };
  const rawBody = await request.text();
  if (!rawBody.trim()) return { limit: DEFAULT_BATCH_LIMIT };

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    throw new ActionError("VALIDATION_FAILED", {
      message: "Request body must be valid JSON.",
      cause: error,
    });
  }

  if (
    typeof payload !== "object" || payload === null || Array.isArray(payload)
  ) {
    throw new ActionError("VALIDATION_FAILED");
  }

  const limit: unknown = (payload as { limit?: unknown }).limit;
  if (limit === undefined) return { limit: DEFAULT_BATCH_LIMIT };
  if (
    typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 ||
    limit > 50
  ) {
    throw new ActionError("VALIDATION_FAILED", {
      message: "limit must be an integer between 1 and 50.",
    });
  }

  return { limit };
}

function requireSecret(value: string | undefined, name: string): string {
  if (!value) {
    throw new ActionError("INTERNAL_ERROR", {
      message: `${name} is not configured.`,
    });
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ActionError("PROVIDER_UNAVAILABLE", {
      message: `${path} must be a non-empty string.`,
    });
  }
  return value.trim();
}

function assertRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ActionError("PROVIDER_UNAVAILABLE", {
      message: `${path} must be an object.`,
    });
  }
  return value as Record<string, unknown>;
}

function mapQueryError(error: SupabaseQueryError): ActionError {
  return new ActionError("INTERNAL_ERROR", {
    message: "Database operation failed.",
    cause: error,
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
