import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { ActionError } from "../_shared/errors.ts";
import {
  type QueryResponse,
  type SupabaseActionClient,
} from "../_shared/supabase.ts";
import { assertUuid } from "../_shared/validation.ts";
import { mapDareQueryError } from "./dare_errors.ts";

type DareStatus =
  | "active"
  | "awaiting_result"
  | "completed"
  | "dispute_pending"
  | "forfeited"
  | "jury_closed"
  | "jury_open"
  | "settled"
  | string;

type CourtPhase =
  | "active"
  | "awaiting_result"
  | "completed"
  | "disputed"
  | "forfeited"
  | string;

type JuryCaseStatus =
  | "accepted_for_review"
  | "closed"
  | "escalated"
  | "filed"
  | "jury_assignment"
  | "jury_voting"
  | "settlement_pending"
  | "verdict_reached"
  | "voided"
  | string;

type LedgerType = "escrow_release" | "payout" | "platform_fee" | string;

export type SettlementDareRow = {
  challenger_id: string | null;
  completed_at: string | null;
  currency: "NGN";
  dare_type: "skill" | "task" | null;
  dispute_deadline_at: string | null;
  funding_model: "two_sided_stake" | "darer_reward" | null;
  id: string;
  issuer_id: string;
  platform_fee: number | null;
  reward_amount: number | null;
  settled_at: string | null;
  stake_amount: number;
  status: DareStatus;
  title?: string | null;
  winner_id: string | null;
  winner_payout: number | null;
};

export type SettlementCourtRow = {
  id: string;
  dare_id: string;
  phase: CourtPhase;
  score_a: number | null;
  score_b: number | null;
};

export type SettlementEscrowHoldRow = {
  amount: number;
  currency: "NGN";
  dare_id: string;
  hold_reason: string | null;
  id: string;
  released_at: string | null;
  status: "forfeited" | "held" | "refunded" | "released" | "voided" | string;
  user_id: string;
};

export type SettlementJuryCaseRow = {
  closed_at: string | null;
  dare_id: string;
  escalated_at: string | null;
  id: string;
  opened_at: string | null;
  opened_by_user_id: string;
  status: JuryCaseStatus;
  verdict: "A" | "B" | "escalate" | "overturn" | "uphold" | "void" | null;
  votes_needed: number | null;
};

export type SettlementLedgerEntryRow = {
  amount: number;
  dare_id: string;
  status: string;
  type: LedgerType;
};

export type SettlementStatusResponse = {
  court: {
    courtSessionId: string | null;
    phase: CourtPhase | null;
    scoreA: number;
    scoreB: number;
  };
  currency: "NGN";
  dareId: string;
  dareStatus: DareStatus;
  dareType: "skill" | "task";
  dispute: {
    canFileDispute: boolean;
    deadlineAt: string | null;
    secondsUntilDeadline: number | null;
    status: "closed" | "none" | "open" | "paused_by_jury";
  };
  fundingModel: "two_sided_stake" | "darer_reward";
  jury: {
    blockingSettlement: boolean;
    caseId: string | null;
    closedAt: string | null;
    openedAt: string | null;
    status: JuryCaseStatus | "none";
    verdict: SettlementJuryCaseRow["verdict"];
    votesNeeded: number | null;
  };
  money: {
    expectedPlatformFeeAmount: number;
    expectedPayoutAmount: number;
    expectedRefundAmount: number;
    heldAmount: number;
    holdSummary: {
      activeHeldAmount: number;
      disputedHeldAmount: number;
      forfeitedAmount: number;
      heldCount: number;
      refundedAmount: number;
      releasedAmount: number;
      voidedAmount: number;
    };
    postedPayoutAmount: number;
    postedPlatformFeeAmount: number;
    postedRefundAmount: number;
  };
  settlement: {
    eligible: boolean;
    reason:
      | "already_settled"
      | "dispute_window_open"
      | "jury_blocking"
      | "ready"
      | "result_not_ready";
  };
  winnerId: string | null;
  copyReady: {
    body: string;
    ctaLabel: string;
    state: "blocked" | "ready" | "settled" | "waiting";
    title: string;
  };
};

