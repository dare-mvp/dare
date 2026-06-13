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
  assertOneOf,
  assertRecord,
  assertUuid,
} from "../_shared/validation.ts";
import { mapDareQueryError } from "./dare_errors.ts";
import {
  insertAcceptAuditLog,
  insertAcceptNotification,
} from "./dare_side_effects.ts";

type DareType = "skill" | "task";
type FundingModel = "two_sided_stake" | "darer_reward";

export type AcceptQuoteDareRow = {
  challenger_id: string | null;
  currency: "NGN";
  dare_type: DareType | null;
  funding_model: FundingModel | null;
  id: string;
  issuer_id: string;
  platform_fee: number | null;
  resolution_type?: "answer_key" | "witnessed" | "evidence" | null;
  reward_amount: number | null;
  stake_amount: number;
  status: string;
  title?: string | null;
  winner_payout: number | null;
};

type AcceptDareRpcRow = {
  dare_id: string;
  court_session_id: string;
  escrow_hold_id: string | null;
  ledger_entry_id: string | null;
  status: "ready_check";
  dare_type: DareType;
  funding_model: FundingModel;
  stake_amount: number;
  reward_amount: number;
  escrow_amount: number;
  currency: "NGN";
};

export type AcceptQuoteResponse = {
  canAccept: boolean;
  challengerStakeAmount: number;
  currency: "NGN";
  dareId: string;
  dareType: DareType;
  fundingModel: FundingModel;
  issuerEscrowAmount: number;
  performerStakeRequired: boolean;
  reasonCode:
    | "ACCOUNT_READY"
    | "ACTIVE_COURT_COMMITMENT"
    | "DARE_NOT_OPEN"
    | "SELF_CHALLENGE"
    | "TARGETED_TO_ANOTHER_USER";
  rewardAmount: number;
  settlementPlatformFeeAmount: number;
  stakeAmount: number;
  totalDueAmount: number;
  winnerPayoutAmount: number;
  copy: {
    confirmation: string;
    escrowLabel: string;
    primary: string;
    title: string;
  };
};

export type AcceptDareWithQuoteResponse = {
  challengerEscrowHoldId: string | null;
  challengerLedgerEntryId: string | null;
  courtSessionId: string;
  currency: "NGN";
  dareId: string;
  dareType: DareType;
  escrowAmount: number;
  fundingModel: FundingModel;
  quote: AcceptQuoteResponse;
  rewardAmount: number;
  stakeAmount: number;
  status: "ready_check";
};

type AcceptQuoteConfirmationPayload = {
  challengerStakeAmount: number;
  dareType: DareType;
  fundingModel: FundingModel;
  rewardAmount: number;
  stakeAmount: number;
  totalDueAmount: number;
};

export async function getAcceptDareQuote(
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<AcceptQuoteResponse> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const dare = await readDareForAcceptQuote(serviceClient, validatedDareId);
  const hasBlockingCommitment = await hasAcceptBlockingCourtCommitment(
    serviceClient,
    dare,
    authUser.id,
  );
  return buildAcceptQuote(dare, authUser.id, hasBlockingCommitment);
}

export async function acceptDareWithQuote(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: AcceptDareWithQuoteResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
  });
  const expectedQuote = parseAcceptQuoteConfirmation(envelope.payload);
  const keyHash = await hashIdempotencyKey(envelope.idempotencyKey!);
  const bodyHash = await hashBody({
    action: "accept-with-quote",
    dareId: validatedDareId,
    expectedQuote,
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
      data: stored.responseBody as AcceptDareWithQuoteResponse,
    };
  }

  const dare = await readDareForAcceptQuote(serviceClient, validatedDareId);
  const hasBlockingCommitment = await hasAcceptBlockingCourtCommitment(
    serviceClient,
    dare,
    authUser.id,
  );
  const quote = buildAcceptQuote(dare, authUser.id, hasBlockingCommitment);
  assertQuoteAcceptable(quote);
  assertQuoteMatchesExpected(quote, expectedQuote);

  const rpcRow = await callAcceptDareRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    `accept_dare:${keyHash}:challenger`,
  );
  const data = mapAcceptDareWithQuoteResponse(rpcRow, quote);
  await insertAcceptAuditLog(request, serviceClient, authUser.id, data);
  await insertAcceptNotification(serviceClient, authUser.id, data);
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

