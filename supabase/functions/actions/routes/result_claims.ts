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
import { type SupabaseActionClient } from "../_shared/supabase.ts";
import {
  assertOneOf,
  assertOptionalString,
  assertRecord,
  assertUuid,
  validationError,
} from "../_shared/validation.ts";
import { mapDareQueryError } from "./dare_errors.ts";

const RESULT_OUTCOMES = [
  "issuer_won",
  "challenger_won",
  "performer_completed",
  "void",
  "dispute",
] as const;

const WITNESS_VOTES = ["A", "B"] as const;

type ResultClaimPayload = {
  claimedOutcome: typeof RESULT_OUTCOMES[number];
  claimedWinnerId?: string | null;
  evidenceObjectIds: string[];
  rationale?: string;
};

type WitnessVotePayload = {
  vote: typeof WITNESS_VOTES[number];
};

type WitnessAttendanceRpcRow = {
  attendance_id: string;
  dare_id: string;
  eligible_to_vote: boolean;
  joined_at: string;
  last_seen_at: string;
  user_id: string;
  vote_eligible_at: string;
};

type ResultClaimRpcRow = {
  agreed_winner_id: string | null;
  claim_id: string;
  claim_state: "agreed" | "conflicted" | "dispute_requested" | "pending";
  claimed_outcome: ResultClaimPayload["claimedOutcome"];
  claimed_winner_id: string | null;
  claims_count: number;
  court_phase: "active" | "awaiting_result" | "completed" | "disputed";
  dare_id: string;
  dare_status: "active" | "awaiting_result" | "completed" | "dispute_pending";
  resolution_type: "witnessed" | "evidence";
  user_id: string;
};

type WitnessVoteRpcRow = {
  dare_id: string;
  phase: "active" | "awaiting_result";
  vote: "A" | "B";
  vote_id: string;
  voter_id: string;
  votes_a: number;
  votes_b: number;
};

export type ResultClaimResponse = {
  agreedWinnerId: string | null;
  claimId: string;
  claimState: ResultClaimRpcRow["claim_state"];
  claimedOutcome: ResultClaimPayload["claimedOutcome"];
  claimedWinnerId: string | null;
  claimsCount: number;
  courtPhase: ResultClaimRpcRow["court_phase"];
  dareId: string;
  dareStatus: ResultClaimRpcRow["dare_status"];
  resolutionType: ResultClaimRpcRow["resolution_type"];
  userId: string;
};

export type WitnessVoteResponse = {
  dareId: string;
  phase: WitnessVoteRpcRow["phase"];
  vote: "A" | "B";
  voteId: string;
  voterId: string;
  votesA: number;
  votesB: number;
};

export type WitnessAttendanceResponse = {
  attendanceId: string;
  dareId: string;
  eligibleToVote: boolean;
  joinedAt: string;
  lastSeenAt: string;
  userId: string;
  voteEligibleAt: string;
};

export async function recordWitnessAttendance(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: WitnessAttendanceResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    validatePayload: validateEmptyPayload,
  });
  const row = await callRecordWitnessAttendanceRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
  );
  const data = mapWitnessAttendanceResponse(row);
  await insertResultAuditLog(
    request,
    serviceClient,
    authUser.id,
    "dare.witness_attendance_recorded",
    data.attendanceId,
    data,
  );

  return { requestId: envelope.requestId, data };
}

