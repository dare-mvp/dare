import { ActionError } from "../_shared/errors.ts";
import { firstForwardedIp } from "../_shared/request.ts";
import {
  createServiceClient,
  type SupabaseActionClient,
} from "../_shared/supabase.ts";

type WebhookDependencies = {
  createServiceClient: () => SupabaseActionClient;
  getSecret: () => string | undefined;
};

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
  };
};

type PaymentTransactionRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_reference: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
};

type WalletAccountRow = {
  id: string;
  user_id: string;
  currency: string;
  status: string;
};

const defaultDependencies: WebhookDependencies = {
  createServiceClient,
  getSecret: () => Deno.env.get("PAYSTACK_SECRET_KEY"),
};

export function createPaystackWebhookHandler(
  dependencies: WebhookDependencies = defaultDependencies,
): (request: Request) => Promise<Response> {
  return async function paystackWebhookHandler(
    request: Request,
  ): Promise<Response> {
    if (request.method !== "POST") {
      return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
    }

    try {
      const rawBody = await request.text();
      await verifySignature(
        rawBody,
        request.headers.get("x-paystack-signature"),
        dependencies.getSecret(),
      );

      const event = parsePaystackEvent(rawBody);
      if (event.event !== "charge.success") {
        return json({ ok: true, ignored: true, event: event.event ?? null });
      }

      const result = await processSuccessfulCharge(
        request,
        dependencies.createServiceClient(),
        event,
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

export const handler = createPaystackWebhookHandler();

async function verifySignature(
  rawBody: string,
  headerSignature: string | null,
  secret: string | undefined,
): Promise<void> {
  if (!secret) {
    throw new ActionError("INTERNAL_ERROR", {
      message: "PAYSTACK_SECRET_KEY is not configured.",
    });
  }

  if (!headerSignature) {
    throw new ActionError("UNAUTHENTICATED", {
      message: "Missing Paystack signature.",
    });
  }

  const expected = await hmacSha512Hex(rawBody, secret);
  if (!timingSafeEqual(expected, headerSignature.trim().toLowerCase())) {
    throw new ActionError("UNAUTHENTICATED", {
      message: "Invalid Paystack signature.",
    });
  }
}

async function hmacSha512Hex(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index++) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

function parsePaystackEvent(rawBody: string): PaystackEvent {
  try {
    const event = JSON.parse(rawBody);
    if (typeof event !== "object" || event === null || Array.isArray(event)) {
      throw new Error("invalid event object");
    }
    return event as PaystackEvent;
  } catch (error) {
    throw new ActionError("VALIDATION_FAILED", {
      message: "Webhook body must be valid JSON.",
      cause: error,
    });
  }
}

async function processSuccessfulCharge(
  request: Request,
  serviceClient: SupabaseActionClient,
  event: PaystackEvent,
): Promise<
  { reference: string; status: "verified_success" | "already_processed" }
> {
  const reference = requireEventString(event.data?.reference, "data.reference");
  const amount = requireEventNumber(event.data?.amount, "data.amount");
  const currency = requireEventString(event.data?.currency, "data.currency");
  const providerStatus = requireEventString(event.data?.status, "data.status");

  if (providerStatus !== "success") {
    throw new ActionError("INVALID_STATE", {
      message: "Paystack charge was not successful.",
    });
  }

  const transaction = await getPaymentTransaction(serviceClient, reference);
  assertTransactionMatches(transaction, amount, currency);

  if (transaction.status === "verified_success") {
    return { reference, status: "already_processed" };
  }

  if (!["initialized", "provider_pending"].includes(transaction.status)) {
    throw new ActionError("INVALID_STATE");
  }

  const wallet = await getWalletAccount(
    serviceClient,
    transaction.user_id,
    transaction.currency,
  );
  const ledgerKey = `paystack:${reference}:deposit_confirmed`;
  const existingLedger = await getLedgerEntry(serviceClient, ledgerKey);

  if (!existingLedger) {
    await insertLedgerEntry(serviceClient, wallet, transaction, ledgerKey);
  }

  await updatePaymentTransaction(serviceClient, transaction.id, event);
  await insertAuditLog(request, serviceClient, transaction, reference, event);

  return { reference, status: "verified_success" };
}

async function getPaymentTransaction(
  client: SupabaseActionClient,
  reference: string,
): Promise<PaymentTransactionRow> {
  const { data, error } = await client.from<PaymentTransactionRow>(
    "payment_transactions",
  )
    .select(
      "id,user_id,provider,provider_reference,type,amount,currency,status",
    )
    .eq("provider", "paystack")
    .eq("provider_reference", reference)
    .maybeSingle();

  if (error) throw new ActionError("INTERNAL_ERROR", { cause: error });
  if (!data) throw new ActionError("NOT_FOUND");
  return data;
}

function assertTransactionMatches(
  transaction: PaymentTransactionRow,
  amount: number,
  currency: string,
): void {
  if (transaction.type !== "deposit" || transaction.provider !== "paystack") {
    throw new ActionError("INVALID_STATE");
  }

  if (transaction.amount !== amount || transaction.currency !== currency) {
    throw new ActionError("INVALID_STATE", {
      message: "Paystack amount or currency does not match the transaction.",
    });
  }
}

async function getWalletAccount(
  client: SupabaseActionClient,
  userId: string,
  currency: string,
): Promise<WalletAccountRow> {
  const { data, error } = await client.from<WalletAccountRow>("wallet_accounts")
    .select("id,user_id,currency,status")
    .eq("user_id", userId)
    .eq("currency", currency)
    .maybeSingle();

  if (error) throw new ActionError("INTERNAL_ERROR", { cause: error });
  if (!data) throw new ActionError("NOT_FOUND");
  if (data.status !== "active") throw new ActionError("ACCOUNT_RESTRICTED");
  return data;
}

async function getLedgerEntry(
  client: SupabaseActionClient,
  idempotencyKey: string,
): Promise<unknown | null> {
  const { data, error } = await client.from("ledger_entries")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw new ActionError("INTERNAL_ERROR", { cause: error });
  return data;
}

async function insertLedgerEntry(
  client: SupabaseActionClient,
  wallet: WalletAccountRow,
  transaction: PaymentTransactionRow,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.from("ledger_entries").insert({
    wallet_account_id: wallet.id,
    user_id: transaction.user_id,
    payment_transaction_id: transaction.id,
    type: "deposit_confirmed",
    direction: "credit",
    amount: transaction.amount,
    currency: transaction.currency,
    status: "posted",
    idempotency_key: idempotencyKey,
    metadata: {
      provider: "paystack",
      provider_reference: transaction.provider_reference,
    },
  });

  if (error) {
    if (error.code === "23505") return;
    throw new ActionError("INTERNAL_ERROR", { cause: error });
  }
}

async function updatePaymentTransaction(
  client: SupabaseActionClient,
  transactionId: string,
  event: PaystackEvent,
): Promise<void> {
  const { error } = await client.from("payment_transactions")
    .update({
      status: "verified_success",
      verified_at: new Date().toISOString(),
      raw_provider_payload: event,
    })
    .eq("id", transactionId)
    .select("id")
    .maybeSingle();

  if (error) throw new ActionError("INTERNAL_ERROR", { cause: error });
}

async function insertAuditLog(
  request: Request,
  client: SupabaseActionClient,
  transaction: PaymentTransactionRow,
  reference: string,
  event: PaystackEvent,
): Promise<void> {
  const { error } = await client.from("audit_logs").insert({
    actor_user_id: transaction.user_id,
    actor_type: "provider",
    action: "wallet.deposit_verified",
    target_type: "payment_transaction",
    target_id: transaction.id,
    metadata: {
      provider: "paystack",
      reference,
      event: event.event,
    },
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });

  if (error) throw new ActionError("INTERNAL_ERROR", { cause: error });
}

function requireEventString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ActionError("VALIDATION_FAILED", {
      message: `${path} must be a non-empty string.`,
    });
  }
  return value.trim();
}

function requireEventNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ActionError("VALIDATION_FAILED", {
      message: `${path} must be a positive integer.`,
    });
  }
  return value;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
