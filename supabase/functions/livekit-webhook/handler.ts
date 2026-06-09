import {
  type LiveKitGateway,
  type LiveKitWebhookEvent,
  createLiveKitGateway,
} from "../actions/_shared/livekit.ts";
import { errorResponse, successResponse } from "../actions/_shared/response.ts";
import {
  createServiceClient,
  type SupabaseActionClient,
  type SupabaseQueryError,
} from "../actions/_shared/supabase.ts";
import { ActionError } from "../actions/_shared/errors.ts";

type HandlerDependencies = {
  createLiveKitGateway?: () => LiveKitGateway;
  createServiceClient?: () => SupabaseActionClient;
};

type LiveCourtRoomRow = {
  court_session_id: string;
  dare_id: string;
  id: string;
};

const defaultDependencies: Required<HandlerDependencies> = {
  createLiveKitGateway,
  createServiceClient,
};

export function createLiveKitWebhookHandler(
  dependencies: HandlerDependencies = defaultDependencies,
): (request: Request) => Promise<Response> {
  return async function liveKitWebhookHandler(request: Request): Promise<Response> {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

    if (request.method !== "POST") {
      return errorResponse(new ActionError("METHOD_NOT_ALLOWED"), requestId);
    }

    try {
      const rawBody = await request.text();
      const gateway = (dependencies.createLiveKitGateway ?? createLiveKitGateway)();
      const serviceClient = (dependencies.createServiceClient ?? createServiceClient)();
      const event = await gateway.receiveWebhook(
        rawBody,
        request.headers.get("authorization"),
      );
      const result = await applyLiveKitEvent(serviceClient, event);

      return successResponse(result, requestId);
    } catch (error) {
      return errorResponse(error, requestId);
    }
  };
}

export const handler = createLiveKitWebhookHandler();

async function applyLiveKitEvent(
  serviceClient: SupabaseActionClient,
  event: LiveKitWebhookEvent,
) {
  const eventName = stringValue(event.event) ?? "unknown";
  const roomName = roomNameFromEvent(event);
  if (!roomName) {
    return { ignored: true, reason: "missing_room_name" };
  }

  const room = await findLiveCourtRoom(serviceClient, roomName);
  if (!room) {
    return { ignored: true, reason: "room_not_tracked", roomName };
  }

  await insertProviderEvent(serviceClient, room, event, eventName);
  await updateRoomForEvent(serviceClient, room, event, eventName);
  await updateParticipantForEvent(serviceClient, room, event, eventName);
  await updateRecordingForEvent(serviceClient, room, event, eventName);

  return {
    applied: true,
    event: eventName,
    liveCourtRoomId: room.id,
  };
}

async function findLiveCourtRoom(
  serviceClient: SupabaseActionClient,
  roomName: string,
): Promise<LiveCourtRoomRow | null> {
  const { data, error } = await serviceClient
    .from<LiveCourtRoomRow>("live_court_rooms")
    .select("id,dare_id,court_session_id")
    .eq("provider", "livekit")
    .eq("provider_room_id", roomName)
    .maybeSingle();

  if (error) throw mapProviderEventError(error);
  return data;
}

async function insertProviderEvent(
  serviceClient: SupabaseActionClient,
  room: LiveCourtRoomRow,
  event: LiveKitWebhookEvent,
  eventName: string,
): Promise<void> {
  const { error } = await serviceClient.from("live_court_provider_events").insert({
    dare_id: room.dare_id,
    event_type: eventName,
    live_court_room_id: room.id,
    payload: event as unknown as Record<string, unknown>,
    provider: "livekit",
    provider_event_id: stringValue(event.id) ??
      `${eventName}:${room.id}:${event.createdAt ?? Date.now()}`,
    received_at: new Date().toISOString(),
  });

  if (error && error.code !== "23505") throw mapProviderEventError(error);
}

async function updateRoomForEvent(
  serviceClient: SupabaseActionClient,
  room: LiveCourtRoomRow,
  event: LiveKitWebhookEvent,
  eventName: string,
): Promise<void> {
  const now = new Date().toISOString();
  const values: Record<string, unknown> = {
    provider: "livekit",
    updated_at: now,
  };

  if (eventName === "room_started") {
    values.status = "live";
    values.started_at = now;
  }

  if (eventName === "room_finished") {
    values.status = "ended";
    values.ended_at = now;
    values.recording_ended_at = now;
    if (recordingWasRunning(event)) values.recording_status = "processing";
  }

  if (eventName === "egress_started") {
    values.recording_status = "recording";
    values.recording_started_at = now;
  }

  if (eventName === "egress_ended") {
    values.recording_status = egressFailed(event) ? "failed" : "processing";
    values.recording_ended_at = now;
  }

  if (Object.keys(values).length <= 2) return;

  const { error } = await serviceClient
    .from("live_court_rooms")
    .update(values)
    .eq("id", room.id)
    .select("*")
    .maybeSingle();
  if (error) throw mapProviderEventError(error);
}