export async function submitResultClaim(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: ResultClaimResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateResultClaimPayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
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
    return {
      requestId: envelope.requestId,
      data: stored.responseBody as ResultClaimResponse,
    };
  }

  const row = await callSubmitResultClaimRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    envelope.payload,
  );
  const data = mapResultClaimResponse(row);
  await insertResultAuditLog(
    request,
    serviceClient,
    authUser.id,
    "dare.result_claimed",
    data.claimId,
    data,
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

export async function submitWitnessVote(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: WitnessVoteResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateWitnessVotePayload,
  });
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
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
    return {
      requestId: envelope.requestId,
      data: stored.responseBody as WitnessVoteResponse,
    };
  }

  const row = await callSubmitWitnessVoteRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    envelope.payload,
  );
  const data = mapWitnessVoteResponse(row);
  await insertResultAuditLog(
    request,
    serviceClient,
    authUser.id,
    "dare.witness_vote_submitted",
    data.voteId,
    data,
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

function validateResultClaimPayload(value: unknown): ResultClaimPayload {
  const payload = assertRecord(value, "payload");
  return {
    claimedOutcome: assertOneOf(
      payload.claimedOutcome,
      RESULT_OUTCOMES,
      "payload.claimedOutcome",
    ),
    claimedWinnerId: payload.claimedWinnerId === undefined ||
        payload.claimedWinnerId === null
      ? null
      : assertUuid(payload.claimedWinnerId, "payload.claimedWinnerId"),
    evidenceObjectIds: assertEvidenceObjectIds(payload.evidenceObjectIds),
    rationale: assertOptionalString(payload.rationale, "payload.rationale", {
      min: 10,
      max: 2000,
    }),
  };
}

function validateWitnessVotePayload(value: unknown): WitnessVotePayload {
  const payload = assertRecord(value, "payload");
  return {
    vote: assertOneOf(payload.vote, WITNESS_VOTES, "payload.vote"),
  };
}

function validateEmptyPayload(value: unknown): Record<string, never> {
  assertRecord(value, "payload");
  return {};
}

function assertEvidenceObjectIds(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw validationError("payload.evidenceObjectIds", "must be an array");
  }
  if (value.length > 3) {
    throw validationError(
      "payload.evidenceObjectIds",
      "must contain at most 3 items",
    );
  }
  return value.map((id, index) =>
    assertUuid(id, `payload.evidenceObjectIds.${index}`)
  );
}

async function callRecordWitnessAttendanceRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
): Promise<WitnessAttendanceRpcRow> {
  const { data, error } = await serviceClient.rpc<WitnessAttendanceRpcRow[]>(
    "record_witness_attendance_action",
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

async function callSubmitResultClaimRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
  payload: ResultClaimPayload,
): Promise<ResultClaimRpcRow> {
  const { data, error } = await serviceClient.rpc<ResultClaimRpcRow[]>(
    "submit_result_claim_action",
    {
      p_claimed_outcome: payload.claimedOutcome,
      p_claimed_winner_id: payload.claimedWinnerId ?? null,
      p_dare_id: dareId,
      p_evidence_object_ids: payload.evidenceObjectIds,
      p_rationale: payload.rationale ?? null,
      p_user_id: userId,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callSubmitWitnessVoteRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
  payload: WitnessVotePayload,
): Promise<WitnessVoteRpcRow> {
  const { data, error } = await serviceClient.rpc<WitnessVoteRpcRow[]>(
    "submit_witness_vote_action",
    {
      p_dare_id: dareId,
      p_user_id: userId,
      p_vote: payload.vote,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapWitnessAttendanceResponse(
  row: WitnessAttendanceRpcRow,
): WitnessAttendanceResponse {
  return {
    attendanceId: row.attendance_id,
    dareId: row.dare_id,
    eligibleToVote: row.eligible_to_vote,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
    userId: row.user_id,
    voteEligibleAt: row.vote_eligible_at,
  };
}

function mapResultClaimResponse(row: ResultClaimRpcRow): ResultClaimResponse {
  return {
    agreedWinnerId: row.agreed_winner_id,
    claimId: row.claim_id,
    claimState: row.claim_state,
    claimedOutcome: row.claimed_outcome,
    claimedWinnerId: row.claimed_winner_id,
    claimsCount: row.claims_count,
    courtPhase: row.court_phase,
    dareId: row.dare_id,
    dareStatus: row.dare_status,
    resolutionType: row.resolution_type,
    userId: row.user_id,
  };
}

function mapWitnessVoteResponse(row: WitnessVoteRpcRow): WitnessVoteResponse {
  return {
    dareId: row.dare_id,
    phase: row.phase,
    vote: row.vote,
    voteId: row.vote_id,
    voterId: row.voter_id,
    votesA: row.votes_a,
    votesB: row.votes_b,
  };
}

async function insertResultAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  action: string,
  targetId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action,
    target_type: "dare",
    target_id: targetId,
    metadata,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
