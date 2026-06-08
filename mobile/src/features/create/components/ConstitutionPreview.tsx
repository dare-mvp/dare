import { StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from '../../../components/ui/MoneyAmount';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { formatDareTypeLabel, formatResolutionLabel } from '../createLabels';
import { CreateDareDraft } from '../types';

type ConstitutionPreviewProps = {
  draft: CreateDareDraft;
  escrowKobo: number;
  platformFeeKobo: number;
  rewardKobo: number;
  stakeKobo: number;
};

export function ConstitutionPreview({
  draft,
  escrowKobo,
  platformFeeKobo,
  rewardKobo,
  stakeKobo,
}: ConstitutionPreviewProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>DARE Constitution</Text>
      <PreviewRow label="Challenge" value={draft.title || 'Not set'} />
      <PreviewRow label="DARE type" value={formatDareTypeLabel(draft.dareType)} />
      <PreviewRow label="Category" value={draft.category.toUpperCase()} />
      <PreviewRow label="Resolution" value={formatResolutionLabel(draft.resolutionType)} />
      <PreviewRow label="Duration" value={formatDuration(draft.durationSeconds)} />
      <PreviewRow label={draft.dareType === 'task' ? 'Performer' : 'Opponent'} value={draft.opponent || (draft.dareType === 'task' ? 'Open performer slot' : 'Open challenge')} />
      <PreviewRow label="Rules" value={draft.rules || 'Rules not set'} />

      <View style={styles.moneyPanel}>
        <MoneyLine label={draft.dareType === 'task' ? 'Darer reward' : 'Creator stake'} value={draft.dareType === 'task' ? rewardKobo : stakeKobo} />
        <MoneyLine label="Estimated settlement fee" value={platformFeeKobo} />
        <MoneyLine emphasis label={draft.dareType === 'task' ? 'Reward to lock' : 'Creator stake to lock'} value={escrowKobo} />
      </View>
    </View>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function MoneyLine({ emphasis = false, label, value }: { emphasis?: boolean; label: string; value: number }) {
  return (
    <View style={styles.moneyRow}>
      <Text style={emphasis ? styles.moneyLabelStrong : styles.moneyLabel}>{label}</Text>
      <MoneyAmount amountKobo={value} tone={emphasis ? 'locked' : 'pending'} />
    </View>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} min`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  row: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[4],
    paddingTop: spacing[10],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.textSoft,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  moneyPanel: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[12],
  },
  moneyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moneyLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  moneyLabelStrong: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
  },
});
