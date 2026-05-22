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
import {
  assertInteger,
  assertOptionalString,
  assertRecord,
} from "../_shared/validation.ts";
import { firstForwardedIp } from "../_shared/request.ts";
import { mapDareQueryError } from "./dare_errors.ts";

type ResponsibleGamingPayload = {
  dailyDepositLimitNgn?: number;
  weeklyDepositLimitNgn?: number;
  monthlyDepositLimitNgn?: number;
  sessionMaxMinutes?: number;
  maxStakeNgn?: number;
};

type SelfExcludePayload = {
  durationDays: number;
  reason?: string;
};

type ResponsibleGamingSettingsRpcRow = {
  user_id: string;
  daily_deposit_limit_kobo: number | null;
  weekly_deposit_limit_kobo: number | null;
  monthly_deposit_limit_kobo: number | null;
  session_max_minutes: number | null;
  max_stake_per_dare_kobo: number | null;
  pending_daily_deposit_limit_kobo: number | null;
  pending_weekly_deposit_limit_kobo: number | null;
  pending_monthly_deposit_limit_kobo: number | null;
  pending_session_max_minutes: number | null;
  pending_max_stake_per_dare_kobo: number | null;
  pending_limits_effective_at: string | null;
  self_excluded: boolean;
  self_exclusion_until: string | null;
  cooling_off_until: string | null;
};

type SelfExcludeRpcRow = {
  user_id: string;
  self_excluded: boolean;
  self_exclusion_until: string;
  account_status: string;
  cancelled_dares: number;
  forfeited_dares: number;
  refunded_amount: number;
};

export type ResponsibleGamingSettingsResponse = {
  dailyDepositLimitNgn: number | null;
  weeklyDepositLimitNgn: number | null;
  monthlyDepositLimitNgn: number | null;
  sessionMaxMinutes: number | null;
  maxStakeNgn: number | null;
  pending: {
    dailyDepositLimitNgn: number | null;
    weeklyDepositLimitNgn: number | null;
    monthlyDepositLimitNgn: number | null;
    sessionMaxMinutes: number | null;
    maxStakeNgn: number | null;
    effectiveAt: string | null;
  };
  selfExcluded: boolean;
  selfExclusionUntil: string | null;
  coolingOffUntil: string | null;
};

export type SelfExcludeResponse = {
  userId: string;
  selfExcluded: boolean;
  selfExclusionUntil: string;
  accountStatus: string;
  cancelledDares: number;
  forfeitedDares: number;
  refundedAmount: number;
};

export async function updateResponsibleGamingSettings(
  request: Request,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: ResponsibleGamingSettingsResponse }> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateResponsibleGamingPayload,
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
      data: stored.responseBody as ResponsibleGamingSettingsResponse,
    };
  }

  const row = await callUpdateSettingsRpc(
    serviceClient,
    authUser.id,
    envelope.payload,
  );
  const data = mapResponsibleGamingSettingsResponse(row);
  await insertAuditLog(request, serviceClient, authUser.id, data);
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

export async function selfExclude(
  request: Request,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: SelfExcludeResponse }> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateSelfExcludePayload,
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
      data: stored.responseBody as SelfExcludeResponse,
    };
  }

  const row = await callSelfExcludeRpc(
    serviceClient,
    authUser.id,
    envelope.payload,
    keyHash,
  );
  const data = mapSelfExcludeResponse(row);
  await insertSelfExcludeAuditLog(request, serviceClient, authUser.id, data);
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

function validateResponsibleGamingPayload(
  value: unknown,
): ResponsibleGamingPayload {
  const payload = assertRecord(value, "payload");
  const next: ResponsibleGamingPayload = {};

  assignOptionalPositiveInteger(
    next,
    "dailyDepositLimitNgn",
    payload.dailyDepositLimitNgn,
  );
  assignOptionalPositiveInteger(
    next,
    "weeklyDepositLimitNgn",
    payload.weeklyDepositLimitNgn,
  );
  assignOptionalPositiveInteger(
    next,
    "monthlyDepositLimitNgn",
    payload.monthlyDepositLimitNgn,
  );
  assignOptionalPositiveInteger(
    next,
    "sessionMaxMinutes",
    payload.sessionMaxMinutes,
  );
  assignOptionalPositiveInteger(next, "maxStakeNgn", payload.maxStakeNgn);

  if (Object.keys(next).length === 0) {
    throw new ActionError("VALIDATION_FAILED", {
      message: "At least one responsible gaming limit is required.",
      details: { path: "payload", reason: "empty_update" },
    });
  }

  return next;
}

