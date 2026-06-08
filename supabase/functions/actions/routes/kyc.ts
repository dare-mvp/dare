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
import {
  assertOptionalString,
  assertRecord,
  assertString,
  assertUuid,
} from "../_shared/validation.ts";
import { firstForwardedIp } from "../_shared/request.ts";
import { mapDareQueryError } from "./dare_errors.ts";
import {
  type SubmitKycDocuments,
  validateKycDocuments,
  verifyKycDocumentsReference,
} from "./kyc_validation.ts";

const KYC_TIERS = ["kyc1", "kyc2", "kyc3"] as const;
type KycTier = typeof KYC_TIERS[number];

type SubmitKycPayload = {
  kycTierRequested: KycTier;
  documents: SubmitKycDocuments;
};

type SubmitKycRpcRow = {
  kyc_verification_id: string;
  user_id: string;
  kyc_tier_requested: string;
  status: string;
  submitted_at: string;
};

export type SubmitKycResponse = {
  kycVerificationId: string;
  userId: string;
  kycTierRequested: string;
  status: "pending";
  submittedAt: string;
};

export async function submitKycRequest(
  request: Request,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: SubmitKycResponse }> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateSubmitKycPayload,
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
      data: stored.responseBody as SubmitKycResponse,
    };
  }

  await verifyKycDocumentsReference(
    serviceClient,
    authUser.id,
    envelope.payload.documents,
  );

  const row = await callSubmitKycRpc(
    serviceClient,
    authUser.id,
    envelope.payload,
  );
  const data = mapSubmitKycResponse(row);
  await insertKycAuditLog(request, serviceClient, authUser.id, data);
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

function validateSubmitKycPayload(value: unknown): SubmitKycPayload {
  const payload = assertRecord(value, "payload");

  const tier = assertString(
    payload.kycTierRequested,
    "payload.kycTierRequested",
    { max: 10 },
  );
  if (!KYC_TIERS.includes(tier as KycTier)) {
    throw new ActionError("VALIDATION_FAILED", {
      message: "payload.kycTierRequested must be kyc1, kyc2, or kyc3.",
      details: {
        path: "payload.kycTierRequested",
        reason: "unsupported_kyc_tier",
      },
    });
  }

  return {
    kycTierRequested: tier as KycTier,
    documents: validateKycDocuments(payload.documents),
  };
}

