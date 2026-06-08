import * as ImagePicker from 'expo-image-picker';

export type KycCaptureAsset = {
  byteSize: number;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png';
  uri: string;
};

const maxKycImageBytes = 8 * 1024 * 1024;

export function formatKycCaptureSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export async function captureKycDocument() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { message: 'Camera permission is required to capture your identity document.', ok: false as const };
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    mediaTypes: ['images'],
    quality: 0.9,
  });

  if (result.canceled) return { canceled: true as const, ok: true as const };
  return normalizeKycAsset(result.assets[0]);
}

export async function pickKycDocumentImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { message: 'Photo library permission is required to attach your identity document.', ok: false as const };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    mediaTypes: ['images'],
    quality: 0.9,
  });

  if (result.canceled) return { canceled: true as const, ok: true as const };
  return normalizeKycAsset(result.assets[0]);
}

function normalizeKycAsset(asset: ImagePicker.ImagePickerAsset | undefined) {
  if (!asset) return { message: 'No document image was selected.', ok: false as const };

  const mimeType = normalizeMimeType(asset.mimeType, asset.fileName ?? asset.uri);
  if (!mimeType) {
    return { message: 'Identity document image must be a PNG or JPEG file.', ok: false as const };
  }

  const byteSize = asset.fileSize ?? 0;
  if (byteSize <= 0) {
    return { message: 'Could not read the selected document image size.', ok: false as const };
  }

  if (byteSize > maxKycImageBytes) {
    return { message: 'Identity document image must be 8 MB or smaller.', ok: false as const };
  }

  return {
    file: {
      byteSize,
      fileName: asset.fileName ?? fallbackFileName(mimeType),
      mimeType,
      uri: asset.uri,
    },
    ok: true as const,
  };
}

function normalizeMimeType(
  mimeType: string | null | undefined,
  name: string,
): KycCaptureAsset['mimeType'] | null {
  if (mimeType === 'image/png' || mimeType === 'image/jpeg') return mimeType;

  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

function fallbackFileName(mimeType: KycCaptureAsset['mimeType']) {
  return mimeType === 'image/png' ? 'identity-document.png' : 'identity-document.jpg';
}
