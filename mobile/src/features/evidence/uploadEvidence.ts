import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { EvidenceUploadResponse } from '../../lib/actions/endpoints';
import { getUploadUserMessage } from '../../lib/errors/userMessages';
import { supabaseClient } from '../../lib/supabase/client';

export type EvidenceMimeType = 'image/jpeg' | 'image/png' | 'video/mp4';

export type SelectedEvidenceFile = {
  byteSize: number;
  file?: File;
  fileName: string;
  mimeType: EvidenceMimeType;
  uri: string;
};

const maxEvidenceBytes = 10 * 1024 * 1024;
const allowedMimeTypes: EvidenceMimeType[] = ['image/jpeg', 'image/png', 'video/mp4'];

export function formatEvidenceSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export async function pickEvidenceFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { message: 'Photo library permission is required to attach evidence.', ok: false as const };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: false,
    mediaTypes: ['images', 'videos'],
    quality: 0.9,
  });

  if (result.canceled) return { canceled: true as const, ok: true as const };
  return normalizePickerAsset(result.assets[0]);
}

export async function createSelectedEvidenceFromCapture(input: {
  fileName?: string;
  mimeType: EvidenceMimeType;
  uri: string;
}) {
  try {
    const byteSize = await readEvidenceByteSize(input.uri, input.mimeType);

    return validateSelectedFile({
      byteSize,
      fileName: input.fileName ?? fallbackFileName(input.mimeType),
      mimeType: input.mimeType,
      uri: input.uri,
    });
  } catch {
    return { message: 'Could not read the captured evidence file. Capture again or choose another source.', ok: false as const };
  }
}

export async function pickEvidenceDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: allowedMimeTypes,
  });

  if (result.canceled) return { canceled: true as const, ok: true as const };
  return normalizeDocumentAsset(result.assets[0]);
}

export async function uploadSelectedEvidence(upload: EvidenceUploadResponse, file: SelectedEvidenceFile) {
  if (!supabaseClient) {
    return {
      message: getUploadUserMessage(),
      ok: false as const,
    };
  }

  let error: unknown = null;
  try {
    const body = file.file ?? await uriToBlob(file.uri, file.mimeType);
    const result = await supabaseClient.storage
      .from(upload.storageBucket)
      .uploadToSignedUrl(upload.upload.path, upload.upload.token, body, {
        contentType: file.mimeType,
        upsert: true,
      });
    error = result.error;
  } catch {
    error = true;
  }

  if (error) {
    return {
      message: getUploadUserMessage(),
      ok: false as const,
    };
  }

  return { ok: true as const };
}

function normalizePickerAsset(asset: ImagePicker.ImagePickerAsset | undefined) {
  if (!asset) return { message: 'No evidence file was selected.', ok: false as const };

  const mimeType = normalizeMimeType(asset.mimeType, asset.fileName ?? asset.uri, asset.type === 'video');
  if (!mimeType) {
    return { message: 'Evidence must be a PNG, JPEG, or MP4 file.', ok: false as const };
  }

  const byteSize = asset.fileSize ?? 0;
  return validateSelectedFile({
    byteSize,
    fileName: asset.fileName ?? fallbackFileName(mimeType),
    mimeType,
    uri: asset.uri,
  });
}

function normalizeDocumentAsset(asset: DocumentPicker.DocumentPickerAsset | undefined) {
  if (!asset) return { message: 'No evidence file was selected.', ok: false as const };

  const mimeType = normalizeMimeType(asset.mimeType, asset.name, false);
  if (!mimeType) {
    return { message: 'Evidence must be a PNG, JPEG, or MP4 file.', ok: false as const };
  }

  return validateSelectedFile({
    byteSize: asset.size ?? 0,
    file: asset.file,
    fileName: asset.name,
    mimeType,
    uri: asset.uri,
  });
}

function validateSelectedFile(file: SelectedEvidenceFile) {
  if (!file.mimeType || !allowedMimeTypes.includes(file.mimeType)) {
    return { message: 'Evidence must be a PNG, JPEG, or MP4 file.', ok: false as const };
  }

  if (file.byteSize <= 0) {
    return { message: 'Could not read the selected file size.', ok: false as const };
  }

  if (file.byteSize > maxEvidenceBytes) {
    return { message: 'Evidence must be 10 MB or smaller.', ok: false as const };
  }

  return { file, ok: true as const };
}

function normalizeMimeType(
  mimeType: string | null | undefined,
  name: string,
  videoHint: boolean,
): EvidenceMimeType | null {
  if (mimeType === 'image/png' || mimeType === 'image/jpeg' || mimeType === 'video/mp4') {
    return mimeType;
  }

  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.mp4') || videoHint) return 'video/mp4';
  return null;
}

function fallbackFileName(mimeType: EvidenceMimeType) {
  if (mimeType === 'video/mp4') return 'dare-evidence.mp4';
  if (mimeType === 'image/jpeg') return 'dare-evidence.jpg';
  return 'dare-evidence.png';
}

async function uriToBlob(uri: string, mimeType: EvidenceMimeType) {
  const response = await fetch(uri);
  const blob = await response.blob();

  if (blob.type === mimeType) return blob;
  return new Blob([blob], { type: mimeType });
}

async function readEvidenceByteSize(uri: string, mimeType: EvidenceMimeType) {
  const blob = await uriToBlob(uri, mimeType);
  return blob.size;
}
