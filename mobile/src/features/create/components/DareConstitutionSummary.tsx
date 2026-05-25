import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';

type DareConstitutionSummaryProps = {
  category: string;
  disputeWindowLabel?: string;
  resolution: string;
  rules: string;
  title: string;
};

export function DareConstitutionSummary({
  category,
  disputeWindowLabel = '24 hour dispute window',
  resolution,
  rules,
  title,
}: DareConstitutionSummaryProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Constitution</Text>
        <StatusBadge label={category.toUpperCase()} tone="neutral" />
      </View>
      <Text style={styles.title}>{title || 'Challenge not set'}</Text>
      <SummaryLine label="Resolution" value={resolution} />
      <SummaryLine label="Rules" value={rules || 'Rules not set'} />
      <SummaryLine label="Disputes" value={disputeWindowLabel} />
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
    color: colors.primary,
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
  line: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[4],
    paddingTop: spacing[10],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.textSoft,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
});
