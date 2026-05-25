import { StyleSheet, Text, View } from 'react-native';
import { Vote } from 'lucide-react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';

export type JuryEvidenceSide = {
  body: string;
  filesCount: number;
  label: 'A' | 'B';
};

type JuryEvidencePacketProps = {
  caseTitle: string;
  onVoteA?: () => void;
  onVoteB?: () => void;
  sides: [JuryEvidenceSide, JuryEvidenceSide];
};

export function JuryEvidencePacket({ caseTitle, onVoteA, onVoteB, sides }: JuryEvidencePacketProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Blind packet</Text>
        <StatusBadge label="JURY" tone="neutral" />
      </View>
      <Text style={styles.title}>{caseTitle}</Text>
      <View style={styles.sides}>
        {sides.map((side) => (
          <View key={side.label} style={styles.side}>
            <Text style={styles.sideLabel}>Packet {side.label}</Text>
            <Text style={styles.body}>{side.body}</Text>
            <Text style={styles.files}>{side.filesCount} evidence files</Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="Vote for packet A"
          icon={<Vote color={colors.text} size={17} />}
          label="Vote A"
          onPress={onVoteA}
          variant="secondary"
        />
        <ActionButton
          accessibilityLabel="Vote for packet B"
          icon={<Vote color={colors.text} size={17} />}
          label="Vote B"
          onPress={onVoteB}
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
  actions: {
    gap: spacing[10],
  },
});
