import { parseActionEnvelope } from "../_shared/envelope.ts";
import { ActionError } from "../_shared/errors.ts";
import { requireAuthenticatedUser } from "../_shared/auth.ts";
import {
  type SupabaseActionClient,
  type SupabaseQueryError,
} from "../_shared/supabase.ts";
import {
  assertOptionalString,
  assertRecord,
  assertString,
  validationError,
} from "../_shared/validation.ts";

const PROFILE_SELECT = [
  "id",
  "username",
  "display_name",
  "avatar_url",
  "avatar_emoji",
  "avatar_color",
  "bio",
  "country",
  "city",
  "trust_score",
  "tier",
  "wins",
  "losses",
  "disputes",
  "completed_dares",
  "jury_opt_in",
  "jury_categories",
  "kyc_tier",
  "account_status",
  "risk_status",
  "created_at",
  "updated_at",
].join(",");

const WALLET_SUMMARY_SELECT = [
  "wallet_account_id",
  "user_id",
  "currency",
  "account_status",
  "available_balance",
  "escrowed_balance",
  "dispute_held_balance",
  "pending_withdrawal_balance",
].join(",");

const RESPONSIBLE_GAMING_SELECT = [
  "user_id",
  "daily_deposit_limit_kobo",
  "weekly_deposit_limit_kobo",
  "monthly_deposit_limit_kobo",
  "max_stake_per_dare_kobo",
  "self_excluded",
  "self_exclusion_until",
  "cooling_off_until",
].join(",");

const ALLOWED_PROFILE_UPDATE_FIELDS = new Set([
  "username",
  "displayName",
  "avatarUrl",
  "avatarEmoji",
  "avatarColor",
  "bio",
  "country",
  "city",
]);

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_emoji: string | null;
  avatar_color: string;
  bio: string | null;
  country: string | null;
  city: string | null;
  trust_score: number;
  tier: string;
  wins: number;
  losses: number;
  disputes: number;
  completed_dares: number;
  jury_opt_in: boolean;
  jury_categories: string[];
  kyc_tier: string;
  account_status: string;
  risk_status: string;
  created_at: string;
  updated_at: string;
};

type WalletSummaryRow = {
  wallet_account_id: string;
  user_id: string;
  currency: string;
  account_status: string;
  available_balance: number;
  escrowed_balance: number;
  dispute_held_balance: number;
  pending_withdrawal_balance: number;
};

type ResponsibleGamingRow = {
  user_id: string;
  daily_deposit_limit_kobo: number | null;
  weekly_deposit_limit_kobo: number | null;
  monthly_deposit_limit_kobo: number | null;
  max_stake_per_dare_kobo: number | null;
  self_excluded: boolean;
  self_exclusion_until: string | null;
  cooling_off_until: string | null;
};

type MeResponse = {
  user: ReturnType<typeof mapProfile>;
  wallet: ReturnType<typeof mapWalletSummary> | null;
  responsibleGaming: ReturnType<typeof mapResponsibleGaming>;
  capabilities: ReturnType<typeof buildCapabilities>;
};

export async function getMe(
  client: SupabaseActionClient,
): Promise<MeResponse> {
  const authUser = await requireAuthenticatedUser(client);
  const [profile, wallet, responsibleGaming] = await Promise.all([
    getProfile(client, authUser.id),
    getWalletSummary(client, authUser.id),
    getResponsibleGaming(client, authUser.id),
  ]);

  return {
    user: mapProfile(profile),
    wallet: wallet ? mapWalletSummary(wallet) : null,
    responsibleGaming: mapResponsibleGaming(responsibleGaming),
    capabilities: buildCapabilities(profile, responsibleGaming),
  };
}

export async function updateMyProfile(
  request: Request,
  client: SupabaseActionClient,
): Promise<
  { requestId: string; data: { user: ReturnType<typeof mapProfile> } }
> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    validatePayload: validateProfileUpdatePayload,
  });

  const patch = toProfileUpdatePatch(envelope.payload);

  if (Object.keys(patch).length === 0) {
    throw new ActionError("VALIDATION_FAILED", {
      message: "At least one profile field is required.",
      details: { path: "payload", reason: "empty_update" },
    });
  }

  const { data, error } = await client.from<ProfileRow>("profiles")
    .update(patch)
    .eq("id", authUser.id)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    throw mapQueryError(error);
  }

  if (!data) {
    throw new ActionError("NOT_FOUND", {
      message: "Profile was not found.",
    });
  }

  return {
    requestId: envelope.requestId,
    data: { user: mapProfile(data) },
  };
}

async function getProfile(
  client: SupabaseActionClient,
  userId: string,
): Promise<ProfileRow> {
  const { data, error } = await client.from<ProfileRow>("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw mapQueryError(error);
  }

  if (!data) {
    throw new ActionError("NOT_FOUND", {
      message: "Profile was not found.",
    });
  }

  return data;
}

async function getWalletSummary(
  client: SupabaseActionClient,
  userId: string,
): Promise<WalletSummaryRow | null> {
  const { data, error } = await client.from<WalletSummaryRow>("wallet_summary")
    .select(WALLET_SUMMARY_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw mapQueryError(error);
  }

  return data;
}

async function getResponsibleGaming(
  client: SupabaseActionClient,
  userId: string,
): Promise<ResponsibleGamingRow | null> {
  const { data, error } = await client
    .from<ResponsibleGamingRow>("responsible_gaming_settings")
    .select(RESPONSIBLE_GAMING_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw mapQueryError(error);
  }

  return data;
}

