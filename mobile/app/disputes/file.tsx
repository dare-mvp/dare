import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, FileWarning, ShieldAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TextField } from '../../src/components/ui/TextField';
import { DisputeFlowFrame } from '../../src/features/disputes/components/DisputeFlowFrame';
import { useDareDetail } from '../../src/features/feed/useDareDetail';
import { DisputeReason } from '../../src/lib/actions/endpoints';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

const disputeReasons = [
  { label: 'Scoring', value: 'score_issue' },
  { label: 'Rules', value: 'rules_issue' },
  { label: 'Technical', value: 'technical_issue' },
];

export default function FileDisputeScreen() {
  const router = useRouter();
  const { dareId } = useLocalSearchParams<{ dareId?: string }>();
  const { dare, error: dareError, loading: dareLoading, source } = useDareDetail(dareId);
  const [reason, setReason] = useState<DisputeReason>('score_issue');
  const [summary, setSummary] = useState('');
  const summaryError = summary.length > 0 && summary.trim().length < 10
    ? 'Write at least 10 characters.'
    : null;
  const canContinue = summary.trim().length >= 10;

  return (
    <DisputeFlowFrame
      eyebrow="File dispute"
      onBack={() => router.back()}
      title="Explain the issue clearly."
      subtitle="A dispute must describe what happened and include evidence before review."
    >
      {source === 'mock' && !dareError ? (
        <InlineAlert
          tone="info"
          title={dareLoading ? 'Loading DARE' : 'Preview dispute'}
          message={dareLoading ? 'Fetching DARE details.' : 'Live dispute details appear after sign-in and sync.'}
        />
      ) : null}

      {dareError ? (
        <InlineAlert
          tone="danger"
          title="DARE details unavailable"
          message={dareError}
        />
      ) : null}

      <View style={styles.caseCard}>
        <ShieldAlert color={colors.danger} size={26} />
        <View style={styles.caseCopy}>
          <Text style={styles.caseTitle}>{dare?.title ?? 'DARE unavailable'}</Text>
          <Text style={styles.caseMeta}>{formatScore(dare?.scoreA, dare?.scoreB)}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Dispute reason</Text>
        <SegmentedControl
          accessibilityLabel="Dispute reason"
          onChange={(value) => setReason(value as DisputeReason)}
          options={disputeReasons}
          value={reason}
        />
        <TextField
          error={summaryError ?? undefined}
          label="Summary"
          leftIcon={<FileWarning color={colors.textMuted} size={16} />}
          multiline
          onChangeText={setSummary}
          placeholder="Describe the result issue, rule conflict, or forfeit concern."
          style={styles.summaryInput}
          textAlignVertical="top"
          value={summary}
        />
      </View>

      <InlineAlert
        tone="warning"
        title="Evidence is required"
        message="Disputes without clear supporting evidence may be rejected during review."
      />

      <ActionButton
        accessibilityLabel="Continue to evidence upload"
        disabled={!canContinue}
        icon={<ArrowRight color={colors.text} size={18} />}
        label="Continue"
        onPress={() => router.push({
          pathname: '/disputes/evidence-upload',
          params: {
            dareId,
            reason,
            summary,
          },
        })}
      />
    </DisputeFlowFrame>
  );
}

const styles = StyleSheet.create({
  caseCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[16],
  },
  caseCopy: {
    flex: 1,
    minWidth: 0,
  },
  caseTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  caseMeta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    marginTop: spacing[6],
    textTransform: 'uppercase',
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[14],
    padding: spacing[16],
  },
  panelTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  summaryInput: {
    minHeight: 120,
  },
});

function formatScore(scoreA?: number, scoreB?: number) {
  if (typeof scoreA === 'number' && typeof scoreB === 'number') {
    return `Score ${scoreA} - ${scoreB}`;
  }

  return 'Score pending';
}
