import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { ActionError } from "../_shared/errors.ts";
import {
  type QueryResponse,
  type SupabaseActionClient,
} from "../_shared/supabase.ts";
import { assertUuid } from "../_shared/validation.ts";
import { firstForwardedIp } from "../_shared/request.ts";
import { mapDareQueryError } from "./dare_errors.ts";

const SIGNED_READ_TTL_SECONDS = 5 * 60;
const READABLE_EVIDENCE_STATUSES = new Set(["uploaded", "accepted"]);

type JuryAssignmentRow = {
  blind_side_mapping: Record<string, unknown> | null;
  claimed_at: string | null;
  due_at: string | null;
  id: string;
  jury_case_id: string;
  juror_id: string;
  status: string;
};

type JuryCaseRow = {
  dare_id: string;
  evidence_a_id: string | null;
  evidence_b_id: string | null;
  id: string;
  reason: string;
  status: string;
  verdict: string | null;
  votes_needed: number;
};

type DareParticipantRow = {
  challenger_id: string | null;
  id: string;
  issuer_id: string;
};

type EvidenceObjectRow = {
  byte_size: number | null;
  id: string;
  media_type: string;
  status: string;
  storage_bucket: string;
  storage_path: string;
  uploaded_at: string | null;
};

type SignedReadBucket = {
  createSignedUrl(
    path: string,
    expiresIn: number,
  ): Promise<QueryResponse<{ signedUrl: string } | null>>;
};

export type JuryEvidenceFile = {
  byteSize: number | null;
  expiresAt: string;
  mediaType: string;
  signedUrl: string;
  uploadedAt: string | null;
};

export type JuryEvidenceSide = {
  body: string;
  files: JuryEvidenceFile[];
  filesCount: number;
  label: "A" | "B";
};

export type JuryEvidencePacketResponse = {
  assignmentId: string;
  caseId: string;
  claimedAt: string | null;
  dareId: string;
  dueAt: string | null;
  sides: [JuryEvidenceSide, JuryEvidenceSide];
  status: string;
  title: string;
  verdict: string | null;
  votesNeeded: number;
};