export async function getSettlementStatus(
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<SettlementStatusResponse> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const dare = await readSettlementDare(serviceClient, validatedDareId);
  assertCanReadSettlement(dare, authUser.id);

  const [court, escrowHolds, juryCases, ledgerEntries] = await Promise.all([
    readSettlementCourt(serviceClient, validatedDareId),
    readSettlementEscrowHolds(serviceClient, validatedDareId),
    readSettlementJuryCases(serviceClient, validatedDareId),
    readSettlementLedgerEntries(serviceClient, validatedDareId),
  ]);

  return buildSettlementStatusReadModel({
    court,
    dare,
    escrowHolds,
    juryCases,
    ledgerEntries,
    nowIso: new Date().toISOString(),
  });
}

export function buildSettlementStatusReadModel(params: {
  court: SettlementCourtRow | null;
  dare: SettlementDareRow;
  escrowHolds: SettlementEscrowHoldRow[];
  juryCases: SettlementJuryCaseRow[];
  ledgerEntries: SettlementLedgerEntryRow[];
  nowIso: string;
}): SettlementStatusResponse {
  const { court, dare, escrowHolds, ledgerEntries, nowIso } = params;
  const juryCase = latestJuryCase(params.juryCases);
  const juryBlocking = Boolean(juryCase && isBlockingJuryStatus(juryCase.status));
  const nowMs = Date.parse(nowIso);
  const deadlineMs = dare.dispute_deadline_at
    ? Date.parse(dare.dispute_deadline_at)
    : null;
  const secondsUntilDeadline = deadlineMs && Number.isFinite(deadlineMs)
    ? Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000))
    : null;
  const disputeStatus = getDisputeStatus(dare, juryBlocking, secondsUntilDeadline);
  const holdSummary = buildHoldSummary(escrowHolds);
  const heldAmount = holdSummary.activeHeldAmount + holdSummary.disputedHeldAmount;
  const postedPayoutAmount = sumLedger(ledgerEntries, "payout");
  const postedPlatformFeeAmount = sumLedger(ledgerEntries, "platform_fee");
  const postedRefundAmount = sumLedger(ledgerEntries, "escrow_release");
  const expectedPlatformFeeAmount = dare.winner_id
    ? Math.min(nonNegativeInteger(dare.platform_fee ?? 0), heldAmount)
    : 0;
  const expectedPayoutAmount = dare.winner_id
    ? expectedPayout(dare, heldAmount, expectedPlatformFeeAmount)
    : 0;
  const expectedRefundAmount = dare.winner_id ? 0 : heldAmount;
  const settlement = getSettlementEligibility(
    dare,
    juryBlocking,
    disputeStatus,
  );

  return {
    court: {
      courtSessionId: court?.id ?? null,
      phase: court?.phase ?? null,
      scoreA: nonNegativeInteger(court?.score_a ?? 0),
      scoreB: nonNegativeInteger(court?.score_b ?? 0),
    },
    currency: dare.currency,
    dareId: dare.id,
    dareStatus: dare.status,
    dareType: dare.dare_type ?? "skill",
    dispute: {
      canFileDispute: disputeStatus === "open",
      deadlineAt: dare.dispute_deadline_at,
      secondsUntilDeadline,
      status: disputeStatus,
    },
    fundingModel: dare.funding_model ??
      (dare.dare_type === "task" ? "darer_reward" : "two_sided_stake"),
    jury: {
      blockingSettlement: juryBlocking,
      caseId: juryCase?.id ?? null,
      closedAt: juryCase?.closed_at ?? null,
      openedAt: juryCase?.opened_at ?? null,
      status: juryCase?.status ?? "none",
      verdict: juryCase?.verdict ?? null,
      votesNeeded: juryCase?.votes_needed ?? null,
    },
    money: {
      expectedPlatformFeeAmount,
      expectedPayoutAmount,
      expectedRefundAmount,
      heldAmount,
      holdSummary,
      postedPayoutAmount,
      postedPlatformFeeAmount,
      postedRefundAmount,
    },
    settlement,
    winnerId: dare.winner_id,
    copyReady: getCopyReadyState(settlement.reason, dare, juryCase),
  };
}