async function callSubmitKycRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  payload: SubmitKycPayload,
): Promise<SubmitKycRpcRow> {
  const { data, error } = await serviceClient.rpc<SubmitKycRpcRow[]>(
    "submit_kyc_action",
    {
      p_user_id: userId,
      p_tier: payload.kycTierRequested,
      p_documents: payload.documents,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapSubmitKycResponse(row: SubmitKycRpcRow): SubmitKycResponse {
  return {
    kycVerificationId: row.kyc_verification_id,
    userId: row.user_id,
    kycTierRequested: row.kyc_tier_requested,
    status: "pending",
    submittedAt: row.submitted_at,
  };
}

async function insertKycAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  data: SubmitKycResponse,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action: "kyc.verification_submitted",
    target_type: "kyc_verification",
    target_id: data.kycVerificationId,
    metadata: {
      kycVerificationId: data.kycVerificationId,
      kycTierRequested: data.kycTierRequested,
      submittedAt: data.submittedAt,
    },
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}

// ── GET /kyc/status ──────────────────────────────────────────

type KycStatusRpcRow = {
  kyc_verification_id: string;
  kyc_tier_requested: string;
  kyc_tier_granted: string | null;
  status: string;
  submitted_at: string;
  decided_at: string | null;
};

export type KycStatusResponse = {
  kycVerificationId: string;
  kycTierRequested: string;
  kycTierGranted: string | null;
  status: string;
  submittedAt: string;
  decidedAt: string | null;
} | null;

export async function getKycStatus(
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<KycStatusResponse> {
  const authUser = await requireAuthenticatedUser(client);
  const { data, error } = await serviceClient.rpc<KycStatusRpcRow[]>(
    "get_latest_kyc_verification",
    { p_user_id: authUser.id },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) return null;
  return {
    kycVerificationId: row.kyc_verification_id,
    kycTierRequested: row.kyc_tier_requested,
    kycTierGranted: row.kyc_tier_granted,
    status: row.status,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
  };
}

// ── POST /admin/kyc/{id}/decide ──────────────────────────────

type DecideKycPayload = {
  verdict: "approved" | "rejected";
  kycTierGranted: string | null;
  adminNote: string | null;
};

type DecideKycRpcRow = {
  kyc_verification_id: string;
  user_id: string;
  kyc_tier_requested: string;
  kyc_tier_granted: string | null;
  status: string;
  decided_at: string;
};

export type DecideKycResponse = {
  kycVerificationId: string;
  userId: string;
  kycTierRequested: string;
  kycTierGranted: string | null;
  status: string;
  decidedAt: string;
};

export async function decideKycVerification(
  request: Request,
  kycVerificationId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: DecideKycResponse }> {
  const validatedId = assertUuid(kycVerificationId, "kycVerificationId");
  const authUser = await requireAdminUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateDecideKycPayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    kycVerificationId: validatedId,
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
      data: stored.responseBody as DecideKycResponse,
    };
  }

  const row = await callDecideKycRpc(
    serviceClient,
    authUser.id,
    validatedId,
    envelope.payload,
  );
  const data = mapDecideKycResponse(row);
  await insertDecideKycAuditLog(request, serviceClient, authUser.id, data);
  await insertKycDecisionNotification(serviceClient, data);
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

function validateDecideKycPayload(value: unknown): DecideKycPayload {
  const payload = assertRecord(value, "payload");

  const verdict = assertString(payload.verdict, "payload.verdict", { max: 20 });
  if (verdict !== "approved" && verdict !== "rejected") {
    throw new ActionError("VALIDATION_FAILED", {
      message: "payload.verdict must be 'approved' or 'rejected'.",
      details: { path: "payload.verdict", reason: "invalid_verdict" },
    });
  }

  let kycTierGranted: string | null = null;
  if (verdict === "approved") {
    const tier = assertString(
      payload.kycTierGranted,
      "payload.kycTierGranted",
      { max: 10 },
    );
    if (!KYC_TIERS.includes(tier as KycTier)) {
      throw new ActionError("VALIDATION_FAILED", {
        message: "payload.kycTierGranted must be kyc1, kyc2, or kyc3.",
        details: {
          path: "payload.kycTierGranted",
          reason: "unsupported_kyc_tier",
        },
      });
    }
    kycTierGranted = tier;
  }

  return {
    verdict: verdict as DecideKycPayload["verdict"],
    kycTierGranted,
    adminNote: assertOptionalString(payload.adminNote, "payload.adminNote", {
      max: 1000,
    }) ?? null,
  };
}

async function callDecideKycRpc(
  serviceClient: SupabaseActionClient,
  adminUserId: string,
  kycVerificationId: string,
  payload: DecideKycPayload,
): Promise<DecideKycRpcRow> {
  const { data, error } = await serviceClient.rpc<DecideKycRpcRow[]>(
    "decide_kyc_action",
    {
      p_admin_user_id: adminUserId,
      p_kyc_verification_id: kycVerificationId,
      p_verdict: payload.verdict,
      p_kyc_tier_granted: payload.kycTierGranted,
      p_admin_note: payload.adminNote,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapDecideKycResponse(row: DecideKycRpcRow): DecideKycResponse {
  return {
    kycVerificationId: row.kyc_verification_id,
    userId: row.user_id,
    kycTierRequested: row.kyc_tier_requested,
    kycTierGranted: row.kyc_tier_granted,
    status: row.status,
    decidedAt: row.decided_at,
  };
}

async function insertKycDecisionNotification(
  serviceClient: SupabaseActionClient,
  data: DecideKycResponse,
): Promise<void> {
  const approved = data.status === "approved";
  const { error } = await serviceClient.from("notifications").insert({
    user_id: data.userId,
    type: "system",
    title: approved ? "KYC verification approved" : "KYC verification rejected",
    body: approved
      ? `Your ${data.kycTierGranted} verification has been approved.`
      : "Your KYC verification was not approved. Please resubmit with valid documents.",
    action: { type: "kyc", kycVerificationId: data.kycVerificationId },
  });
  if (error) throw mapDareQueryError(error);
}

async function insertDecideKycAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  adminUserId: string,
  data: DecideKycResponse,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: adminUserId,
    actor_type: "admin",
    action: `kyc.verification_${data.status}`,
    target_type: "kyc_verification",
    target_id: data.kycVerificationId,
    metadata: {
      kycVerificationId: data.kycVerificationId,
      userId: data.userId,
      kycTierRequested: data.kycTierRequested,
      kycTierGranted: data.kycTierGranted,
      status: data.status,
      decidedAt: data.decidedAt,
    },
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
