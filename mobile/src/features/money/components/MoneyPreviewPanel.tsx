import { StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from '../../../components/ui/MoneyAmount';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import type { MoneyPreview } from '../moneyPreview';

type MoneyPreviewPanelProps = {
  preview: MoneyPreview;
};

export function MoneyPreviewPanel({ preview }: MoneyPreviewPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{preview.title}</Text>
      {preview.lines.map((line) => (
        <View key={line.label} style={styles.line}>
          <Text style={[styles.label, line.emphasis && styles.labelStrong]}>{line.label}</Text>
          <MoneyAmount amountKobo={line.valueKobo} tone={line.emphasis ? 'locked' : 'pending'} />
        </View>
      ))}
      <Text style={styles.footnote}>{preview.footnote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  line: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  label: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  labelStrong: {
    color: colors.text,
    fontWeight: '900',
  },
  footnote: {
    color: colors.textGhost,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
});
