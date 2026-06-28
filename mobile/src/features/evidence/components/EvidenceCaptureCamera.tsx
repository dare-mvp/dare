import { useRef, useState } from 'react';
import { Camera as CameraIcon, RefreshCcw, RotateCcw, StopCircle, Video, X } from 'lucide-react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraMode, type CameraType } from 'expo-camera';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { IconButton } from '../../../components/ui/IconButton';
import { InlineAlert } from '../../../components/ui/InlineAlert';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import {
  createSelectedEvidenceFromCapture,
  type SelectedEvidenceFile,
} from '../uploadEvidence';

type EvidenceCaptureCameraProps = {
  onCancel: () => void;
  onCaptured: (file: SelectedEvidenceFile) => void;
  onError: (message: string) => void;
};

const captureModeOptions = [
  { label: 'Photo', value: 'picture' },
  { label: 'Video', value: 'video' },
];

export function EvidenceCaptureCamera({ onCancel, onCaptured, onError }: EvidenceCaptureCameraProps) {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [mode, setMode] = useState<CameraMode>('picture');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const needsCameraPermission = cameraPermission && !cameraPermission.granted;
  const needsMicrophonePermission = mode === 'video' && microphonePermission && !microphonePermission.granted;
  const canCapture = isCameraReady && !needsCameraPermission && !needsMicrophonePermission;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>In-app evidence camera</Text>
        </View>
        <IconButton
          accessibilityLabel="Close evidence camera"
          disabled={isRecording}
          icon={<X color={colors.textMuted} size={18} />}
          onPress={onCancel}
        />
      </View>

      <SegmentedControl
        accessibilityLabel="Evidence capture mode"
        onChange={(value) => {
          setCaptureError(null);
          setMode(value === 'video' ? 'video' : 'picture');
        }}
        options={captureModeOptions}
        value={mode}
      />

      <View style={styles.preview}>
        {cameraPermission?.granted ? (
          <CameraView
            active
            facing={facing}
            mode={mode}
            onCameraReady={() => setIsCameraReady(true)}
            onMountError={(event) => {
              const message = event.message || 'Camera preview could not start.';
              setCaptureError(message);
              onError(message);
            }}
            ratio="4:3"
            ref={cameraRef}
            style={styles.camera}
            videoQuality="480p"
          />
        ) : (
          <View style={styles.permissionPane}>
            <CameraIcon color={colors.textMuted} size={28} />
            <Text style={styles.permissionText}>Camera permission is required.</Text>
          </View>
        )}
        {isRecording ? (
          <View style={styles.recordingBadge}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
          </View>
        ) : null}
      </View>

      {needsCameraPermission ? (
        <ActionButton
          accessibilityLabel="Allow evidence camera permission"
          icon={<CameraIcon color={colors.text} size={17} />}
          label="Allow camera"
          onPress={() => void requestCameraPermission()}
          variant="secondary"
        />
      ) : null}

      {needsMicrophonePermission ? (
        <ActionButton
          accessibilityLabel="Allow evidence microphone permission"
          icon={<Video color={colors.text} size={17} />}
          label="Allow microphone"
          onPress={() => void requestMicrophonePermission()}
          variant="secondary"
        />
      ) : null}

      {captureError ? (
        <InlineAlert tone="warning" title="Capture unavailable" message={captureError} />
      ) : null}

      <View style={styles.actions}>
        <IconButton
          accessibilityLabel="Switch evidence camera"
          disabled={isRecording}
          icon={<RotateCcw color={colors.textMuted} size={17} />}
          onPress={() => setFacing((current) => current === 'back' ? 'front' : 'back')}
        />
        <ActionButton
          accessibilityLabel={mode === 'video' ? isRecording ? 'Stop recording evidence' : 'Record evidence video' : 'Capture evidence photo'}
          disabled={!canCapture && !isRecording}
          icon={mode === 'video'
            ? isRecording ? <StopCircle color={colors.text} size={17} /> : <Video color={colors.text} size={17} />
            : <CameraIcon color={colors.text} size={17} />}
          label={mode === 'video' ? isRecording ? 'Stop' : 'Record' : 'Capture'}
          onPress={() => {
            if (mode === 'video') void handleVideoCapture();
            else void handlePhotoCapture();
          }}
        />
        <IconButton
          accessibilityLabel="Reset evidence capture error"
          disabled={!captureError || isRecording}
          icon={<RefreshCcw color={colors.textMuted} size={17} />}
          onPress={() => setCaptureError(null)}
        />
      </View>
    </View>
  );

  async function ensurePermissions() {
    const camera = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!camera.granted) {
      setCaptureError('Camera permission is required to capture evidence inside DARE.');
      return false;
    }

    if (mode === 'video') {
      const microphone = microphonePermission?.granted ? microphonePermission : await requestMicrophonePermission();
      if (!microphone.granted) {
        setCaptureError('Microphone permission is required for video evidence.');
        return false;
      }
    }

    return true;
  }

  async function handlePhotoCapture() {
    setCaptureError(null);
    if (!await ensurePermissions()) return;
    if (!cameraRef.current || !isCameraReady) {
      setCaptureError('Camera is still starting. Try again in a moment.');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({ exif: false, quality: 0.85 });
      const mimeType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
      const result = await createSelectedEvidenceFromCapture({
        fileName: mimeType === 'image/png' ? 'dare-evidence-photo.png' : 'dare-evidence-photo.jpg',
        mimeType,
        uri: photo.uri,
      });
      if (!result.ok) {
        setCaptureError(result.message);
        onError(result.message);
        return;
      }
      onCaptured(result.file);
    } catch {
      setCaptureError('Could not capture evidence photo. Try again or choose another source.');
    }
  }

  async function handleVideoCapture() {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      setIsRecording(false);
      return;
    }

    setCaptureError(null);
    if (Platform.OS === 'web') {
      setCaptureError('Video recording is available in the native app. Use photo capture or upload an MP4 on web.');
      return;
    }

    if (!await ensurePermissions()) return;
    if (!cameraRef.current || !isCameraReady) {
      setCaptureError('Camera is still starting. Try again in a moment.');
      return;
    }

    setIsRecording(true);
    try {
      const recording = await cameraRef.current.recordAsync({
        maxDuration: 45,
        maxFileSize: 10 * 1024 * 1024,
      });
      if (!recording?.uri) return;

      const result = await createSelectedEvidenceFromCapture({
        fileName: 'dare-evidence-video.mp4',
        mimeType: 'video/mp4',
        uri: recording.uri,
      });
      if (!result.ok) {
        setCaptureError(result.message);
        onError(result.message);
        return;
      }
      onCaptured(result.file);
    } catch {
      setCaptureError('Could not record evidence video. Try again or choose another source.');
    } finally {
      setIsRecording(false);
    }
  }
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
  },
  camera: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[14],
  },
  permissionPane: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[8],
    justifyContent: 'center',
  },
  permissionText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  preview: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.black,
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recordingBadge: {
    alignItems: 'center',
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[6],
    left: spacing[10],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
    position: 'absolute',
    top: spacing[10],
  },
  recordingDot: {
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  recordingText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
});
