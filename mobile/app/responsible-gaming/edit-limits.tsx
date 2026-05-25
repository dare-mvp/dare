import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Clock3, Send } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { AmountInput } from '../../src/components/ui/AmountInput';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TextField } from '../../src/components/ui/TextField';
import {
  ResponsibleGamingSettingsPayload,
  updateResponsibleGamingSettings,
} from '../../src/lib/actions/endpoints';
import { useMe } from '../../src/features/me/useMe';
import { ResponsibleGamingFrame } from '../../src/features/responsible-gaming/components/ResponsibleGamingFrame';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

type LimitType = 'deposit' | 'session' | 'stake';

const limitTypes = [
  { label: 'Deposit', value: 'deposit' },
  { label: 'Stake', value: 'stake' },
  { label: 'Session', value: 'session' },
];

export default function EditLimitsScreen() {
  const router = useRouter();
  const { data } = useMe();
  const [limitType, setLimitType] = useState<LimitType>('deposit');
  const [amount, setAmount] = useState('100000');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const currentLabel = getCurrentLimitLabel(limitType, data.profile.limits);
  const numericValue = Number.parseInt(amount, 10);
  const hasValidValue = Number.isInteger(numericValue) && numericValue > 0;
  const isLive = data.source === 'server';

  return (
    <ResponsibleGamingFrame
      eyebrow="Edit limits"
      onBack={() => router.back()}
      title="Change a limit."
      subtitle="Lower limits are protective. Higher limits wait through cooling-off before they apply."
    >
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Limit type</Text>
        <SegmentedControl
          accessibilityLabel="Responsible gaming limit type"
          onChange={(value) => setLimitType(value as LimitType)}
          options={limitTypes}
          value={limitType}
        />
        {limitType === 'session' ? (
          <TextField
            accessibilityLabel="Requested session limit in minutes"
            error={amount && !hasValidValue ? 'Enter a whole number greater than zero.' : undefined}
            keyboardType="numeric"
            label="Requested minutes"
            leftIcon={<Clock3 color={colors.textMuted} size={16} />}
            onChangeText={(value) => setAmount(value.replace(/[^0-9]/g, ''))}
            placeholder="Enter minutes"
            value={amount}
          />
        ) : (
          <AmountInput
            accessibilityLabel="Requested responsible gaming amount"
            error={amount && !hasValidValue ? 'Enter a whole number greater than zero.' : undefined}
            label="Requested amount"
            onChangeText={(value) => setAmount(value.replace(/[^0-9]/g, ''))}
            placeholder="Enter amount"
            value={amount}
          />
        )}
      </View>

      <View style={styles.reviewPanel}>
        <Text style={styles.panelTitle}>Review</Text>
        <ReviewLine label="Current limit" value={currentLabel} />
        <ReviewLine label="Requested limit" value={formatRequestedValue(limitType, numericValue)} />
        <ReviewLine label="Cooling-off" value="Required for increases" />
      </View>

      {!isLive ? (
        <InlineAlert
          tone="info"
          title="Live account required"
          message="Sign in with backend configuration to submit responsible gaming limit changes."
        />
      ) : null}

      <InlineAlert
        tone="warning"
        title="Cooling-off may apply"
        message="If this request increases your available limit, it remains pending until the cooling-off period ends."
      />

      {submitError ? <InlineAlert tone="danger" title="Request failed" message={submitError} /> : null}

      <ActionButton
        accessibilityLabel="Submit limit change"
        disabled={!hasValidValue || !isLive || submitting}
        icon={<Send color={colors.text} size={17} />}
        label={submitting ? 'Submitting...' : 'Submit request'}
        onPress={handleSubmit}
      />
    </ResponsibleGamingFrame>
  );

  async function handleSubmit() {
    if (!hasValidValue) {
      setSubmitError('Enter a whole number greater than zero.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const result = await updateResponsibleGamingSettings(createSettingsPayload(limitType, numericValue));

    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: '/responsible-gaming/cool-off-receipt',
      params: {
        appliesTo: getLimitLabel(limitType),
        effectiveAt: result.data.pending.effectiveAt ?? result.data.coolingOffUntil ?? '',
        reference: 'Responsible gaming settings',
        request: 'Limit change',
        status: result.data.pending.effectiveAt ? 'Cooling-off active' : 'Updated',
        target: formatRequestedValue(limitType, numericValue),
      },
    });
  }
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewLine}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

function createSettingsPayload(limitType: LimitType, value: number): ResponsibleGamingSettingsPayload {
  if (limitType === 'deposit') return { dailyDepositLimitNgn: value };
  if (limitType === 'stake') return { maxStakeNgn: value };
  return { sessionMaxMinutes: value };
}

function formatRequestedValue(limitType: LimitType, value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Pending value';
  if (limitType === 'session') return `${value.toLocaleString('en-NG')} minutes`;
  return `NGN ${value.toLocaleString('en-NG')}`;
}

function getCurrentLimitLabel(
  limitType: LimitType,
  limits: Array<{ currentLabel: string; label: string }>,
) {
  const match = limits.find((limit) => limit.label === getLimitLabel(limitType));
  return match?.currentLabel ?? 'Not set';
}

function getLimitLabel(limitType: LimitType) {
  if (limitType === 'deposit') return 'Daily deposit limit';
  if (limitType === 'stake') return 'Max stake per DARE';
  return 'Session limit';
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
  reviewPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  panelTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  reviewLine: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  reviewLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  reviewValue: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
});
