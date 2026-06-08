import { ActionError } from "../_shared/errors.ts";
import { type SupabaseActionClient } from "../_shared/supabase.ts";
import {
  assertInteger,
  assertRecord,
  assertString,
} from "../_shared/validation.ts";

const KYC_DOCUMENT_TYPES = ["bvn", "nin", "passport"] as const;
const KYC_DOCUMENT_BUCKET = "kyc-documents";
const KYC_DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png"] as const;
const KYC_PROVIDERS = ["dojah", "prembly", "smile_identity"] as const;
const KYC_MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

type KycDocumentType = typeof KYC_DOCUMENT_TYPES[number];
type KycDocumentMimeType = typeof KYC_DOCUMENT_MIME_TYPES[number];
type KycProvider = typeof KYC_PROVIDERS[number];

export type KycPrivateStorageDocuments = {
  contract: "private_storage_v1";
  documentImage: {
    byteSize: number;
    mimeType: KycDocumentMimeType;
    originalFileName: string;
    storageBucket: typeof KYC_DOCUMENT_BUCKET;
    storagePath: string;
  };
  documentNumberLast4: string;
  documentType: KycDocumentType;
  legalName: {
    firstInitial: string;
    lastInitial: string;
  };
};

export type KycProviderReferenceDocuments = {
  contract: "provider_reference_v1";
  documentNumberLast4: string;
  documentType: KycDocumentType;
  legalName: {
    firstInitial: string;
    lastInitial: string;
  };
  provider: KycProvider;
  providerReference: string;
};

export type SubmitKycDocuments =
  | KycPrivateStorageDocuments
  | KycProviderReferenceDocuments;

export function validateKycDocuments(value: unknown): SubmitKycDocuments {
  const documents = assertRecord(value, "payload.documents");
  const contract = assertString(
    documents.contract,
    "payload.documents.contract",
    { max: 40 },
  );

  if (contract === "private_storage_v1") {
    assertAllowedKeys(documents, "payload.documents", [
      "contract",
      "documentImage",
      "documentNumberLast4",
      "documentType",
      "legalName",
    ]);
    return validatePrivateStorageDocuments(documents);
  }

  if (contract === "provider_reference_v1") {
    assertAllowedKeys(documents, "payload.documents", [
      "contract",
      "documentNumberLast4",
      "documentType",
      "legalName",
      "provider",
      "providerReference",
    ]);
    return validateProviderReferenceDocuments(documents);
  }

  throw new ActionError("VALIDATION_FAILED", {
    message: "payload.documents.contract must be a supported KYC contract.",
    details: {
      path: "payload.documents.contract",
      reason: "unsupported_contract",
    },
  });
}

export async function verifyKycDocumentsReference(
  serviceClient: SupabaseActionClient,
  userId: string,
  documents: SubmitKycDocuments,
): Promise<void> {
  if (documents.contract !== "private_storage_v1") return;

  const expectedPrefix = `${userId}/`;
  if (!documents.documentImage.storagePath.startsWith(expectedPrefix)) {
    throw validationFailure(
      "payload.documents.documentImage.storagePath",
      "storage_path_not_owned",
    );
  }

  const bucket = serviceClient.storage?.from(
    documents.documentImage.storageBucket,
  );
  if (!bucket) {
    throw new ActionError("INTERNAL_ERROR", {
      message: "Supabase Storage is not configured.",
    });
  }

  const { data, error } = await bucket.download(
    documents.documentImage.storagePath,
  );
  if (error || !data) {
    throw new ActionError("INVALID_STATE", {
      message: "KYC document has not been uploaded.",
      cause: error,
    });
  }

  if (
    data.size <= 0 ||
    data.size > KYC_MAX_DOCUMENT_BYTES ||
    data.size !== documents.documentImage.byteSize
  ) {
    throw validationFailure(
      "payload.documents.documentImage.byteSize",
      "storage_object_size_mismatch",
    );
  }
}

