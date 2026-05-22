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
  assertInteger,
  assertOneOf,
  assertRecord,
} from "../_shared/validation.ts";

const MIN_DEPOSIT_KOBO = 10_000;
const MAX_DEPOSIT_KOBO = 5_000_000;
const SUPPORTED_CURRENCIES = ["NGN"] as const;
const SUPPORTED_PROVIDERS = ["paystack"] as const;

type DepositPayload = {
  amount: number;
  currency: typeof SUPPORTED_CURRENCIES[number];
  provider: typeof SUPPORTED_PROVIDERS[number];
};

type ProfileRow = {
  id: string;
  account_status: string;
  risk_status: string;
  kyc_tier: string;
};

type ResponsibleGamingRow = {
  daily_deposit_limit_kobo: number | null;
  weekly_deposit_limit_kobo: number | null;
  monthly_deposit_limit_kobo: number | null;
  self_excluded: boolean;
  self_exclusion_until: string | null;
  cooling_off_until: string | null;
};

type DepositTotalsRow = {
  daily_total_kobo: number;
  weekly_total_kobo: number;
  monthly_total_kobo: number;
};

type DepositInitResponse = {
  paymentTransactionId: string;
  provider: "paystack";
  mode: "sandbox";
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  amount: number;
  currency: "NGN";
  status: "initialized";
};

export async function initializeDeposit(
  request: Request,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: DepositInitResponse }> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateDepositPayload,
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
      data: stored.responseBody as DepositInitResponse,
    };
  }

  const [profile, responsibleGaming] = await Promise.all([
    getProfile(client, authUser.id),
    getResponsibleGaming(client, authUser.id),
  ]);
  assertDepositAllowed(profile, responsibleGaming);
  if (responsibleGaming) {
    const totals = await getDepositTotals(serviceClient, authUser.id);
    assertCumulativeLimits(responsibleGaming, totals, envelope.payload.amount);
  }

  const paymentTransactionId = crypto.randomUUID();
  const reference = `dare_dep_${keyHash.slice(0, 24)}`;
  const data: DepositInitResponse = {
    paymentTransactionId,
    provider: "paystack",
    mode: "sandbox",
    reference,
    authorizationUrl: `https://checkout.paystack.com/sandbox_${reference}`,
    accessCode: `sandbox_${reference}`,
    amount: envelope.payload.amount,
    currency: envelope.payload.currency,
    status: "initialized",
  };

  await insertPaymentTransaction(
    serviceClient,
    paymentTransactionId,
    authUser.id,
    reference,
    envelope.payload,
    keyHash,
  );
  await insertAuditLog(
    request,
    serviceClient,
    authUser.id,
    paymentTransactionId,
    {
      amount: envelope.payload.amount,
      currency: envelope.payload.currency,
      provider: envelope.payload.provider,
      reference,
      sandbox: true,
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

function validateDepositPayload(value: unknown): DepositPayload {
  const payload = assertRecord(value, "payload");
  return {
    amount: assertInteger(payload.amount, "payload.amount", {
      min: MIN_DEPOSIT_KOBO,
      max: MAX_DEPOSIT_KOBO,
    }),
    currency: assertOneOf(
      payload.currency,
      SUPPORTED_CURRENCIES,
      "payload.currency",
    ),
    provider: assertOneOf(
      payload.provider,
      SUPPORTED_PROVIDERS,
      "payload.provider",
    ),
  };
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

async function getResponsibleGaming(
  client: SupabaseActionClient,
  userId: string,
): Promise<ResponsibleGamingRow | null> {
  const { data, error } = await client
    .from<ResponsibleGamingRow>("responsible_gaming_settings")
    .select(
      "daily_deposit_limit_kobo,weekly_deposit_limit_kobo,monthly_deposit_limit_kobo,self_excluded,self_exclusion_until,cooling_off_until",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw mapQueryError(error);
  return data;
}

async function getDepositTotals(
  serviceClient: SupabaseActionClient,
  userId: string,
): Promise<DepositTotalsRow> {
  const { data, error } = await serviceClient.rpc<DepositTotalsRow[]>(
    "get_user_deposit_totals_kobo",
    { p_user_id: userId },
  );
  if (error) throw mapQueryError(error);
  return data?.[0] ??
    { daily_total_kobo: 0, weekly_total_kobo: 0, monthly_total_kobo: 0 };
}

function assertCumulativeLimits(
  settings: ResponsibleGamingRow,
  totals: DepositTotalsRow,
  amount: number,
): void {
  if (
    settings.daily_deposit_limit_kobo !== null &&
    totals.daily_total_kobo + amount > settings.daily_deposit_limit_kobo
  ) {
    throw new ActionError("LIMIT_EXCEEDED", {
      message: "This deposit would exceed your daily deposit limit.",
    });
  }

  if (
    settings.weekly_deposit_limit_kobo !== null &&
    totals.weekly_total_kobo + amount > settings.weekly_deposit_limit_kobo
  ) {
    throw new ActionError("LIMIT_EXCEEDED", {
      message: "This deposit would exceed your weekly deposit limit.",
    });
  }

  if (
    settings.monthly_deposit_limit_kobo !== null &&
    totals.monthly_total_kobo + amount > settings.monthly_deposit_limit_kobo
  ) {
    throw new ActionError("LIMIT_EXCEEDED", {
      message: "This deposit would exceed your monthly deposit limit.",
    });
  }
}

function assertDepositAllowed(
  profile: ProfileRow,
  settings: ResponsibleGamingRow | null,
): void {
  if (profile.account_status !== "active") {
    throw new ActionError("ACCOUNT_RESTRICTED");
  }

  if (!["normal", "watch"].includes(profile.risk_status)) {
    throw new ActionError("ACCOUNT_RESTRICTED");
  }

  if (profile.kyc_tier === "kyc0") {
    throw new ActionError("KYC_REQUIRED");
  }

  if (settings?.self_excluded) {
    throw new ActionError("ACCOUNT_RESTRICTED");
  }

  const now = Date.now();
  if (
    settings?.self_exclusion_until &&
    Date.parse(settings.self_exclusion_until) > now
  ) {
    throw new ActionError("ACCOUNT_RESTRICTED");
  }

  if (
    settings?.cooling_off_until && Date.parse(settings.cooling_off_until) > now
  ) {
    throw new ActionError("ACCOUNT_RESTRICTED");
  }
}

async function insertPaymentTransaction(
  serviceClient: SupabaseActionClient,
  id: string,
  userId: string,
  reference: string,
  payload: DepositPayload,
  keyHash: string,
): Promise<void> {
  const { error } = await serviceClient.from("payment_transactions").insert({
    id,
    user_id: userId,
    provider: payload.provider,
    provider_reference: reference,
    type: "deposit",
    amount: payload.amount,
    currency: payload.currency,
    status: "initialized",
    raw_provider_payload: {
      sandbox: true,
      idempotency_key_hash: keyHash,
    },
  });

  if (error) throw mapQueryError(error);
}

async function insertAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  paymentTransactionId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action: "wallet.deposit_initialized",
    target_type: "payment_transaction",
    target_id: paymentTransactionId,
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

  if (error.code === "23505") {
    return new ActionError("IDEMPOTENCY_CONFLICT", { cause: error });
  }

  return new ActionError("INTERNAL_ERROR", {
    message: "Database operation failed.",
    cause: error,
  });
}
