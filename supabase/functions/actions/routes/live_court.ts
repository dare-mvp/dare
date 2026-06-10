import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { parseActionEnvelope } from "../_shared/envelope.ts";
import { ActionError } from "../_shared/errors.ts";
import {
  checkIdempotency,
  hashBody,
  hashIdempotencyKey,
  storeIdempotencyResult,
} from "../_shared/idempotency.ts";
import {
  createLiveKitGateway,
  type LiveKitGateway,
  type LiveKitRecordingStartResult,
  type LiveKitRoomAccess,
} from "../_shared/livekit.ts";
import { firstForwardedIp } from "../_shared/request.ts";
import { type SupabaseActionClient } from "../_shared/supabase.ts";
import {
  assertBoolean,
  assertOneOf,
  assertRecord,
  assertUuid,
} from "../_shared/validation.ts";
import { mapDareQueryError } from "./dare_errors.ts";

const CONNECTION_STATUSES = ["joined", "reconnecting", "left"] as const;

type LiveCourtEnterPayload = {
  audioEnabled: boolean;
  recordingConsent: boolean;
  videoEnabled: boolean;
};

type LiveCourtPresencePayload = LiveCourtEnterPayload & {
  connectionStatus: typeof CONNECTION_STATUSES[number];
};

type LiveCourtStateRpcRow = {
  live_court_room_id: string | null;
  dare_id: string;
  court_session_id: string;
  provider:
    | "agora"
    | "custom"
    | "daily"
    | "livekit"
    | "mux"
    | "provider_pending";
  provider_room_id: string;
  provider_token: string | null;
  viewer_role: "participant_a" | "participant_b" | "spectator";
  room_status: "cancelled" | "created" | "ended" | "live";
  recording_required: boolean;
  recording_status:
    | "available"
    | "disabled"
    | "failed"
    | "not_started"
    | "processing"
    | "recording";
  participant_count: number;
  spectator_count: number;
  issuer_live: boolean;
  challenger_live: boolean;
  viewer_joined: boolean;
  live_requirement_met: boolean;
};

export type LiveCourtStateResponse = {
  challengerLive: boolean;
  courtSessionId: string;
  dareId: string;
  issuerLive: boolean;
  liveCourtRoomId: string | null;
  liveRequirementMet: boolean;
  participantCount: number;
  provider: LiveCourtStateRpcRow["provider"];
  providerRoomId: string;
  providerToken: string | null;
  providerUrl: string | null;
  recordingRequired: boolean;
  recordingStatus: LiveCourtStateRpcRow["recording_status"];
  roomStatus: LiveCourtStateRpcRow["room_status"];
  spectatorCount: number;
  viewerJoined: boolean;
  viewerRole: LiveCourtStateRpcRow["viewer_role"];
};

export async function getLiveCourtState(
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
  liveKitGateway: LiveKitGateway = createLiveKitGateway(),
): Promise<LiveCourtStateResponse> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const row = await callGetLiveCourtStateRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
  );
  const data = mapLiveCourtState(row);
  if (data.provider !== "livekit" || !data.liveCourtRoomId) return data;
  return withLiveKitAccess(data, await createLiveKitAccess(liveKitGateway, authUser.id, data));
}

export async function enterLiveCourt(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
  liveKitGateway: LiveKitGateway = createLiveKitGateway(),
): Promise<{ requestId: string; data: LiveCourtStateResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateEnterPayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    action: "enter-live-court",
    dareId: validatedDareId,
    payload: envelope.payload,
  });
  const stored = await checkIdempotency(
    keyHash,
    bodyHash,
    authUser.id,
    serviceClient,
  );

  if (stored) {
    const replayRow = await callGetLiveCourtStateRpc(
      serviceClient,
      authUser.id,
      validatedDareId,
    );
    const replayData = await attachLiveKitAccessIfAvailable(
      liveKitGateway,
      authUser.id,
      mapLiveCourtState(replayRow),
    );
    return {
      requestId: envelope.requestId,
      data: replayData,
    };
  }

  const row = await callEnterLiveCourtRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    envelope.payload,
  );
  let data = mapLiveCourtState(row);
  const liveKitAccess = await ensureLiveKitCourtRoom(
    liveKitGateway,
    serviceClient,
    authUser.id,
    data,
  );
  if (liveKitAccess) {
    const refreshedRow = await callGetLiveCourtStateRpc(
      serviceClient,
      authUser.id,
      validatedDareId,
    );
    data = withLiveKitAccess(mapLiveCourtState(refreshedRow), liveKitAccess);
  }

  await insertLiveCourtAuditLog(
    request,
    serviceClient,
    authUser.id,
    "live_court.entered",
    data,
  );
  await storeIdempotencyResult(
    keyHash,
    bodyHash,
    authUser.id,
    200,
    sanitizeLiveCourtStateForStorage(data),
    serviceClient,
  );

  return { requestId: envelope.requestId, data };
}

