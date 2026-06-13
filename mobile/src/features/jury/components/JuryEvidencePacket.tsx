import { Linking, StyleSheet, Text, View } from 'react-native';
import { ExternalLink, Vote } from 'lucide-react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';

export type JuryVoteChoice = 'A' | 'B' | 'void' | 'escalate';

export type JuryEvidenceFile = {
  byteSize: number | null;
  expiresAt: string;
  mediaType: string;
  signedUrl: string;
  uploadedAt: string | null;
};

export type JuryEvidenceSide = {
  body: string;
  files?: JuryEvidenceFile[];
  filesCount: number;
  label: 'A' | 'B';
};

type JuryEvidencePacketProps = {
  caseTitle: string;
  disabled?: boolean;
  onVote?: (vote: JuryVoteChoice) => void;
  sides: [JuryEvidenceSide, JuryEvidenceSide];
};

export function JuryEvidencePacket({ caseTitle, disabled = false, onVote, sides }: JuryEvidencePacketProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Blind packet</Text>
        <StatusBadge label="JURY" tone="neutral" />
      </View>
      <Text style={styles.title}>{caseTitle}</Text>
      <View style={styles.sides}>
        {sides.map((side) => {
          const files = side.files ?? [];
          return (
            <View key={side.label} style={styles.side}>
              <Text style={styles.sideLabel}>Packet {side.label}</Text>
              <Text style={styles.body}>{side.body}</Text>
              <Text style={styles.files}>{side.filesCount} evidence files</Text>
              {files.length > 0 ? (
                <View style={styles.fileList}>
                  {files.map((file, index) => (
                    <ActionButton
                      key={`${side.label}-${index}-${file.expiresAt}`}
                      accessibilityLabel={`Open packet ${side.label} evidence file ${index + 1}`}
                      icon={<ExternalLink color={colors.text} size={16} />}
                      label={`Open file ${index + 1}`}
                      onPress={() => {
                        void Linking.openURL(file.signedUrl);
                      }}
                      variant="secondary"
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={styles.actions}>
        <ActionButton
          disabled={disabled}
          accessibilityLabel="Vote for packet A"
          icon={<Vote color={colors.text} size={17} />}
          label="Vote A"
          onPress={() => onVote?.('A')}
          variant="secondary"
        />
        <ActionButton
          disabled={disabled}
          accessibilityLabel="Vote for packet B"
          icon={<Vote color={colors.text} size={17} />}
          label="Vote B"
          onPress={() => onVote?.('B')}
          variant="secondary"
        />
        <ActionButton
          disabled={disabled}
          accessibilityLabel="Vote to void case"
          label="Void"
          onPress={() => onVote?.('void')}
          variant="secondary"
        />
        <ActionButton
          disabled={disabled}
          accessibilityLabel="Escalate jury case"
          label="Escalate"
          onPress={() => onVote?.('escalate')}
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kicker: {
    color: colors.purple,
    fontFamily: fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  sides: {
    gap: spacing[10],
  },
  side: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: spacing[6],
    padding: spacing[12],
  },
  sideLabel: {
    color: colors.purple,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.textSoft,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  files: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  fileList: {
    gap: spacing[8],
    paddingTop: spacing[4],
  },
  actions: {
    gap: spacing[10],
  },
});