function validateSelfExcludePayload(value: unknown): SelfExcludePayload {
  const payload = assertRecord(value, "payload");
  return {
    durationDays: assertInteger(payload.durationDays, "payload.durationDays", {
      min: 1,
      max: 365,
    }),
    reason: assertOptionalString(payload.reason, "payload.reason", {
      max: 500,
    }),
  };
}

function assignOptionalPositiveInteger(
  target: ResponsibleGamingPayload,
  key: keyof ResponsibleGamingPayload,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  target[key] = assertInteger(value, `payload.${key}`, {
    min: 1,
    max: 10_000_000,
  });
}

async function callUpdateSettingsRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  payload: ResponsibleGamingPayload,
): Promise<ResponsibleGamingSettingsRpcRow> {
  const { data, error } = await serviceClient.rpc<
    ResponsibleGamingSettingsRpcRow[]
  >(
    "update_responsible_gaming_settings_action",
    {
      p_user_id: userId,
      p_daily_deposit_limit_kobo: toKobo(payload.dailyDepositLimitNgn),
      p_weekly_deposit_limit_kobo: toKobo(payload.weeklyDepositLimitNgn),
      p_monthly_deposit_limit_kobo: toKobo(payload.monthlyDepositLimitNgn),
      p_session_max_minutes: payload.sessionMaxMinutes ?? null,
      p_max_stake_per_dare_kobo: toKobo(payload.maxStakeNgn),
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callSelfExcludeRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  payload: SelfExcludePayload,
  keyHash: string,
): Promise<SelfExcludeRpcRow> {
  const { data, error } = await serviceClient.rpc<SelfExcludeRpcRow[]>(
    "self_exclude_action",
    {
      p_user_id: userId,
      p_duration_days: payload.durationDays,
      p_reason: payload.reason ?? null,
      p_ledger_idempotency_key: `self-exclude:${keyHash}`,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapResponsibleGamingSettingsResponse(
  row: ResponsibleGamingSettingsRpcRow,
): ResponsibleGamingSettingsResponse {
  return {
    dailyDepositLimitNgn: fromKobo(row.daily_deposit_limit_kobo),
    weeklyDepositLimitNgn: fromKobo(row.weekly_deposit_limit_kobo),
    monthlyDepositLimitNgn: fromKobo(row.monthly_deposit_limit_kobo),
    sessionMaxMinutes: row.session_max_minutes,
    maxStakeNgn: fromKobo(row.max_stake_per_dare_kobo),
    pending: {
      dailyDepositLimitNgn: fromKobo(row.pending_daily_deposit_limit_kobo),
      weeklyDepositLimitNgn: fromKobo(row.pending_weekly_deposit_limit_kobo),
      monthlyDepositLimitNgn: fromKobo(row.pending_monthly_deposit_limit_kobo),
      sessionMaxMinutes: row.pending_session_max_minutes,
      maxStakeNgn: fromKobo(row.pending_max_stake_per_dare_kobo),
      effectiveAt: row.pending_limits_effective_at,
    },
    selfExcluded: row.self_excluded,
    selfExclusionUntil: row.self_exclusion_until,
    coolingOffUntil: row.cooling_off_until,
  };
}

function mapSelfExcludeResponse(row: SelfExcludeRpcRow): SelfExcludeResponse {
  return {
    userId: row.user_id,
    selfExcluded: row.self_excluded,
    selfExclusionUntil: row.self_exclusion_until,
    accountStatus: row.account_status,
    cancelledDares: row.cancelled_dares,
    forfeitedDares: row.forfeited_dares,
    refundedAmount: row.refunded_amount,
  };
}

function toKobo(value: number | undefined): number | null {
  return value === undefined ? null : value * 100;
}

function fromKobo(value: number | null): number | null {
  return value === null ? null : Math.trunc(value / 100);
}

async function insertAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  settings: ResponsibleGamingSettingsResponse,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action: "responsible_gaming.settings_updated",
    target_type: "responsible_gaming",
    target_id: userId,
    metadata: settings,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}

async function insertSelfExcludeAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  data: SelfExcludeResponse,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action: "responsible_gaming.self_excluded",
    target_type: "responsible_gaming",
    target_id: userId,
    metadata: data,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