export async function recordLiveCourtPresence(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
  liveKitGateway: LiveKitGateway = createLiveKitGateway(),
): Promise<{ requestId: string; data: LiveCourtStateResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    validatePayload: validatePresencePayload,
  });
  const row = await callRecordLiveCourtPresenceRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    envelope.payload,
  );
  let data = mapLiveCourtState(row);
  if (data.provider === "livekit" && data.liveCourtRoomId) {
    data = await attachLiveKitAccessIfAvailable(liveKitGateway, authUser.id, data);
  }
  await insertLiveCourtAuditLog(
    request,
    serviceClient,
    authUser.id,
    "live_court.presence_recorded",
    data,
  );

  return { requestId: envelope.requestId, data };
}

function validateEnterPayload(value: unknown): LiveCourtEnterPayload {
  const payload = assertRecord(value, "payload");
  return {
    audioEnabled: assertBoolean(payload.audioEnabled, "payload.audioEnabled"),
    recordingConsent: assertBoolean(
      payload.recordingConsent,
      "payload.recordingConsent",
    ),
    videoEnabled: assertBoolean(payload.videoEnabled, "payload.videoEnabled"),
  };
}

function validatePresencePayload(value: unknown): LiveCourtPresencePayload {
  const payload = assertRecord(value, "payload");
  return {
    ...validateEnterPayload(value),
    connectionStatus: assertOneOf(
      payload.connectionStatus,
      CONNECTION_STATUSES,
      "payload.connectionStatus",
    ),
  };
}

