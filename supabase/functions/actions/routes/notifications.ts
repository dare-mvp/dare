import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { parseActionEnvelope } from "../_shared/envelope.ts";
import { ActionError } from "../_shared/errors.ts";
import { type SupabaseActionClient } from "../_shared/supabase.ts";
import { assertUuid } from "../_shared/validation.ts";
import { mapDareQueryError } from "./dare_errors.ts";

type MarkNotificationReadRpcRow = {
  notification_id: string;
  is_read: boolean;
  read_at: string;
};

type MarkAllNotificationsReadRpcRow = {
  updated_count: number;
  read_at: string;
};

export type MarkNotificationReadResponse = {
  notificationId: string;
  isRead: boolean;
  readAt: string;
};

export type MarkAllNotificationsReadResponse = {
  updatedCount: number;
  readAt: string;
};

export async function markNotificationRead(
  request: Request,
  notificationId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: MarkNotificationReadResponse }> {
  const validatedNotificationId = assertUuid(notificationId, "notificationId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request);
  const row = await callMarkNotificationReadRpc(
    serviceClient,
    authUser.id,
    validatedNotificationId,
  );
  return {
    requestId: envelope.requestId,
    data: mapMarkNotificationReadResponse(row),
  };
}

export async function markAllNotificationsRead(
  request: Request,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: MarkAllNotificationsReadResponse }> {
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request);
  const row = await callMarkAllNotificationsReadRpc(serviceClient, authUser.id);
  return {
    requestId: envelope.requestId,
    data: mapMarkAllNotificationsReadResponse(row),
  };
}

async function callMarkNotificationReadRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  notificationId: string,
): Promise<MarkNotificationReadRpcRow> {
  const { data, error } = await serviceClient.rpc<
    MarkNotificationReadRpcRow[]
  >(
    "mark_notification_read_action",
    { p_user_id: userId, p_notification_id: notificationId },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callMarkAllNotificationsReadRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
): Promise<MarkAllNotificationsReadRpcRow> {
  const { data, error } = await serviceClient.rpc<
    MarkAllNotificationsReadRpcRow[]
  >(
    "mark_all_notifications_read_action",
    { p_user_id: userId },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapMarkNotificationReadResponse(
  row: MarkNotificationReadRpcRow,
): MarkNotificationReadResponse {
  return {
    notificationId: row.notification_id,
    isRead: row.is_read,
    readAt: row.read_at,
  };
}

function mapMarkAllNotificationsReadResponse(
  row: MarkAllNotificationsReadRpcRow,
): MarkAllNotificationsReadResponse {
  return {
    updatedCount: row.updated_count,
    readAt: row.read_at,
  };
}
