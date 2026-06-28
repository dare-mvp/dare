import { Camera, FileImage, FileUp, RefreshCcw, X } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { IconButton } from '../../../components/ui/IconButton';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { getEvidenceStatusLabel, type EvidenceUploadStatus } from '../evidenceGuidance';

export type EvidenceDraftFile = {
  id: string;
  name: string;
  sizeLabel: string;
  status: EvidenceUploadStatus;
};

type EvidenceUploaderProps = {
  files: EvidenceDraftFile[];
  onAddFile?: () => void;
  onCamera?: () => void;
  onPickMedia?: () => void;
  onRemoveFile?: (id: string) => void;
  onRetryFile?: (id: string) => void;
};

export function EvidenceUploader({
  files,
  onAddFile,
  onCamera,
  onPickMedia,
  onRemoveFile,
  onRetryFile,
}: EvidenceUploaderProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Evidence</Text>
          <Text style={styles.subtitle}>Upload clear proof before submitting.</Text>
        </View>
        <IconButton
          accessibilityLabel="Capture evidence"
          icon={<Camera color={colors.textMuted} size={18} />}
          onPress={onCamera}
        />
      </View>

      <View style={styles.dropzone}>
        <FileUp color={colors.primary} size={22} />
        <Text style={styles.dropTitle}>Add photos or files</Text>
        <Text style={styles.dropText}>PNG, JPEG, or MP4 only. Maximum file size is 10 MB.</Text>
        <View style={styles.actionGroup}>
          <ActionButton
            accessibilityLabel="Choose evidence from photo library"
            icon={<FileImage color={colors.text} size={17} />}
            label="Photo or video"
            onPress={onPickMedia}
            variant="secondary"
          />
          <ActionButton
            accessibilityLabel="Add evidence file"
            icon={<FileUp color={colors.text} size={17} />}
            label="File"
            onPress={onAddFile}
            variant="secondary"
          />
        </View>
      </View>

      {files.length > 0 ? (
        <View style={styles.fileList}>
          {files.map((file) => (
            <View key={file.id} style={styles.fileRow}>
              <View style={styles.fileCopy}>
                <Text numberOfLines={1} style={styles.fileName}>{file.name}</Text>
                <Text style={styles.fileMeta}>{file.sizeLabel} - {getEvidenceStatusLabel(file.status)}</Text>
              </View>
              {file.status === 'failed' ? (
                <IconButton
                  accessibilityLabel={`Retry ${file.name}`}
                  icon={<RefreshCcw color={colors.warning} size={16} />}
                  onPress={() => onRetryFile?.(file.id)}
                />
              ) : null}
              <IconButton
                accessibilityLabel={`Remove ${file.name}`}
                icon={<X color={colors.textMuted} size={16} />}
                onPress={() => onRemoveFile?.(file.id)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[14],
    padding: spacing[16],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    marginTop: spacing[4],
  },
  dropzone: {
    alignItems: 'center',
    backgroundColor: colors.primaryDim,
    borderColor: colors.primaryGlow,
    borderRadius: radius.control,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: spacing[8],
    padding: spacing[16],
  },
  dropTitle: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '900',
  },
  dropText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  actionGroup: {
    alignSelf: 'stretch',
    gap: spacing[8],
  },
  fileList: {
    gap: spacing[8],
  },
  fileRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: spacing[10],
    padding: spacing[10],
  },
  fileCopy: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
  },
  fileMeta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: spacing[4],
    textTransform: 'uppercase',
  },
});