async function readSettlementDare(
  serviceClient: SupabaseActionClient,
  dareId: string,
): Promise<SettlementDareRow> {
  const { data, error } = await serviceClient
    .from<SettlementDareRow>("dares")
    .select(
      "id,issuer_id,challenger_id,status,dare_type,funding_model,stake_amount,reward_amount,platform_fee,winner_payout,winner_id,currency,dispute_deadline_at,completed_at,settled_at,title",
    )
    .eq("id", dareId)
    .maybeSingle();
  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("NOT_FOUND");
  return data;
}

async function readSettlementCourt(
  serviceClient: SupabaseActionClient,
  dareId: string,
): Promise<SettlementCourtRow | null> {
  const { data, error } = await serviceClient
    .from<SettlementCourtRow>("court_sessions")
    .select("id,dare_id,phase,score_a,score_b")
    .eq("dare_id", dareId)
    .maybeSingle();
  if (error) throw mapDareQueryError(error);
  return data;
}

async function readSettlementEscrowHolds(
  serviceClient: SupabaseActionClient,
  dareId: string,
): Promise<SettlementEscrowHoldRow[]> {
  return selectMany<SettlementEscrowHoldRow>(
    serviceClient
      .from<SettlementEscrowHoldRow>("escrow_holds")
      .select("id,dare_id,user_id,amount,currency,status,hold_reason,released_at")
      .eq("dare_id", dareId),
  );
}

async function readSettlementJuryCases(
  serviceClient: SupabaseActionClient,
  dareId: string,
): Promise<SettlementJuryCaseRow[]> {
  return selectMany<SettlementJuryCaseRow>(
    serviceClient
      .from<SettlementJuryCaseRow>("jury_cases")
      .select(
        "id,dare_id,opened_by_user_id,status,verdict,votes_needed,opened_at,closed_at,escalated_at",
      )
      .eq("dare_id", dareId),
  );
}

async function readSettlementLedgerEntries(
  serviceClient: SupabaseActionClient,
  dareId: string,
): Promise<SettlementLedgerEntryRow[]> {
  return selectMany<SettlementLedgerEntryRow>(
    serviceClient
      .from<SettlementLedgerEntryRow>("ledger_entries")
      .select("dare_id,type,amount,status")
      .eq("dare_id", dareId),
  );
}

async function selectMany<T>(builder: unknown): Promise<T[]> {
  const { data, error } = (await builder) as QueryResponse<T[]>;
  if (error) throw mapDareQueryError(error);
  return data ?? [];
}

function assertCanReadSettlement(dare: SettlementDareRow, userId: string): void {
  if (dare.issuer_id === userId || dare.challenger_id === userId) return;
  throw new ActionError("FORBIDDEN");
}

function getDisputeStatus(
  dare: SettlementDareRow,
  juryBlocking: boolean,
  secondsUntilDeadline: number | null,
): SettlementStatusResponse["dispute"]["status"] {
  if (dare.status === "settled") return "closed";
  if (juryBlocking || dare.status === "dispute_pending" || dare.status === "jury_open") {
    return "paused_by_jury";
  }
  if (!dare.dispute_deadline_at) return "none";
  return secondsUntilDeadline && secondsUntilDeadline > 0 ? "open" : "closed";
}

function getSettlementEligibility(
  dare: SettlementDareRow,
  juryBlocking: boolean,
  disputeStatus: SettlementStatusResponse["dispute"]["status"],
): SettlementStatusResponse["settlement"] {
  if (dare.status === "settled") {
    return { eligible: false, reason: "already_settled" };
  }
  if (juryBlocking || dare.status === "dispute_pending" || dare.status === "jury_open") {
    return { eligible: false, reason: "jury_blocking" };
  }
  if (disputeStatus === "open") {
    return { eligible: false, reason: "dispute_window_open" };
  }
  if (["completed", "forfeited", "jury_closed"].includes(dare.status)) {
    return { eligible: true, reason: "ready" };
  }
  return { eligible: false, reason: "result_not_ready" };
}