async function updateParticipantForEvent(
  serviceClient: SupabaseActionClient,
  room: LiveCourtRoomRow,
  event: LiveKitWebhookEvent,
  eventName: string,
): Promise<void> {
  const identity = stringValue(event.participant?.identity);
  if (!identity) return;

  const values: Record<string, unknown> = {
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (eventName === "participant_joined") {
    values.connection_status = "joined";
    values.left_at = null;
  }

  if (eventName === "participant_left") {
    values.connection_status = "left";
    values.left_at = new Date().toISOString();
  }

  if (eventName === "track_published" && isCameraTrack(event)) {
    values.video_enabled = true;
  }

  if (eventName === "track_unpublished" && isCameraTrack(event)) {
    values.video_enabled = false;
  }

  if (Object.keys(values).length <= 2) return;

  const { error } = await serviceClient
    .from("live_court_participants")
    .update(values)
    .eq("live_court_room_id", room.id)
    .eq("user_id", identity)
    .select("*")
    .maybeSingle();
  if (error) throw mapProviderEventError(error);
}

async function updateRecordingForEvent(
  serviceClient: SupabaseActionClient,
  room: LiveCourtRoomRow,
  event: LiveKitWebhookEvent,
  eventName: string,
): Promise<void> {
  if (eventName !== "egress_started" && eventName !== "egress_ended") return;

  const egressId = stringValue(event.egressInfo?.egressId) ??
    stringValue(event.egressInfo?.egress_id) ??
    stringValue(event.id);
  if (!egressId) return;

  const now = new Date().toISOString();
  const values = {
    dare_id: room.dare_id,
    ended_at: eventName === "egress_ended" ? now : null,
    live_court_room_id: room.id,
    metadata: event.egressInfo ?? {},
    provider: "livekit",
    provider_recording_id: egressId,
    status: eventName === "egress_started"
      ? "recording"
      : egressFailed(event)
      ? "failed"
      : "processing",
    storage_path: recordingLocation(event),
    updated_at: now,
  };

  const { data, error } = await serviceClient
    .from("live_court_recordings")
    .update(values)
    .eq("provider", "livekit")
    .eq("provider_recording_id", egressId)
    .select("*")
    .maybeSingle();
  if (error) throw mapProviderEventError(error);
  if (data) return;

  const { error: insertError } = await serviceClient
    .from("live_court_recordings")
    .insert({
      ...values,
      created_at: now,
      started_at: eventName === "egress_started" ? now : null,
    });
  if (insertError && insertError.code !== "23505") {
    throw mapProviderEventError(insertError);
  }
}

function roomNameFromEvent(event: LiveKitWebhookEvent): string | null {
  return stringValue(event.room?.name) ??
    stringValue(event.egressInfo?.roomName) ??
    stringValue(event.egressInfo?.room_name);
}

function isCameraTrack(event: LiveKitWebhookEvent): boolean {
  const track = event.participant?.track as Record<string, unknown> | undefined;
  const source = stringValue(track?.source) ??
    stringValue((event.participant as Record<string, unknown> | undefined)?.source);
  return source === "CAMERA" || source === "camera";
}

function recordingLocation(event: LiveKitWebhookEvent): string | null {
  const fileResults = event.egressInfo?.fileResults;
  if (Array.isArray(fileResults)) {
    const first = fileResults[0] as Record<string, unknown> | undefined;
    return stringValue(first?.location) ?? stringValue(first?.filename);
  }

  return stringValue(event.egressInfo?.filePath) ??
    stringValue(event.egressInfo?.file_path);
}

function egressFailed(event: LiveKitWebhookEvent): boolean {
  const status = stringValue(event.egressInfo?.status);
  return status ? /fail|error/i.test(status) : false;
}

function recordingWasRunning(event: LiveKitWebhookEvent): boolean {
  const status = stringValue(event.egressInfo?.status);
  return status ? /record|active|running/i.test(status) : true;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function mapProviderEventError(error: SupabaseQueryError): ActionError {
  if (error.message === "live_court_not_found") {
    return new ActionError("NOT_FOUND", { cause: error });
  }

  return new ActionError("INTERNAL_ERROR", { cause: error });
}
