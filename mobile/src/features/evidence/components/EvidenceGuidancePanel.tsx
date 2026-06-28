import { ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import type { CourtSession } from '../../court/types';
import { getEvidenceGuidance, getEvidenceRequirementSummary } from '../evidenceGuidance';

type EvidenceGuidancePanelProps = {
  mimeType?: string | null;
  session: CourtSession | null;
};

export function EvidenceGuidancePanel({ mimeType, session }: EvidenceGuidancePanelProps) {
  const guidance = getEvidenceGuidance(mimeType);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <ShieldCheck color={colors.info} size={18} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{guidance.title}</Text>
          <Text style={styles.summary}>{getEvidenceRequirementSummary(session)}</Text>
        </View>
      </View>
      <View style={styles.list}>
        {guidance.bullets.map((item) => (
          <Text key={item} style={styles.bullet}>- {item}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: {
    color: colors.textSoft,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[10],
  },
  headerCopy: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  list: {
    gap: spacing[6],
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  summary: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
});