export function buildAcceptQuote(
  dare: AcceptQuoteDareRow,
  challengerId: string,
  hasBlockingCommitment = false,
): AcceptQuoteResponse {
  const dareType = dare.dare_type ?? "skill";
  const fundingModel = dare.funding_model ??
    (dareType === "task" ? "darer_reward" : "two_sided_stake");
  const stakeAmount = nonNegativeInteger(dare.stake_amount);
  const rewardAmount = nonNegativeInteger(dare.reward_amount ?? 0);
  const settlementPlatformFeeAmount = nonNegativeInteger(
    dare.platform_fee ?? 0,
  );
  const winnerPayoutAmount = nonNegativeInteger(dare.winner_payout ?? 0);
  const isTask = dareType === "task";
  const isTargetedToAnotherUser = dare.challenger_id !== null &&
    dare.challenger_id !== challengerId;
  const reasonCode = dare.issuer_id === challengerId
    ? "SELF_CHALLENGE"
    : hasBlockingCommitment
    ? "ACTIVE_COURT_COMMITMENT"
    : dare.status !== "open" &&
        !(dare.status === "targeted_pending" &&
          dare.challenger_id === challengerId)
    ? "DARE_NOT_OPEN"
    : isTargetedToAnotherUser
    ? "TARGETED_TO_ANOTHER_USER"
    : "ACCOUNT_READY";
  const canAccept = reasonCode === "ACCOUNT_READY";

  return {
    canAccept,
    challengerStakeAmount: isTask ? 0 : stakeAmount,
    currency: dare.currency,
    dareId: dare.id,
    dareType,
    fundingModel,
    issuerEscrowAmount: isTask ? rewardAmount : stakeAmount,
    performerStakeRequired: !isTask,
    reasonCode,
    rewardAmount,
    settlementPlatformFeeAmount,
    stakeAmount,
    totalDueAmount: isTask ? 0 : stakeAmount,
    winnerPayoutAmount,
    copy: isTask
      ? {
        confirmation:
          "Accepting reserves your performer slot. No performer stake is locked.",
        escrowLabel: "Performer money locked",
        primary:
          "The Darer-funded reward is already held in escrow for settlement.",
        title: "Task acceptance",
      }
      : {
        confirmation:
          "Accepting locks your challenger stake and opens ready-up.",
        escrowLabel: "Challenger stake",
        primary:
          "This Skill DARE uses two-sided stake escrow. Your stake is locked until settlement.",
        title: "Skill stake quote",
      },
  };
}

async function readDareForAcceptQuote(
  serviceClient: SupabaseActionClient,
  dareId: string,
): Promise<AcceptQuoteDareRow> {
  const { data, error } = await serviceClient
    .from<AcceptQuoteDareRow>("dares")
    .select(
      "id,issuer_id,challenger_id,status,dare_type,funding_model,resolution_type,stake_amount,reward_amount,platform_fee,winner_payout,currency,title",
    )
    .eq("id", dareId)
    .maybeSingle();
  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("NOT_FOUND");
  return data;
}

