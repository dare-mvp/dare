import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { parseActionEnvelope } from "../_shared/envelope.ts";
import { ActionError } from "../_shared/errors.ts";
import { type SupabaseActionClient } from "../_shared/supabase.ts";
import {
  assertOneOf,
  assertRecord,
  validationError,
} from "../_shared/validation.ts";
import { firstForwardedIp } from "../_shared/request.ts";
import { mapDareQueryError } from "./dare_errors.ts";

const JURY_CATEGORIES = [
  "knowledge",
  "physical",
  "verbal",
  "sports",
  "creative",
  "other",
] as const;

const PROFILE_SELECT = [
  "id",
  "jury_opt_in",
  "jury_categories",
  "trust_score",
  "completed_dares",
  "kyc_tier",
  "account_status",
  "risk_status",
].join(",");

type JuryProfileRow = {
  id: string;
  jury_opt_in: boolean;
  jury_categories: string[];
  trust_score: number;
  completed_dares: number;
  kyc_tier: string;
  account_status: string;
  risk_status: string;
};

type JuryProfilePayload = {
  juryOptIn: boolean;
  juryCategories?: typeof JURY_CATEGORIES[number][];
};

type JuryProfileResponse = {
  juryOptIn: boolean;
  juryCategories: string[];
  eligible: boolean;
  requirements: {
    kycTier: string;
    trustScore: number;
    completedDares: number;
  };
};

export async function updateMyJuryProfile(
  request: Request,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: JuryProfileResponse }> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    validatePayload: validateJuryProfilePayload,
  });
  const profile = await getJuryProfile(client, authUser.id);

  if (envelope.payload.juryOptIn) {
    assertEligibleForJury(profile);
  }

  const nextCategories = envelope.payload.juryCategories ??
    profile.jury_categories;
  const patch = {
    jury_opt_in: envelope.payload.juryOptIn,
    jury_categories: envelope.payload.juryOptIn ? nextCategories : [],
  };

  const { data, error } = await client.from<JuryProfileRow>("profiles")
    .update(patch)
    .eq("id", authUser.id)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("NOT_FOUND");

  const response = mapJuryProfileResponse(data);
  await insertAuditLog(
    request,
    serviceClient,
    authUser.id,
    "profile.jury_updated",
    {
      juryOptIn: response.juryOptIn,
      juryCategories: response.juryCategories,
    },
  );
  return { requestId: envelope.requestId, data: response };
}

function validateJuryProfilePayload(value: unknown): JuryProfilePayload {
  const payload = assertRecord(value, "payload");

  if (typeof payload.juryOptIn !== "boolean") {
    throw validationError("payload.juryOptIn", "must be a boolean");
  }

  return {
    juryOptIn: payload.juryOptIn,
    juryCategories: validateCategories(payload.juryCategories),
  };
}

function validateCategories(
  value: unknown,
): typeof JURY_CATEGORIES[number][] | undefined {
  if (value === undefined || value === null) return undefined;

  if (!Array.isArray(value)) {
    throw validationError("payload.juryCategories", "must be an array");
  }

  if (value.length > JURY_CATEGORIES.length) {
    throw validationError(
      "payload.juryCategories",
      `must contain at most ${JURY_CATEGORIES.length} items`,
    );
  }

  const categories = value.map((category, index) =>
    assertOneOf(
      category,
      JURY_CATEGORIES,
      `payload.juryCategories.${index}`,
    )
  );

  if (new Set(categories).size !== categories.length) {
    throw validationError(
      "payload.juryCategories",
      "must not contain duplicates",
    );
  }

  return categories;
}

async function getJuryProfile(
  client: SupabaseActionClient,
  userId: string,
): Promise<JuryProfileRow> {
  const { data, error } = await client.from<JuryProfileRow>("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("NOT_FOUND");
  return data;
}

function assertEligibleForJury(profile: JuryProfileRow): void {
  if (profile.account_status !== "active" || profile.risk_status !== "normal") {
    throw new ActionError("ACCOUNT_RESTRICTED");
  }

  if (!["kyc1", "kyc2", "kyc3"].includes(profile.kyc_tier)) {
    throw new ActionError("KYC_REQUIRED");
  }

  if (profile.trust_score < 500 || profile.completed_dares < 10) {
    throw new ActionError("FORBIDDEN", {
      message: "Jury eligibility requirements are not met.",
      details: {
        trustScore: profile.trust_score,
        completedDares: profile.completed_dares,
      },
    });
  }
}

function mapJuryProfileResponse(profile: JuryProfileRow): JuryProfileResponse {
  return {
    juryOptIn: profile.jury_opt_in,
    juryCategories: profile.jury_categories,
    eligible: isEligibleForJury(profile),
    requirements: {
      kycTier: "kyc1",
      trustScore: 500,
      completedDares: 10,
    },
  };
}

function isEligibleForJury(profile: JuryProfileRow): boolean {
  return profile.account_status === "active" &&
    profile.risk_status === "normal" &&
    ["kyc1", "kyc2", "kyc3"].includes(profile.kyc_tier) &&
    profile.trust_score >= 500 &&
    profile.completed_dares >= 10;
}

async function insertAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action,
    target_type: "profile",
    target_id: userId,
    metadata,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
