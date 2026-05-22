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
  assertOptionalString,
  assertRecord,
  assertString,
  assertUuid,
} from "../_shared/validation.ts";
import { firstForwardedIp } from "../_shared/request.ts";
import { mapDareQueryError } from "./dare_errors.ts";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "video/mp4"] as const;

type EvidenceUploadPayload = {
  fileName: string;
  mimeType: typeof ALLOWED_MIME_TYPES[number];
  fileSizeBytes: number;
};

type EvidenceConfirmPayload = {
  evidenceObjectId: string;
  contentHash?: string;
};

type EvidenceUploadRpcRow = {
  evidence_object_id: string;
  dare_id: string;
  user_id: string;
  storage_bucket: string;
  storage_path: string;
  media_type: string;
  byte_size: number;
  status: "pending";
};

type EvidenceConfirmRpcRow = {
  evidence_object_id: string;
  jury_case_id: string;
  dare_id: string;
  side: "A" | "B";
  status: "uploaded";
  uploaded_at: string;
};

type EvidenceObjectRow = {
  storage_bucket: string;
  storage_path: string;
  status: string;
};

export type EvidenceUploadResponse = {
  evidenceObjectId: string;
  dareId: string;
  userId: string;
  storageBucket: string;
  storagePath: string;
  mediaType: string;
  byteSize: number;
  status: "pending";
  upload: {
    signedUrl: string;
    token: string;
    path: string;
  };
};

export type EvidenceConfirmResponse = {
  evidenceObjectId: string;
  juryCaseId: string;
  dareId: string;
  side: "A" | "B";
  status: "uploaded";
  uploadedAt: string;
};