async function callAcceptDareRpc(
  serviceClient: SupabaseActionClient,
  challengerId: string,
  dareId: string,
  ledgerKey: string,
): Promise<AcceptDareRpcRow> {
  const { data, error } = await serviceClient.rpc<AcceptDareRpcRow[]>(
    "accept_dare_action",
    {
      p_challenger_id: challengerId,
      p_dare_id: dareId,
      p_ledger_idempotency_key: ledgerKey,
    },
  );

  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

function mapAcceptDareWithQuoteResponse(
  row: AcceptDareRpcRow,
  quote: AcceptQuoteResponse,
): AcceptDareWithQuoteResponse {
  return {
    challengerEscrowHoldId: row.escrow_hold_id,
    challengerLedgerEntryId: row.ledger_entry_id,
    courtSessionId: row.court_session_id,
    currency: row.currency,
    dareId: row.dare_id,
    dareType: row.dare_type,
    escrowAmount: row.escrow_amount,
    fundingModel: row.funding_model,
    quote,
    rewardAmount: row.reward_amount,
    stakeAmount: row.stake_amount,
    status: row.status,
  };
}

async function hasAcceptBlockingCourtCommitment(
  serviceClient: SupabaseActionClient,
  dare: AcceptQuoteDareRow,
  challengerId: string,
): Promise<boolean> {
  if (
    dare.issuer_id === challengerId ||
    (dare.status !== "open" &&
      !(dare.status === "targeted_pending" &&
        dare.challenger_id === challengerId)) ||
    (dare.challenger_id !== null && dare.challenger_id !== challengerId)
  ) {
    return false;
  }

  const challengerBusy = await hasActiveCourtCommitment(
    serviceClient,
    challengerId,
    dare.id,
  );
  if (challengerBusy) return true;

  const locksIssuer = (dare.dare_type ?? "skill") === "skill" ||
    dare.resolution_type === "witnessed";
  if (!locksIssuer) return false;

  return await hasActiveCourtCommitment(serviceClient, dare.issuer_id, dare.id);
}

async function hasActiveCourtCommitment(
  serviceClient: SupabaseActionClient,
  userId: string,
  excludeDareId: string,
): Promise<boolean> {
  const { data, error } = await serviceClient.rpc<boolean>(
    "has_active_court_commitment",
    {
      p_user_id: userId,
      p_exclude_dare_id: excludeDareId,
    },
  );
  if (error) throw mapDareQueryError(error);
  return data === true;
}

function assertQuoteAcceptable(quote: AcceptQuoteResponse): void {
  if (quote.canAccept) return;
  if (quote.reasonCode === "ACTIVE_COURT_COMMITMENT") {
    throw new ActionError("ACTIVE_COURT_COMMITMENT");
  }
  if (quote.reasonCode === "SELF_CHALLENGE") {
    throw new ActionError("INVALID_STATE");
  }
  if (quote.reasonCode === "TARGETED_TO_ANOTHER_USER") {
    throw new ActionError("FORBIDDEN");
  }
  throw new ActionError("INVALID_STATE");
}

function parseAcceptQuoteConfirmation(
  value: unknown,
): AcceptQuoteConfirmationPayload {
  const payload = assertRecord(value, "payload");
  return {
    challengerStakeAmount: assertInteger(
      payload.challengerStakeAmount,
      "payload.challengerStakeAmount",
      { min: 0 },
    ),
    dareType: assertOneOf(
      payload.dareType,
      ["skill", "task"] as const,
      "payload.dareType",
    ),
    fundingModel: assertOneOf(
      payload.fundingModel,
      ["two_sided_stake", "darer_reward"] as const,
      "payload.fundingModel",
    ),
    rewardAmount: assertInteger(payload.rewardAmount, "payload.rewardAmount", {
      min: 0,
    }),
    stakeAmount: assertInteger(payload.stakeAmount, "payload.stakeAmount", {
      min: 0,
    }),
    totalDueAmount: assertInteger(
      payload.totalDueAmount,
      "payload.totalDueAmount",
      { min: 0 },
    ),
  };
}

function assertQuoteMatchesExpected(
  quote: AcceptQuoteResponse,
  expected: AcceptQuoteConfirmationPayload,
): void {
  const matches =
    quote.challengerStakeAmount === expected.challengerStakeAmount &&
    quote.dareType === expected.dareType &&
    quote.fundingModel === expected.fundingModel &&
    quote.rewardAmount === expected.rewardAmount &&
    quote.stakeAmount === expected.stakeAmount &&
    quote.totalDueAmount === expected.totalDueAmount;

  if (!matches) {
    throw new ActionError("INVALID_STATE");
  }
}

function nonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
