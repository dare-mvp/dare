import { createRequestId } from '../../lib/actions/idempotency';
import { getUploadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';
import { type KycCaptureAsset } from './kycCapture';

export type KycDocumentType = 'bvn' | 'nin' | 'passport';

export type KycPrivateStorageReference = {
  byteSize: number;
  mimeType: KycCaptureAsset['mimeType'];
  originalFileName: string;
  storageBucket: 'kyc-documents';
  storagePath: string;
};

export type KycSubmitDocuments = {
  contract: 'private_storage_v1';
  documentImage: KycPrivateStorageReference;
  documentNumberLast4: string;
  documentType: KycDocumentType;
  legalName: {
    firstInitial: string;
    lastInitial: string;
  };
};

const KYC_DOCUMENT_BUCKET = 'kyc-documents';
const MAX_KYC_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_KYC_MIME_TYPES: KycCaptureAsset['mimeType'][] = ['image/jpeg', 'image/png'];

export function buildKycSubmitDocuments(input: {
  documentImage: KycCaptureAsset;
  documentNumber: string;
  documentType: string;
  firstName: string;
  lastName: string;
  storagePath: string;
}): KycSubmitDocuments | null {
  const documentType = normalizeDocumentType(input.documentType);
  const documentNumberLast4 = lastFour(input.documentNumber);
  const firstInitial = initial(input.firstName);
  const lastInitial = initial(input.lastName);

  if (!documentType || !documentNumberLast4 || !firstInitial || !lastInitial) return null;

  return {
    contract: 'private_storage_v1',
    documentImage: {
      byteSize: input.documentImage.byteSize,
      mimeType: input.documentImage.mimeType,
      originalFileName: input.documentImage.fileName,
      storageBucket: KYC_DOCUMENT_BUCKET,
      storagePath: input.storagePath,
    },
    documentNumberLast4,
    documentType,
    legalName: {
      firstInitial,
      lastInitial,
    },
  };
}

export async function uploadKycDocument(input: {
  file: KycCaptureAsset;
  userId: string;
}) {
  if (!supabaseClient) {
    return { message: getUploadUserMessage(), ok: false as const };
  }

  const validationError = validateKycCapture(input.file);
  if (validationError) return { message: validationError, ok: false as const };

  const storagePath = buildStoragePath(input.userId, input.file.mimeType);

  try {
    const body = await uriToBlob(input.file.uri, input.file.mimeType);
    if (body.size <= 0 || body.size > MAX_KYC_IMAGE_BYTES) {
      return { message: getUploadUserMessage(), ok: false as const };
    }

    const { error } = await supabaseClient.storage
      .from(KYC_DOCUMENT_BUCKET)
      .upload(storagePath, body, {
        contentType: input.file.mimeType,
        upsert: false,
      });

    if (error) {
      return { message: getUploadUserMessage(), ok: false as const };
    }

    return { ok: true as const, storagePath };
  } catch {
    return { message: getUploadUserMessage(), ok: false as const };
  }
}

function validateKycCapture(file: KycCaptureAsset) {
  if (!ALLOWED_KYC_MIME_TYPES.includes(file.mimeType)) {
    return 'Identity document image must be a PNG or JPEG file.';
  }

  if (file.byteSize <= 0 || file.byteSize > MAX_KYC_IMAGE_BYTES) {
    return 'Identity document image must be 8 MB or smaller.';
  }

  return null;
}

function buildStoragePath(userId: string, mimeType: KycCaptureAsset['mimeType']) {
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  return `${userId}/${createRequestId()}.${extension}`;
}

function normalizeDocumentType(value: string): KycDocumentType | null {
  if (value === 'bvn' || value === 'nin' || value === 'passport') return value;
  return null;
}

function lastFour(value: string) {
  const normalized = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return normalized.length >= 4 ? normalized.slice(-4) : null;
}

function initial(value: string) {
  const normalized = value.trim().replace(/[^A-Za-z]/g, '').toUpperCase();
  return normalized[0] ?? null;
}

async function uriToBlob(uri: string, mimeType: KycCaptureAsset['mimeType']) {
  const response = await fetch(uri);
  const blob = await response.blob();

  if (blob.type === mimeType) return blob;
  return new Blob([blob], { type: mimeType });
}