export async function getJuryEvidencePacket(
  request: Request,
  juryCaseId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<JuryEvidencePacketResponse> {
  const validatedCaseId = assertUuid(juryCaseId, "juryCaseId");
  const authUser = await requireAuthenticatedUser(client);
  const assignment = await loadOwnAssignment(
    serviceClient,
    validatedCaseId,
    authUser.id,
  );
  assertAssignmentReadable(assignment);

  const juryCase = await loadJuryCase(serviceClient, validatedCaseId);
  if (juryCase.status !== "jury_voting") {
    throw new ActionError("INVALID_STATE");
  }

  const dare = await loadDareParticipants(serviceClient, juryCase.dare_id);
  if (authUser.id === dare.issuer_id || authUser.id === dare.challenger_id) {
    throw new ActionError("FORBIDDEN");
  }

  const claimedAssignment = assignment.status === "assigned"
    ? await claimAssignment(serviceClient, assignment)
    : assignment;

  const data = await mapEvidencePacket(
    serviceClient,
    juryCase,
    claimedAssignment,
  );

  await insertReadAuditLog(request, serviceClient, authUser.id, data);
  return data;
}

async function loadOwnAssignment(
  serviceClient: SupabaseActionClient,
  juryCaseId: string,
  jurorId: string,
): Promise<JuryAssignmentRow> {
  const { data, error } = await serviceClient
    .from<JuryAssignmentRow>("jury_assignments")
    .select(
      "id,jury_case_id,juror_id,status,claimed_at,due_at,blind_side_mapping",
    )
    .eq("jury_case_id", juryCaseId)
    .eq("juror_id", jurorId)
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("FORBIDDEN");
  return data;
}

function assertAssignmentReadable(assignment: JuryAssignmentRow): void {
  if (assignment.status !== "assigned" && assignment.status !== "claimed") {
    throw new ActionError("FORBIDDEN");
  }

  if (assignment.due_at && Date.now() > new Date(assignment.due_at).getTime()) {
    throw new ActionError("INVALID_STATE");
  }
}

async function claimAssignment(
  serviceClient: SupabaseActionClient,
  assignment: JuryAssignmentRow,
): Promise<JuryAssignmentRow> {
  const claimedAt = new Date().toISOString();
  const { data, error } = await serviceClient
    .from<JuryAssignmentRow>("jury_assignments")
    .update({ status: "claimed", claimed_at: claimedAt })
    .eq("id", assignment.id)
    .eq("status", "assigned")
    .select(
      "id,jury_case_id,juror_id,status,claimed_at,due_at,blind_side_mapping",
    )
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  if (!data) {
    const reloaded = await loadOwnAssignment(
      serviceClient,
      assignment.jury_case_id,
      assignment.juror_id,
    );
    if (reloaded.status === "claimed") return reloaded;
    throw new ActionError("INVALID_STATE");
  }

  return data;
}

async function loadJuryCase(
  serviceClient: SupabaseActionClient,
  juryCaseId: string,
): Promise<JuryCaseRow> {
  const { data, error } = await serviceClient
    .from<JuryCaseRow>("jury_cases")
    .select(
      "id,dare_id,status,reason,verdict,votes_needed,evidence_a_id,evidence_b_id",
    )
    .eq("id", juryCaseId)
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("NOT_FOUND");
  return data;
}

async function loadDareParticipants(
  serviceClient: SupabaseActionClient,
  dareId: string,
): Promise<DareParticipantRow> {
  const { data, error } = await serviceClient
    .from<DareParticipantRow>("dares")
    .select("id,issuer_id,challenger_id")
    .eq("id", dareId)
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("NOT_FOUND");
  return data;
}

async function mapEvidencePacket(
  serviceClient: SupabaseActionClient,
  juryCase: JuryCaseRow,
  assignment: JuryAssignmentRow,
): Promise<JuryEvidencePacketResponse> {
  const [sideA, sideB] = await Promise.all([
    mapEvidenceSide(
      serviceClient,
      "A",
      juryCase.reason,
      juryCase.evidence_a_id,
    ),
    mapEvidenceSide(
      serviceClient,
      "B",
      juryCase.reason,
      juryCase.evidence_b_id,
    ),
  ]);

  return {
    assignmentId: assignment.id,
    caseId: juryCase.id,
    claimedAt: assignment.claimed_at,
    dareId: juryCase.dare_id,
    dueAt: assignment.due_at,
    sides: [sideA, sideB],
    status: juryCase.status,
    title: `Jury case ${juryCase.id.slice(0, 8)}`,
    verdict: juryCase.verdict,
    votesNeeded: juryCase.votes_needed,
  };
}

async function mapEvidenceSide(
  serviceClient: SupabaseActionClient,
  label: "A" | "B",
  reason: string,
  evidenceId: string | null,
): Promise<JuryEvidenceSide> {
  const evidence = evidenceId
    ? await loadEvidenceObject(serviceClient, evidenceId)
    : null;
  const files = evidence
    ? [await createSignedEvidenceFile(serviceClient, evidence)]
    : [];

  return {
    body: `Packet ${label} evidence for this dispute. Reason: ${reason}`,
    files,
    filesCount: files.length,
    label,
  };
}

async function loadEvidenceObject(
  serviceClient: SupabaseActionClient,
  evidenceId: string,
): Promise<EvidenceObjectRow> {
  const { data, error } = await serviceClient
    .from<EvidenceObjectRow>("evidence_objects")
    .select(
      "id,storage_bucket,storage_path,media_type,byte_size,status,uploaded_at",
    )
    .eq("id", evidenceId)
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("NOT_FOUND");
  if (!READABLE_EVIDENCE_STATUSES.has(data.status)) {
    throw new ActionError("INVALID_STATE");
  }
  return data;
}

async function createSignedEvidenceFile(
  serviceClient: SupabaseActionClient,
  evidence: EvidenceObjectRow,
): Promise<JuryEvidenceFile> {
  const bucket = serviceClient.storage?.from(evidence.storage_bucket) as
    | SignedReadBucket
    | undefined;
  if (!bucket?.createSignedUrl) {
    throw new ActionError("INTERNAL_ERROR", {
      message: "Supabase Storage signed reads are not configured.",
    });
  }

  const { data, error } = await bucket.createSignedUrl(
    evidence.storage_path,
    SIGNED_READ_TTL_SECONDS,
  );
  if (error || !data) {
    throw new ActionError("PROVIDER_UNAVAILABLE", {
      message: "Could not create an evidence read URL.",
      cause: error,
    });
  }

  return {
    byteSize: evidence.byte_size,
    expiresAt: new Date(Date.now() + SIGNED_READ_TTL_SECONDS * 1000)
      .toISOString(),
    mediaType: evidence.media_type,
    signedUrl: data.signedUrl,
    uploadedAt: evidence.uploaded_at,
  };
}

async function insertReadAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  data: JuryEvidencePacketResponse,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action: "jury.evidence_packet_read",
    target_type: "jury_case",
    target_id: data.caseId,
    metadata: {
      assignmentId: data.assignmentId,
      files: data.sides.map((side) => ({
        label: side.label,
        filesCount: side.filesCount,
      })),
    },
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
