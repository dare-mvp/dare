import { ActionError } from "../_shared/errors.ts";
import { type SupabaseQueryError } from "../_shared/supabase.ts";

export function mapDareQueryError(error: SupabaseQueryError): ActionError {
  if (error.code === "42501") {
    return new ActionError("FORBIDDEN", { cause: error });
  }

  if (error.message === "kyc_required") {
    return new ActionError("KYC_REQUIRED", { cause: error });
  }

  if (error.message === "account_not_active") {
    return new ActionError("ACCOUNT_RESTRICTED", { cause: error });
  }

  if (error.message === "kyc_verification_pending") {
    return new ActionError("INVALID_STATE", { cause: error });
  }

  if (error.message === "kyc_verification_not_pending") {
    return new ActionError("INVALID_STATE", { cause: error });
  }

  if (error.message === "kyc_verification_not_found") {
    return new ActionError("NOT_FOUND", { cause: error });
  }

  if (
    [
      "invalid_kyc_tier",
      "invalid_kyc_documents",
      "invalid_kyc_verdict",
      "kyc_tier_granted_required",
    ].includes(error.message ?? "")
  ) {
    return new ActionError("INVALID_STATE", { cause: error });
  }

  if (error.message === "insufficient_funds") {
    return new ActionError("INSUFFICIENT_FUNDS", { cause: error });
  }

  if (error.message === "active_court_commitment") {
    return new ActionError("ACTIVE_COURT_COMMITMENT", { cause: error });
  }

  if (error.message === "live_court_required") {
    return new ActionError("LIVE_COURT_REQUIRED", { cause: error });
  }

  if (
    ["account_restricted", "wallet_restricted", "target_restricted"].includes(
      error.message ?? "",
    )
  ) {
    return new ActionError("ACCOUNT_RESTRICTED", { cause: error });
  }

  if (
    [
      "user_not_found",
      "profile_not_found",
      "wallet_not_found",
      "target_not_found",
      "dare_not_found",
      "court_not_found",
      "question_not_found",
      "jury_case_not_found",
      "jury_assignment_not_found",
      "evidence_not_found",
      "notification_not_found",
      "withdrawal_not_found",
    ]
      .includes(error.message ?? "")
  ) {
    return new ActionError("NOT_FOUND", { cause: error });
  }

  if (
    [
      "self_challenge",
      "invalid_category",
      "dare_not_acceptable",
      "invalid_dare_state",
      "invalid_court_state",
      "invalid_court_phase",
      "invalid_round_count",
      "invalid_round_index",
      "invalid_selected_option",
      "question_pool_insufficient",
      "question_window_closed",
      "question_not_assigned",
      "question_not_delivered",
      "no_question_available",
      "court_still_active",
      "dispute_window_open",
      "dispute_window_closed",
      "invalid_dispute_reason",
      "invalid_dispute_summary",
      "too_many_evidence_objects",
      "invalid_verdict",
      "invalid_admin_note",
      "invalid_jury_case_state",
      "invalid_assignment_count",
      "invalid_vote",
      "invalid_vote_rationale",
      "jury_assignment_expired",
      "invalid_evidence_file_name",
      "invalid_evidence_mime_type",
      "invalid_evidence_file_size",
      "invalid_evidence_content_hash",
      "invalid_evidence_state",
      "evidence_slot_filled",
      "evidence_required",
      "invalid_claimed_winner",
      "invalid_self_exclusion_duration",
      "invalid_self_exclusion_reason",
      "self_exclusion_active",
      "cooling_off_active",
      "escrow_not_found",
      "platform_wallet_not_found",
      "invalid_admin_action",
      "invalid_account_state",
      "invalid_withdrawal_state",
      "invalid_resolution_type",
      "invalid_result_claim",
      "invalid_live_court_state",
      "invalid_witness_vote",
      "participant_cannot_witness_vote",
      "witness_attendance_required",
      "witness_attendance_not_eligible",
      "livekit_witness_presence_required",
      "witness_not_eligible",
      "result_not_ready",
    ].includes(
      error.message ?? "",
    )
  ) {
    return new ActionError("INVALID_STATE", { cause: error });
  }

  if (["not_participant", "admin_required"].includes(error.message ?? "")) {
    return new ActionError("FORBIDDEN", { cause: error });
  }

  if (error.message === "answer_already_submitted") {
    return new ActionError("ALREADY_PROCESSED", { cause: error });
  }

  if (error.message === "settlement_already_processed") {
    return new ActionError("ALREADY_PROCESSED", { cause: error });
  }

  if (
    [
      "duplicate_dispute",
      "dispute_already_closed",
      "jury_vote_already_submitted",
      "result_claim_already_submitted",
      "witness_vote_already_submitted",
      "cancellation_already_processed",
    ].includes(
      error.message ?? "",
    )
  ) {
    return new ActionError("ALREADY_PROCESSED", { cause: error });
  }

  if (
    [
      "jury_pool_insufficient",
      "evidence_limit_exceeded",
      "responsible_gaming_limit",
    ].includes(
      error.message ?? "",
    )
  ) {
    return new ActionError("LIMIT_EXCEEDED", { cause: error });
  }

  if (error.message === "heartbeat_rate_limited") {
    return new ActionError("RATE_LIMITED", { cause: error });
  }

  if (error.code === "23505") {
    return new ActionError("IDEMPOTENCY_CONFLICT", { cause: error });
  }

  return new ActionError("INTERNAL_ERROR", {
    message: "Database operation failed.",
    cause: error,
  });
}
