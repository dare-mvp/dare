import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { parseActionEnvelope } from "../_shared/envelope.ts";
import { ActionError } from "../_shared/errors.ts";
import { type SupabaseActionClient } from "../_shared/supabase.ts";
import {
  assertOneOf,
  assertOptionalString,
  assertRecord,
  assertString,
  validationError,
} from "../_shared/validation.ts";
import { mapDareQueryError } from "./dare_errors.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_TOKEN_RE = /^(Expo|Exponent)PushToken\[[^\]]{10,180}\]$/;
const PUSH_PLATFORMS = ["ios", "android", "web", "unknown"] as const;

type PushPlatform = typeof PUSH_PLATFORMS[number];

type RegisterPushTokenPayload = {
  appVersion?: string;
  deviceId?: string;
  expoPushToken: string;
  platform: PushPlatform;
};

type RevokePushTokenPayload = {
  expoPushToken: string;
};

type PushTokenRow = {
  id: string;
  enabled: boolean;
  platform: PushPlatform;
};

type ClaimedDeliveryRow = {
  action: Record<string, unknown> | null;
  attempt_count: number;
  body: string;
  delivery_id: string;
  expo_push_token: string;
  notification_id: string;
  notification_type: string;
  push_token_id: string;
  title: string;
  user_id: string;
};

type ExpoTicket = {
  details?: {
    error?: string;
  };
  id?: string;
  message?: string;
  status?: "error" | "ok";
};

export type RegisterPushTokenResponse = {
  enabled: boolean;
  platform: PushPlatform;
  pushTokenId: string;
};

export type RevokePushTokenResponse = {
  revoked: boolean;
};

export async function registerPushToken(
  request: Request,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: RegisterPushTokenResponse }> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    validatePayload: validateRegisterPushTokenPayload,
  });
  const payload = envelope.payload;
  const now = new Date().toISOString();

  const { data, error } = await (serviceClient.from("push_tokens") as any)
    .upsert(
      {
        app_version: payload.appVersion ?? null,
        device_id: payload.deviceId ?? null,
        disabled_reason: null,
        enabled: true,
        expo_push_token: payload.expoPushToken,
        last_registered_at: now,
        last_seen_at: now,
        platform: payload.platform,
        revoked_at: null,
        user_id: authUser.id,
      },
      { onConflict: "expo_push_token" },
    )
    .select("id,enabled,platform")
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("INTERNAL_ERROR");

  const row = data as PushTokenRow;
  return {
    requestId: envelope.requestId,
    data: {
      enabled: row.enabled,
      platform: row.platform,
      pushTokenId: row.id,
    },
  };
}

export async function revokePushToken(
  request: Request,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: RevokePushTokenResponse }> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    validatePayload: validateRevokePushTokenPayload,
  });
  const now = new Date().toISOString();

  const { error } = await (serviceClient.from("push_tokens") as any)
    .update({
      disabled_reason: "user_revoked",
      enabled: false,
      revoked_at: now,
    })
    .eq("user_id", authUser.id)
    .eq("expo_push_token", envelope.payload.expoPushToken);

  if (error) throw mapDareQueryError(error);

  return {
    requestId: envelope.requestId,
    data: { revoked: true },
  };
}

export async function flushPendingPushNotifications(
  serviceClient: SupabaseActionClient,
  limit = 25,
): Promise<void> {
  if (readOptionalEnv("EXPO_PUSH_ENABLED") === "false") return;

  const deliveries = await claimPushDeliveries(serviceClient, limit);
  if (deliveries.length === 0) return;

  const tickets = await sendExpoPushBatch(deliveries);
  await Promise.all(deliveries.map((delivery, index) => {
    const ticket = tickets[index];
    return markDeliveryResult(serviceClient, delivery, ticket);
  }));
}

