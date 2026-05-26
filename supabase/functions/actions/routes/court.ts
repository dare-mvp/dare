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
  assertRecord,
  assertString,
  assertUuid,
} from "../_shared/validation.ts";
import { firstForwardedIp } from "../_shared/request.ts";
import { mapDareQueryError } from "./dare_errors.ts";

type ReadyDareRpcRow = {
  dare_id: string;
  court_session_id: string;
  dare_status: "ready_check" | "active";
  phase: "ready_check" | "active";
  player_a_ready: boolean;
  player_b_ready: boolean;
  server_start_time: string | null;
  server_end_time: string | null;
  assigned_rounds: number;
};

type ReadyDareResponse = {
  dareId: string;
  courtSessionId: string;
  dareStatus: "ready_check" | "active";
  phase: "ready_check" | "active";
  playerAReady: boolean;
  playerBReady: boolean;
  serverStartTime: string | null;
  serverEndTime: string | null;
  assignedRounds: number;
};

type CourtHeartbeatRpcRow = {
  dare_id: string;
  court_session_id: string;
  phase: "active";
  player_role: "A" | "B";
  player_a_heartbeat_at: string | null;
  player_b_heartbeat_at: string | null;
  reconnect_deadline: string;
};

type CourtHeartbeatResponse = {
  dareId: string;
  courtSessionId: string;
  phase: "active";
  playerRole: "A" | "B";
  playerAHeartbeatAt: string | null;
  playerBHeartbeatAt: string | null;
  reconnectDeadline: string;
};

type CurrentCourtQuestionRpcRow = {
  dare_id: string;
  court_session_id: string;
  question_id: string;
  round_index: number;
  prompt: string;
  options: unknown;
  total_rounds: number;
  answered_rounds: number;
  score_a: number;
  score_b: number;
  server_end_time: string;
  phase: "active";
};

type CurrentCourtQuestionResponse = {
  answeredRounds: number;
  courtSessionId: string;
  dareId: string;
  options: string[];
  phase: "active";
  prompt: string;
  questionId: string;
  roundIndex: number;
  scoreA: number;
  scoreB: number;
  serverEndTime: string;
  totalRounds: number;
};

type CourtChatPayload = {
  message: string;
};

type CourtChatDareRow = {
  challenger_id: string | null;
  id: string;
  issuer_id: string;
  status: string;
};

type CourtChatProfileRow = {
  username: string | null;
};

type CourtChatMessageResponse = {
  createdAt: string;
  dareId: string;
  message: string;
  messageId: string;
  moderationStatus: "visible";
  userId: string;
  usernameSnapshot: string | null;
};

export async function markDareReady(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: ReadyDareResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({ dareId: validatedDareId, action: "ready" });
  const stored = await checkIdempotency(
    keyHash,
    bodyHash,
    authUser.id,
    serviceClient,
  );

  if (stored) {
    return {
      requestId: envelope.requestId,
      data: stored.responseBody as ReadyDareResponse,
    };
  }

  const row = await callReadyDareRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
  );
  const data = mapReadyDareResponse(row);
  await insertReadyAuditLog(request, serviceClient, authUser.id, data);
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

export async function recordCourtHeartbeat(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: CourtHeartbeatResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request);
  const row = await callCourtHeartbeatRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
  );
  return {
    requestId: envelope.requestId,
    data: mapCourtHeartbeatResponse(row),
  };
}

export async function getCurrentCourtQuestion(
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<CurrentCourtQuestionResponse> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const row = await callCurrentCourtQuestionRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
  );
  return mapCurrentCourtQuestionResponse(row);
}

export async function sendCourtMessage(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: CourtChatMessageResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: parseCourtChatPayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    dareId: validatedDareId,
    message: envelope.payload.message,
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
      data: stored.responseBody as CourtChatMessageResponse,
    };
  }

  const dare = await getCourtChatDare(serviceClient, validatedDareId);
  assertCourtChatAllowed(dare, authUser.id);
  const usernameSnapshot = await getUsernameSnapshot(
    serviceClient,
    authUser.id,
  );
  const data = await insertCourtChatMessage(
    serviceClient,
    validatedDareId,
    authUser.id,
    usernameSnapshot,
    envelope.payload.message,
  );
  await insertCourtChatAuditLog(request, serviceClient, authUser.id, data);
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

