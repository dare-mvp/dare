import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ban, LockKeyhole, MessageSquareText, ShieldAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TextField } from '../../src/components/ui/TextField';
import { useMe } from '../../src/features/me/useMe';
import { ResponsibleGamingFrame } from '../../src/features/responsible-gaming/components/ResponsibleGamingFrame';
import { selfExclude } from '../../src/lib/actions/endpoints';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

const exclusionPeriods = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

export default function SelfExclusionScreen() {
  const router = useRouter();
  const { data } = useMe();
  const [period, setPeriod] = useState('7d');
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isLive = data.source === 'server';
  const reasonError = reason.length > 500 ? 'Reason must be 500 characters or fewer.' : undefined;

  return (
    <ResponsibleGamingFrame
      eyebrow="Self-exclusion"
      onBack={() => router.back()}
      title="Pause money play."
      subtitle="Choose a period to block deposits, DARE creation, accepting, and court ready-up."
    >
      <View style={styles.hero}>
        <Ban color={colors.danger} size={30} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Self-exclusion is restrictive</Text>
          <Text style={styles.heroText}>You can still view history, receipts, and support while money-moving actions are blocked.</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Exclusion period</Text>
        <SegmentedControl
          accessibilityLabel="Self-exclusion period"
          onChange={setPeriod}
          options={exclusionPeriods}
          value={period}
        />
        <TextField
          accessibilityLabel="Optional self-exclusion reason"
          error={reasonError}
          label="Reason (optional)"
          leftIcon={<MessageSquareText color={colors.textMuted} size={16} />}
          multiline
          onChangeText={setReason}
          placeholder="Add a private note"
          style={styles.reasonInput}
          value={reason}
        />
        <BlockedLine icon={<LockKeyhole color={colors.warning} size={18} />} text="Deposits and withdrawals locked" />
        <BlockedLine icon={<ShieldAlert color={colors.danger} size={18} />} text="DARE creation and accepting blocked" />
      </View>

      {!isLive ? (
        <InlineAlert
          tone="info"
          title="Live account required"
          message="Sign in with backend configuration to submit self-exclusion."
        />
      ) : null}

      <InlineAlert
        tone="danger"
        title="Confirm only when sure"
        message="Self-exclusion is designed to be difficult to reverse during the selected period."
      />

      {submitError ? <InlineAlert tone="danger" title="Request failed" message={submitError} /> : null}

      <ActionButton
        accessibilityLabel="Confirm self-exclusion"
        disabled={!isLive || submitting || Boolean(reasonError)}
        icon={<Ban color={colors.text} size={18} />}
        label={submitting ? 'Submitting...' : 'Confirm exclusion'}
        onPress={handleConfirm}
        variant="danger"
      />
    </ResponsibleGamingFrame>
  );

  async function handleConfirm() {
    if (reasonError) {
      setSubmitError(reasonError);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const result = await selfExclude({
      durationDays: periodToDays(period),
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });

    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: '/responsible-gaming/cool-off-receipt',
      params: {
        appliesTo: 'Deposits, withdrawals, DAREs, court ready-up',
        cancelledDares: String(result.data.cancelledDares),
        effectiveAt: result.data.selfExclusionUntil,
        forfeitedDares: String(result.data.forfeitedDares),
        reference: result.data.userId,
        refundedAmount: String(result.data.refundedAmount),
        request: 'Self-exclusion',
        status: 'Active',
      },
    });
  }
}

function BlockedLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.blockedLine}>
      {icon}
      <Text style={styles.blockedText}>{text}</Text>
    </View>
  );
}

function periodToDays(period: string) {
  if (period === '24h') return 1;
  if (period === '30d') return 30;
  return 7;
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[16],
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  heroText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing[6],
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
  reasonInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  blockedLine: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: spacing[10],
    padding: spacing[12],
  },
  blockedText: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
  },
});