function validatePrivateStorageDocuments(
  documents: Record<string, unknown>,
): KycPrivateStorageDocuments {
  const documentType = validateDocumentType(documents.documentType);
  const legalName = validateLegalName(documents.legalName);
  const image = assertRecord(
    documents.documentImage,
    "payload.documents.documentImage",
  );
  assertAllowedKeys(image, "payload.documents.documentImage", [
    "byteSize",
    "mimeType",
    "originalFileName",
    "storageBucket",
    "storagePath",
  ]);

  const mimeType = assertString(
    image.mimeType,
    "payload.documents.documentImage.mimeType",
    { max: 80 },
  );
  if (!KYC_DOCUMENT_MIME_TYPES.includes(mimeType as KycDocumentMimeType)) {
    throw validationFailure(
      "payload.documents.documentImage.mimeType",
      "unsupported_mime_type",
    );
  }

  const byteSize = assertInteger(
    image.byteSize,
    "payload.documents.documentImage.byteSize",
    { min: 1, max: KYC_MAX_DOCUMENT_BYTES },
  );
  const storageBucket = assertString(
    image.storageBucket,
    "payload.documents.documentImage.storageBucket",
    { max: 80 },
  );
  if (storageBucket !== KYC_DOCUMENT_BUCKET) {
    throw validationFailure(
      "payload.documents.documentImage.storageBucket",
      "invalid_storage_bucket",
    );
  }

  const storagePath = validateStoragePath(
    image.storagePath,
    "payload.documents.documentImage.storagePath",
    mimeType as KycDocumentMimeType,
  );

  return {
    contract: "private_storage_v1",
    documentImage: {
      byteSize,
      mimeType: mimeType as KycDocumentMimeType,
      originalFileName: assertString(
        image.originalFileName,
        "payload.documents.documentImage.originalFileName",
        { min: 1, max: 180 },
      ),
      storageBucket: KYC_DOCUMENT_BUCKET,
      storagePath,
    },
    documentNumberLast4: validateLast4(documents.documentNumberLast4),
    documentType,
    legalName,
  };
}

function validateProviderReferenceDocuments(
  documents: Record<string, unknown>,
): KycProviderReferenceDocuments {
  const provider = assertString(
    documents.provider,
    "payload.documents.provider",
    { max: 40 },
  );
  if (!KYC_PROVIDERS.includes(provider as KycProvider)) {
    throw validationFailure(
      "payload.documents.provider",
      "unsupported_provider",
    );
  }

  const providerReference = assertString(
    documents.providerReference,
    "payload.documents.providerReference",
    { min: 8, max: 180 },
  );
  if (!/^[A-Za-z0-9:_-]+$/.test(providerReference)) {
    throw validationFailure(
      "payload.documents.providerReference",
      "invalid_provider_reference",
    );
  }

  return {
    contract: "provider_reference_v1",
    documentNumberLast4: validateLast4(documents.documentNumberLast4),
    documentType: validateDocumentType(documents.documentType),
    legalName: validateLegalName(documents.legalName),
    provider: provider as KycProvider,
    providerReference,
  };
}

function validateDocumentType(value: unknown): KycDocumentType {
  const documentType = assertString(value, "payload.documents.documentType", {
    max: 20,
  });
  if (!KYC_DOCUMENT_TYPES.includes(documentType as KycDocumentType)) {
    throw validationFailure(
      "payload.documents.documentType",
      "unsupported_document_type",
    );
  }
  return documentType as KycDocumentType;
}

function validateLegalName(
  value: unknown,
): KycPrivateStorageDocuments["legalName"] {
  const legalName = assertRecord(value, "payload.documents.legalName");
  assertAllowedKeys(legalName, "payload.documents.legalName", [
    "firstInitial",
    "lastInitial",
  ]);
  const firstInitial = validateInitial(
    legalName.firstInitial,
    "payload.documents.legalName.firstInitial",
  );
  const lastInitial = validateInitial(
    legalName.lastInitial,
    "payload.documents.legalName.lastInitial",
  );
  return { firstInitial, lastInitial };
}

function validateInitial(value: unknown, path: string): string {
  const initial = assertString(value, path, { min: 1, max: 1 }).toUpperCase();
  if (!/^[A-Z]$/.test(initial)) {
    throw validationFailure(path, "invalid_initial");
  }
  return initial;
}

function validateLast4(value: unknown): string {
  const last4 = assertString(value, "payload.documents.documentNumberLast4", {
    min: 4,
    max: 4,
  }).toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(last4)) {
    throw validationFailure(
      "payload.documents.documentNumberLast4",
      "invalid_last4",
    );
  }
  return last4;
}

function validateStoragePath(
  value: unknown,
  path: string,
  mimeType: KycDocumentMimeType,
): string {
  const storagePath = assertString(value, path, { min: 42, max: 220 });
  if (storagePath.includes("..") || storagePath.includes("//")) {
    throw validationFailure(path, "invalid_storage_path");
  }

  const extension = storagePath.toLowerCase().split(".").pop();
  const expectedExtensions = mimeType === "image/png"
    ? ["png"]
    : ["jpg", "jpeg"];
  if (!extension || !expectedExtensions.includes(extension)) {
    throw validationFailure(path, "mime_extension_mismatch");
  }

  return storagePath;
}

function assertAllowedKeys(
  record: Record<string, unknown>,
  path: string,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (!allowedSet.has(key)) {
      throw validationFailure(`${path}.${key}`, "unsupported_field");
    }
  }
}

function validationFailure(path: string, reason: string): ActionError {
  return new ActionError("VALIDATION_FAILED", {
    message: `${path} is invalid.`,
    details: { path, reason },
  });
}