function getCopyReadyState(
  reason: SettlementStatusResponse["settlement"]["reason"],
  dare: SettlementDareRow,
  juryCase: SettlementJuryCaseRow | null,
): SettlementStatusResponse["copyReady"] {
  if (reason === "already_settled") {
    return {
      body: "Payouts, refunds, and trust updates are final.",
      ctaLabel: "View wallet",
      state: "settled",
      title: "Settlement complete",
    };
  }
  if (reason === "ready") {
    return {
      body: dare.winner_id
        ? "The dispute window is closed. Settlement can release payout and trust updates."
        : "The dispute window is closed. Settlement can refund held escrow.",
      ctaLabel: "Settle now",
      state: "ready",
      title: "Ready to settle",
    };
  }
  if (reason === "jury_blocking") {
    return {
      body: juryCase?.id
        ? `Jury case ${juryCase.id} must close before payout or refund.`
        : "Jury review must close before payout or refund.",
      ctaLabel: "View dispute",
      state: "blocked",
      title: "Review blocking settlement",
    };
  }
  if (reason === "dispute_window_open") {
    return {
      body: "Payouts and refunds stay held until the dispute deadline passes.",
      ctaLabel: "Refresh status",
      state: "waiting",
      title: "Dispute window active",
    };
  }
  return {
    body: "The result is not ready for settlement yet.",
    ctaLabel: "Back to court",
    state: "waiting",
    title: "Waiting for result",
  };
}

function buildHoldSummary(
  holds: SettlementEscrowHoldRow[],
): SettlementStatusResponse["money"]["holdSummary"] {
  return {
    activeHeldAmount: sumHolds(holds, "held", "dare_active"),
    disputedHeldAmount: sumHolds(holds, "held", "dispute_pending"),
    forfeitedAmount: sumHolds(holds, "forfeited"),
    heldCount: holds.filter((hold) => hold.status === "held").length,
    refundedAmount: sumHolds(holds, "refunded"),
    releasedAmount: sumHolds(holds, "released"),
    voidedAmount: sumHolds(holds, "voided"),
  };
}

function sumHolds(
  holds: SettlementEscrowHoldRow[],
  status: SettlementEscrowHoldRow["status"],
  holdReason?: string,
): number {
  return holds
    .filter((hold) =>
      hold.status === status &&
      (!holdReason || (hold.hold_reason ?? "dare_active") === holdReason)
    )
    .reduce((total, hold) => total + nonNegativeInteger(hold.amount), 0);
}

function sumLedger(
  entries: SettlementLedgerEntryRow[],
  type: LedgerType,
): number {
  return entries
    .filter((entry) => entry.type === type && entry.status === "posted")
    .reduce((total, entry) => total + nonNegativeInteger(entry.amount), 0);
}

function expectedPayout(
  dare: SettlementDareRow,
  heldAmount: number,
  platformFeeAmount: number,
): number {
  const configuredPayout = nonNegativeInteger(dare.winner_payout ?? 0);
  if (configuredPayout > 0) {
    return Math.min(configuredPayout, Math.max(0, heldAmount - platformFeeAmount));
  }
  return Math.max(0, heldAmount - platformFeeAmount);
}

function latestJuryCase(
  cases: SettlementJuryCaseRow[],
): SettlementJuryCaseRow | null {
  return [...cases].sort((a, b) =>
    Date.parse(b.opened_at ?? "") - Date.parse(a.opened_at ?? "")
  )[0] ?? null;
}

function isBlockingJuryStatus(status: JuryCaseStatus): boolean {
  return [
    "accepted_for_review",
    "escalated",
    "filed",
    "jury_assignment",
    "jury_voting",
  ].includes(status);
}

function nonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