async function callReadyDareRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
): Promise<ReadyDareRpcRow> {
  const { data, error } = await serviceClient.rpc<ReadyDareRpcRow[]>(
    "ready_dare_action",
    {
      p_user_id: userId,
      p_dare_id: dareId,
      p_round_count: 5,
    },
  );

  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callCourtHeartbeatRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
): Promise<CourtHeartbeatRpcRow> {
  const { data, error } = await serviceClient.rpc<CourtHeartbeatRpcRow[]>(
    "record_court_heartbeat_action",
    { p_user_id: userId, p_dare_id: dareId },
  );

  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function parseCourtChatPayload(value: unknown): CourtChatPayload {
  const payload = assertRecord(value, "payload");
  return {
    message: assertString(payload.message, "payload.message", {
      min: 1,
      max: 500,
    }),
  };
}

async function callCurrentCourtQuestionRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
): Promise<CurrentCourtQuestionRpcRow> {
  const { data, error } = await serviceClient.rpc<CurrentCourtQuestionRpcRow[]>(
    "get_current_court_question_action",
    { p_user_id: userId, p_dare_id: dareId },
  );

  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("NOT_FOUND");
  return row;
}

async function getCourtChatDare(
  serviceClient: SupabaseActionClient,
  dareId: string,
): Promise<CourtChatDareRow> {
  const { data, error } = await serviceClient
    .from<CourtChatDareRow>("dares")
    .select("id,issuer_id,challenger_id,status")
    .eq("id", dareId)
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("NOT_FOUND");
  return data;
}

function assertCourtChatAllowed(dare: CourtChatDareRow, userId: string): void {
  if (userId !== dare.issuer_id && userId !== dare.challenger_id) {
    throw new ActionError("FORBIDDEN");
  }

  if (!["ready_check", "active"].includes(dare.status)) {
    throw new ActionError("INVALID_STATE", {
      message: "Court chat is only available while the DARE is in court.",
      details: { status: dare.status },
    });
  }
}

async function getUsernameSnapshot(
  serviceClient: SupabaseActionClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await serviceClient
    .from<CourtChatProfileRow>("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  return data?.username ?? null;
}

async function insertCourtChatMessage(
  serviceClient: SupabaseActionClient,
  dareId: string,
  userId: string,
  usernameSnapshot: string | null,
  message: string,
): Promise<CourtChatMessageResponse> {
  const createdAt = new Date().toISOString();
  const messageId = crypto.randomUUID();
  const data: CourtChatMessageResponse = {
    createdAt,
    dareId,
    message,
    messageId,
    moderationStatus: "visible",
    userId,
    usernameSnapshot,
  };
  const { error } = await serviceClient.from("court_chat_messages").insert({
    id: messageId,
    dare_id: dareId,
    user_id: userId,
    username_snapshot: usernameSnapshot,
    message,
    moderation_status: "visible",
    created_at: createdAt,
  });

  if (error) throw mapDareQueryError(error);
  return data;
}

function mapReadyDareResponse(row: ReadyDareRpcRow): ReadyDareResponse {
  return {
    dareId: row.dare_id,
    courtSessionId: row.court_session_id,
    dareStatus: row.dare_status,
    phase: row.phase,
    playerAReady: row.player_a_ready,
    playerBReady: row.player_b_ready,
    serverStartTime: row.server_start_time,
    serverEndTime: row.server_end_time,
    assignedRounds: row.assigned_rounds,
  };
}

function mapCourtHeartbeatResponse(
  row: CourtHeartbeatRpcRow,
): CourtHeartbeatResponse {
  return {
    dareId: row.dare_id,
    courtSessionId: row.court_session_id,
    phase: row.phase,
    playerRole: row.player_role,
    playerAHeartbeatAt: row.player_a_heartbeat_at,
    playerBHeartbeatAt: row.player_b_heartbeat_at,
    reconnectDeadline: row.reconnect_deadline,
  };
}

function mapCurrentCourtQuestionResponse(
  row: CurrentCourtQuestionRpcRow,
): CurrentCourtQuestionResponse {
  if (
    !Array.isArray(row.options) ||
    !row.options.every((option) => typeof option === "string")
  ) {
    throw new ActionError("INTERNAL_ERROR", {
      message: "Question options are malformed.",
    });
  }

  return {
    answeredRounds: row.answered_rounds,
    courtSessionId: row.court_session_id,
    dareId: row.dare_id,
    options: row.options,
    phase: row.phase,
    prompt: row.prompt,
    questionId: row.question_id,
    roundIndex: row.round_index,
    scoreA: row.score_a,
    scoreB: row.score_b,
    serverEndTime: row.server_end_time,
    totalRounds: row.total_rounds,
  };
}

async function insertCourtChatAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  message: CourtChatMessageResponse,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action: "court.message_sent",
    target_type: "court_chat_message",
    target_id: message.messageId,
    metadata: {
      dareId: message.dareId,
      moderationStatus: message.moderationStatus,
    },
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}

async function insertReadyAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  ready: ReadyDareResponse,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action: "dare.ready_marked",
    target_type: "dare",
    target_id: ready.dareId,
    metadata: {
      phase: ready.phase,
      courtSessionId: ready.courtSessionId,
      assignedRounds: ready.assignedRounds,
    },
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