async function callGetLiveCourtStateRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
): Promise<LiveCourtStateRpcRow> {
  const { data, error } = await serviceClient.rpc<LiveCourtStateRpcRow[]>(
    "get_live_court_state_action",
    {
      p_dare_id: dareId,
      p_user_id: userId,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callEnterLiveCourtRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
  payload: LiveCourtEnterPayload,
): Promise<LiveCourtStateRpcRow> {
  const { data, error } = await serviceClient.rpc<LiveCourtStateRpcRow[]>(
    "enter_live_court_action",
    {
      p_audio_enabled: payload.audioEnabled,
      p_dare_id: dareId,
      p_recording_consent: payload.recordingConsent,
      p_user_id: userId,
      p_video_enabled: payload.videoEnabled,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callRecordLiveCourtPresenceRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
  payload: LiveCourtPresencePayload,
): Promise<LiveCourtStateRpcRow> {
  const { data, error } = await serviceClient.rpc<LiveCourtStateRpcRow[]>(
    "record_live_court_presence_action",
    {
      p_audio_enabled: payload.audioEnabled,
      p_connection_status: payload.connectionStatus,
      p_dare_id: dareId,
      p_recording_consent: payload.recordingConsent,
      p_user_id: userId,
      p_video_enabled: payload.videoEnabled,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapLiveCourtState(row: LiveCourtStateRpcRow): LiveCourtStateResponse {
  return {
    challengerLive: row.challenger_live,
    courtSessionId: row.court_session_id,
    dareId: row.dare_id,
    issuerLive: row.issuer_live,
    liveCourtRoomId: row.live_court_room_id,
    liveRequirementMet: row.live_requirement_met,
    participantCount: row.participant_count,
    provider: row.provider,
    providerRoomId: row.provider_room_id,
    providerToken: row.provider_token,
    providerUrl: null,
    recordingRequired: row.recording_required,
    recordingStatus: row.recording_status,
    roomStatus: row.room_status,
    spectatorCount: row.spectator_count,
    viewerJoined: row.viewer_joined,
    viewerRole: row.viewer_role,
  };
}

async function attachLiveKitAccessIfAvailable(
  liveKitGateway: LiveKitGateway,
  userId: string,
  data: LiveCourtStateResponse,
): Promise<LiveCourtStateResponse> {
  if (data.provider !== "livekit" || !data.liveCourtRoomId) return data;
  return withLiveKitAccess(
    data,
    await createLiveKitAccess(liveKitGateway, userId, data),
  );
}

async function ensureLiveKitCourtRoom(
  liveKitGateway: LiveKitGateway,
  serviceClient: SupabaseActionClient,
  userId: string,
  data: LiveCourtStateResponse,
): Promise<LiveKitRoomAccess | null> {
  if (!data.viewerJoined || !data.liveCourtRoomId) return null;
  const providerRoomId = getLiveKitRoomName(data.dareId);
  await liveKitGateway.ensureRoom({
    courtSessionId: data.courtSessionId,
    dareId: data.dareId,
    roomName: providerRoomId,
  });

  const { error } = await serviceClient
    .from("live_court_rooms")
    .update({
      provider: "livekit",
      provider_room_id: providerRoomId,
      metadata: {
        liveKitRoomName: providerRoomId,
        provisionedBy: "actions/live-court",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.liveCourtRoomId)
    .select("*")
    .maybeSingle();
  if (error) throw mapDareQueryError(error);

  await ensureLiveKitCourtRecording(
    liveKitGateway,
    serviceClient,
    data,
  );

  return createLiveKitAccess(liveKitGateway, userId, {
    ...data,
    provider: "livekit",
    providerRoomId,
  });
}

async function ensureLiveKitCourtRecording(
  liveKitGateway: LiveKitGateway,
  serviceClient: SupabaseActionClient,
  data: LiveCourtStateResponse,
): Promise<void> {
  if (!data.liveCourtRoomId || data.viewerRole === "spectator") return;
  if (data.recordingRequired !== true) return;
  if (data.recordingStatus === "recording" || data.recordingStatus === "processing" || data.recordingStatus === "available") {
    return;
  }

  const recording = await liveKitGateway.startRoomRecording({
    courtSessionId: data.courtSessionId,
    dareId: data.dareId,
    roomName: getLiveKitRoomName(data.dareId),
  });
  if (!recording) {
    await markLiveKitRecordingUnconfigured(serviceClient, data);
    return;
  }

  await persistLiveKitRecordingStart(serviceClient, data, recording);
}

async function markLiveKitRecordingUnconfigured(
  serviceClient: SupabaseActionClient,
  data: LiveCourtStateResponse,
): Promise<void> {
  const { error } = await serviceClient
    .from("live_court_rooms")
    .update({
      metadata: {
        egressConfigured: false,
        egressProvider: "livekit",
        egressSkippedReason: "s3_output_not_configured",
        liveKitRoomName: getLiveKitRoomName(data.dareId),
        provisionedBy: "actions/live-court",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.liveCourtRoomId)
    .select("*")
    .maybeSingle();
  if (error) throw mapDareQueryError(error);
}

async function persistLiveKitRecordingStart(
  serviceClient: SupabaseActionClient,
  data: LiveCourtStateResponse,
  recording: LiveKitRecordingStartResult,
): Promise<void> {
  const now = new Date().toISOString();
  const values = {
    dare_id: data.dareId,
    live_court_room_id: data.liveCourtRoomId,
    metadata: {
      egressStartedBy: "actions/live-court",
      providerRoomId: getLiveKitRoomName(data.dareId),
    },
    provider: recording.provider,
    provider_recording_id: recording.egressId,
    started_at: now,
    status: recording.recordingStatus,
    storage_bucket: recording.storageBucket,
    storage_path: recording.storagePath,
    updated_at: now,
  };

  const { data: existing, error } = await serviceClient
    .from("live_court_recordings")
    .update(values)
    .eq("provider", "livekit")
    .eq("provider_recording_id", recording.egressId)
    .select("*")
    .maybeSingle();
  if (error) throw mapDareQueryError(error);

  if (!existing) {
    const { error: insertError } = await serviceClient
      .from("live_court_recordings")
      .insert({
        ...values,
        created_at: now,
      });
    if (insertError && insertError.code !== "23505") {
      throw mapDareQueryError(insertError);
    }
  }

  const { error: roomError } = await serviceClient
    .from("live_court_rooms")
    .update({
      metadata: {
        egressConfigured: true,
        egressProvider: "livekit",
        liveKitRoomName: getLiveKitRoomName(data.dareId),
        providerRecordingId: recording.egressId,
        provisionedBy: "actions/live-court",
      },
      recording_started_at: now,
      recording_status: recording.recordingStatus,
      updated_at: now,
    })
    .eq("id", data.liveCourtRoomId)
    .select("*")
    .maybeSingle();
  if (roomError) throw mapDareQueryError(roomError);
}

async function createLiveKitAccess(
  liveKitGateway: LiveKitGateway,
  userId: string,
  data: LiveCourtStateResponse,
): Promise<LiveKitRoomAccess> {
  return await liveKitGateway.createParticipantToken({
    courtSessionId: data.courtSessionId,
    dareId: data.dareId,
    roomName: data.providerRoomId,
    userId,
    viewerRole: data.viewerRole,
  });
}

function withLiveKitAccess(
  data: LiveCourtStateResponse,
  liveKitAccess: LiveKitRoomAccess,
): LiveCourtStateResponse {
  return {
    ...data,
    provider: liveKitAccess.provider,
    providerRoomId: liveKitAccess.providerRoomId,
    providerToken: liveKitAccess.providerToken,
    providerUrl: liveKitAccess.providerUrl,
  };
}

function getLiveKitRoomName(dareId: string): string {
  return `dare-${dareId}`;
}

function sanitizeLiveCourtStateForStorage(
  data: LiveCourtStateResponse,
): LiveCourtStateResponse {
  return {
    ...data,
    providerToken: null,
    providerUrl: null,
  };
}

async function insertLiveCourtAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  action: string,
  data: LiveCourtStateResponse,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action,
    target_type: "court_session",
    target_id: data.courtSessionId,
    metadata: {
      dareId: data.dareId,
      liveCourtRoomId: data.liveCourtRoomId,
      provider: data.provider,
      providerRoomId: data.providerRoomId,
      recordingStatus: data.recordingStatus,
      viewerRole: data.viewerRole,
    },
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