export async function requestEvidenceUpload(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: EvidenceUploadResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateEvidenceUploadPayload,
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
      data: stored.responseBody as EvidenceUploadResponse,
    };
  }

  const row = await callCreateEvidenceUploadRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    envelope.payload,
  );
  const upload = await createSignedUpload(serviceClient, row);
  const data = mapEvidenceUploadResponse(row, upload);
  await insertEvidenceAuditLog(
    request,
    serviceClient,
    authUser.id,
    "evidence.upload_requested",
    data.evidenceObjectId,
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

export async function confirmEvidenceUpload(
  request: Request,
  dareId: string,
  client: SupabaseActionClient,
  serviceClient: SupabaseActionClient,
): Promise<{ requestId: string; data: EvidenceConfirmResponse }> {
  const validatedDareId = assertUuid(dareId, "dareId");
  const authUser = await requireAuthenticatedUser(client);
  const envelope = await parseActionEnvelope(request, {
    requireIdempotencyKey: true,
    validatePayload: validateEvidenceConfirmPayload,
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
      data: stored.responseBody as EvidenceConfirmResponse,
    };
  }

  const evidence = await loadEvidenceForConfirmation(
    serviceClient,
    authUser.id,
    validatedDareId,
    envelope.payload,
  );
  await verifyUploadedObject(serviceClient, evidence);

  const row = await callConfirmEvidenceUploadRpc(
    serviceClient,
    authUser.id,
    validatedDareId,
    envelope.payload,
  );
  const data = mapEvidenceConfirmResponse(row);
  await insertEvidenceAuditLog(
    request,
    serviceClient,
    authUser.id,
    "evidence.upload_confirmed",
    data.evidenceObjectId,
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

function validateEvidenceUploadPayload(value: unknown): EvidenceUploadPayload {
  const payload = assertRecord(value, "payload");
  const mimeType = assertString(payload.mimeType, "payload.mimeType", {
    max: 80,
  });
  if (
    !ALLOWED_MIME_TYPES.includes(mimeType as EvidenceUploadPayload["mimeType"])
  ) {
    throw new ActionError("VALIDATION_FAILED", {
      message: "payload.mimeType must be an allowed evidence media type.",
      details: { path: "payload.mimeType", reason: "unsupported_media_type" },
    });
  }

  return {
    fileName: assertString(payload.fileName, "payload.fileName", {
      min: 1,
      max: 180,
    }),
    mimeType: mimeType as EvidenceUploadPayload["mimeType"],
    fileSizeBytes: assertInteger(
      payload.fileSizeBytes,
      "payload.fileSizeBytes",
      {
        min: 1,
        max: 10 * 1024 * 1024,
      },
    ),
  };
}

function validateEvidenceConfirmPayload(
  value: unknown,
): EvidenceConfirmPayload {
  const payload = assertRecord(value, "payload");
  return {
    evidenceObjectId: assertUuid(
      payload.evidenceObjectId,
      "payload.evidenceObjectId",
    ),
    contentHash: assertOptionalString(
      payload.contentHash,
      "payload.contentHash",
      {
        min: 16,
        max: 128,
      },
    ),
  };
}

async function callCreateEvidenceUploadRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
  payload: EvidenceUploadPayload,
): Promise<EvidenceUploadRpcRow> {
  const { data, error } = await serviceClient.rpc<EvidenceUploadRpcRow[]>(
    "create_evidence_upload_action",
    {
      p_user_id: userId,
      p_dare_id: dareId,
      p_file_name: payload.fileName,
      p_mime_type: payload.mimeType,
      p_file_size_bytes: payload.fileSizeBytes,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function callConfirmEvidenceUploadRpc(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
  payload: EvidenceConfirmPayload,
): Promise<EvidenceConfirmRpcRow> {
  const { data, error } = await serviceClient.rpc<EvidenceConfirmRpcRow[]>(
    "confirm_evidence_upload_action",
    {
      p_user_id: userId,
      p_dare_id: dareId,
      p_evidence_object_id: payload.evidenceObjectId,
      p_content_hash: payload.contentHash ?? null,
    },
  );
  if (error) throw mapDareQueryError(error);
  const row = data?.[0];
  if (!row) throw new ActionError("INTERNAL_ERROR");
  return row;
}

async function loadEvidenceForConfirmation(
  serviceClient: SupabaseActionClient,
  userId: string,
  dareId: string,
  payload: EvidenceConfirmPayload,
): Promise<EvidenceObjectRow> {
  const { data, error } = await serviceClient
    .from<EvidenceObjectRow>("evidence_objects")
    .select("storage_bucket,storage_path,status")
    .eq("id", payload.evidenceObjectId)
    .eq("dare_id", dareId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw mapDareQueryError(error);
  if (!data) throw new ActionError("NOT_FOUND");
  if (data.status !== "pending" && data.status !== "uploaded") {
    throw new ActionError("INVALID_STATE");
  }

  return data;
}

async function verifyUploadedObject(
  serviceClient: SupabaseActionClient,
  evidence: EvidenceObjectRow,
): Promise<void> {
  const bucket = serviceClient.storage?.from(evidence.storage_bucket);
  if (!bucket) {
    throw new ActionError("INTERNAL_ERROR", {
      message: "Supabase Storage is not configured.",
    });
  }

  const { data, error } = await bucket.download(evidence.storage_path);
  if (error || !data) {
    throw new ActionError("INVALID_STATE", {
      message: "Evidence file has not been uploaded.",
      cause: error,
    });
  }
}

async function createSignedUpload(
  serviceClient: SupabaseActionClient,
  row: EvidenceUploadRpcRow,
): Promise<EvidenceUploadResponse["upload"]> {
  const bucket = serviceClient.storage?.from(row.storage_bucket);
  if (!bucket) {
    throw new ActionError("INTERNAL_ERROR", {
      message: "Supabase Storage is not configured.",
    });
  }

  const { data, error } = await bucket.createSignedUploadUrl(row.storage_path);
  if (error || !data) {
    throw new ActionError("PROVIDER_UNAVAILABLE", {
      message: "Could not create an evidence upload URL.",
      cause: error,
    });
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  };
}

function mapEvidenceUploadResponse(
  row: EvidenceUploadRpcRow,
  upload: EvidenceUploadResponse["upload"],
): EvidenceUploadResponse {
  return {
    evidenceObjectId: row.evidence_object_id,
    dareId: row.dare_id,
    userId: row.user_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mediaType: row.media_type,
    byteSize: row.byte_size,
    status: row.status,
    upload,
  };
}

function mapEvidenceConfirmResponse(
  row: EvidenceConfirmRpcRow,
): EvidenceConfirmResponse {
  return {
    evidenceObjectId: row.evidence_object_id,
    juryCaseId: row.jury_case_id,
    dareId: row.dare_id,
    side: row.side,
    status: row.status,
    uploadedAt: row.uploaded_at,
  };
}

async function insertEvidenceAuditLog(
  request: Request,
  serviceClient: SupabaseActionClient,
  userId: string,
  action: string,
  evidenceObjectId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await serviceClient.from("audit_logs").insert({
    actor_user_id: userId,
    actor_type: "user",
    action,
    target_type: "evidence_object",
    target_id: evidenceObjectId,
    metadata,
    ip_address: firstForwardedIp(request.headers.get("x-forwarded-for")),
    user_agent: request.headers.get("user-agent"),
  });
  if (error) throw mapDareQueryError(error);
}