function validateProfileUpdatePayload(value: unknown): ProfileUpdatePayload {
  const payload = assertRecord(value, "payload");

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_PROFILE_UPDATE_FIELDS.has(key)) {
      throw validationError(
        `payload.${key}`,
        "is not an allowed profile field",
      );
    }
  }

  return {
    username: validateOptionalUsername(payload.username),
    displayName: nullableString(payload.displayName, "payload.displayName", 80),
    avatarUrl: nullableUrl(payload.avatarUrl, "payload.avatarUrl"),
    avatarEmoji: nullableString(payload.avatarEmoji, "payload.avatarEmoji", 16),
    avatarColor: nullableToken(payload.avatarColor, "payload.avatarColor"),
    bio: nullableString(payload.bio, "payload.bio", 300),
    country: nullableString(payload.country, "payload.country", 80),
    city: nullableString(payload.city, "payload.city", 80),
  };
}

type ProfileUpdatePayload = {
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
  bio?: string | null;
  country?: string | null;
  city?: string | null;
};

function toProfileUpdatePatch(
  payload: ProfileUpdatePayload,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  assignIfDefined(patch, "username", payload.username);
  assignIfDefined(patch, "display_name", payload.displayName);
  assignIfDefined(patch, "avatar_url", payload.avatarUrl);
  assignIfDefined(patch, "avatar_emoji", payload.avatarEmoji);
  assignIfDefined(patch, "avatar_color", payload.avatarColor);
  assignIfDefined(patch, "bio", payload.bio);
  assignIfDefined(patch, "country", payload.country);
  assignIfDefined(patch, "city", payload.city);

  return patch;
}

function assignIfDefined(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function validateOptionalUsername(value: unknown): string | undefined {
  const username = assertOptionalString(value, "payload.username", {
    min: 3,
    max: 30,
  });

  if (username === undefined) {
    return undefined;
  }

  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    throw validationError(
      "payload.username",
      "must contain only letters, numbers, and underscores",
    );
  }

  return username;
}

function nullableString(
  value: unknown,
  path: string,
  max: number,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return assertString(value, path, { min: 1, max });
}

function nullableUrl(
  value: unknown,
  path: string,
): string | null | undefined {
  const url = nullableString(value, path, 500);
  if (url === undefined || url === null) {
    return url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw validationError(path, "must be a valid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw validationError(path, "must use http or https");
  }

  return url;
}

function nullableToken(
  value: unknown,
  path: string,
): string | null | undefined {
  const token = nullableString(value, path, 32);
  if (token === undefined || token === null) {
    return token;
  }

  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    throw validationError(
      path,
      "must contain only letters, numbers, underscores, or hyphens",
    );
  }

  return token;
}

function mapProfile(profile: ProfileRow) {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    avatarEmoji: profile.avatar_emoji,
    avatarColor: profile.avatar_color,
    bio: profile.bio,
    country: profile.country,
    city: profile.city,
    trustScore: profile.trust_score,
    tier: profile.tier,
    wins: profile.wins,
    losses: profile.losses,
    disputes: profile.disputes,
    completedDares: profile.completed_dares,
    juryOptIn: profile.jury_opt_in,
    juryCategories: profile.jury_categories,
    kycTier: profile.kyc_tier,
    accountStatus: profile.account_status,
    riskStatus: profile.risk_status,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function mapWalletSummary(wallet: WalletSummaryRow) {
  return {
    walletAccountId: wallet.wallet_account_id,
    currency: wallet.currency,
    accountStatus: wallet.account_status,
    available: wallet.available_balance,
    escrowed: wallet.escrowed_balance,
    held: wallet.dispute_held_balance,
    pendingWithdrawal: wallet.pending_withdrawal_balance,
  };
}

function mapResponsibleGaming(settings: ResponsibleGamingRow | null) {
  return {
    dailyDepositLimit: settings?.daily_deposit_limit_kobo ?? null,
    weeklyDepositLimit: settings?.weekly_deposit_limit_kobo ?? null,
    monthlyDepositLimit: settings?.monthly_deposit_limit_kobo ?? null,
    maxStakePerDare: settings?.max_stake_per_dare_kobo ?? null,
    selfExcluded: settings?.self_excluded ?? false,
    selfExclusionUntil: settings?.self_exclusion_until ?? null,
    coolingOffUntil: settings?.cooling_off_until ?? null,
  };
}

function buildCapabilities(
  profile: ProfileRow,
  responsibleGaming: ResponsibleGamingRow | null,
) {
  const active = profile.account_status === "active";
  const riskOk = profile.risk_status === "normal" ||
    profile.risk_status === "watch";
  const verified = profile.kyc_tier !== "kyc0";
  const selfExcluded = responsibleGaming?.self_excluded === true;
  const allowed = active && riskOk && verified && !selfExcluded;

  return {
    canCreateDare: allowed,
    canAcceptDare: allowed,
    canWithdraw: allowed,
    canJury: allowed && profile.jury_opt_in,
    canUpdateProfile: active && profile.risk_status !== "blocked",
  };
}

function mapQueryError(error: SupabaseQueryError): ActionError {
  if (error.code === "42501") {
    return new ActionError("FORBIDDEN", { cause: error });
  }

  if (error.code === "23505") {
    return new ActionError("VALIDATION_FAILED", {
      message: "A profile with that value already exists.",
      cause: error,
    });
  }

  return new ActionError("INTERNAL_ERROR", {
    message: "Database operation failed.",
    cause: error,
  });
}