function validateRegisterPushTokenPayload(value: unknown): RegisterPushTokenPayload {
  const payload = assertRecord(value, "payload");
  const expoPushToken = validateExpoPushToken(payload.expoPushToken);
  const platform = assertOneOf(
    payload.platform ?? "unknown",
    PUSH_PLATFORMS,
    "payload.platform",
  );

  return {
    appVersion: assertOptionalString(payload.appVersion, "payload.appVersion", {
      max: 64,
    }),
    deviceId: assertOptionalString(payload.deviceId, "payload.deviceId", {
      min: 1,
      max: 128,
    }),
    expoPushToken,
    platform,
  };
}

function validateRevokePushTokenPayload(value: unknown): RevokePushTokenPayload {
  const payload = assertRecord(value, "payload");
  return {
    expoPushToken: validateExpoPushToken(payload.expoPushToken),
  };
}

function validateExpoPushToken(value: unknown): string {
  const token = assertString(value, "payload.expoPushToken", {
    min: 20,
    max: 200,
  });

  if (!EXPO_PUSH_TOKEN_RE.test(token)) {
    throw validationError(
      "payload.expoPushToken",
      "must be a valid Expo push token",
    );
  }

  return token;
}

async function claimPushDeliveries(
  serviceClient: SupabaseActionClient,
  limit: number,
): Promise<ClaimedDeliveryRow[]> {
  const { data, error } = await serviceClient.rpc<ClaimedDeliveryRow[]>(
    "claim_notification_push_deliveries",
    { p_limit: limit },
  );

  if (error) throw mapDareQueryError(error);
  return data ?? [];
}

async function sendExpoPushBatch(
  deliveries: ClaimedDeliveryRow[],
): Promise<ExpoTicket[]> {
  const accessToken = readOptionalEnv("EXPO_PUSH_ACCESS_TOKEN");
  const response = await fetch(EXPO_PUSH_URL, {
    body: JSON.stringify(deliveries.map((delivery) => ({
      body: delivery.body,
      channelId: "dare-alerts",
      data: {
        action: delivery.action ?? null,
        notificationId: delivery.notification_id,
        type: delivery.notification_type,
      },
      priority: "high",
      sound: "default",
      title: delivery.title,
      to: delivery.expo_push_token,
    }))),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    method: "POST",
  });

  const payload = await response.json().catch(() => null) as
    | { data?: ExpoTicket[]; errors?: unknown[] }
    | null;

  if (!response.ok) {
    return deliveries.map(() => ({
      message: `Expo push request failed with status ${response.status}.`,
      status: "error",
    }));
  }

  const tickets = payload?.data ?? [];
  return deliveries.map((_, index) => tickets[index] ?? {
    message: "Expo did not return a ticket for this message.",
    status: "error",
  });
}

async function markDeliveryResult(
  serviceClient: SupabaseActionClient,
  delivery: ClaimedDeliveryRow,
  ticket: ExpoTicket,
): Promise<void> {
  if (ticket.status === "ok") {
    const { error } = await (serviceClient.from("notification_push_deliveries") as any)
      .update({
        failure_reason: null,
        next_attempt_at: null,
        provider_status: "ok",
        provider_ticket_id: ticket.id ?? null,
        sent_at: new Date().toISOString(),
        status: "sent",
      })
      .eq("id", delivery.delivery_id);

    if (error) throw mapDareQueryError(error);
    return;
  }

  const providerError = ticket.details?.error ?? "expo_error";
  const disabled = providerError === "DeviceNotRegistered";
  if (disabled) {
    await serviceClient.from("push_tokens")
      .update({
        disabled_reason: providerError,
        enabled: false,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", delivery.push_token_id);
  }

  const { error } = await (serviceClient.from("notification_push_deliveries") as any)
    .update({
      failure_reason: ticket.message ?? providerError,
      next_attempt_at: disabled ? null : nextRetryAt(delivery.attempt_count),
      provider_status: providerError,
      status: disabled || delivery.attempt_count >= 5 ? "skipped" : "failed",
    })
    .eq("id", delivery.delivery_id);

  if (error) throw mapDareQueryError(error);
}

function nextRetryAt(attemptCount: number): string {
  const delaySeconds = Math.min(60 * 30, 2 ** Math.max(0, attemptCount) * 30);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

function readOptionalEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name);
  } catch {
    return undefined;
  }
}
