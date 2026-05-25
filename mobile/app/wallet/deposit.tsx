import { ReactNode, useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { ArrowRight, CreditCard, Gauge, WalletCards } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { AmountInput } from '../../src/components/ui/AmountInput';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { useMe } from '../../src/features/me/useMe';
import { initializeDeposit } from '../../src/lib/actions/endpoints';
import { nairaToKobo, validateDepositAmount } from '../../src/features/wallet/validation';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';
import { WalletFlowFrame } from '../../src/features/wallet/components/WalletFlowFrame';

const quickAmounts = [
  { label: 'NGN 1K', value: '1000' },
  { label: 'NGN 5K', value: '5000' },
  { label: 'NGN 10K', value: '10000' },
];

export default function DepositScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const [amount, setAmount] = useState('5000');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const amountError = amount ? validateDepositAmount(amount) : null;
  const canContinue = Boolean(amount) && data.capabilities.canDeposit && !amountError && !submitting;

  return (
    <WalletFlowFrame
      eyebrow="Deposit"
      onBack={() => router.back()}
      title="Add money."
      subtitle="Deposits remain pending until provider confirmation is received."
    >
      {data.source === 'mock' && !error ? (
        <InlineAlert
          tone="info"
          title={loading ? 'Syncing account' : 'Preview data'}
          message={loading ? 'Deposit eligibility is loading.' : 'Live deposit limits appear after sign-in and sync.'}
        />
      ) : null}

      {error ? (
        <InlineAlert
          tone="danger"
          title="Deposit eligibility unavailable"
          message={error}
        />
      ) : null}

      {submitError ? (
        <InlineAlert
          tone="danger"
          title="Deposit could not start"
          message={submitError}
        />
      ) : null}

      <View style={styles.panel}>
        <AmountInput
          error={amountError ?? undefined}
          label="Deposit amount"
          onChangeText={(value) => setAmount(value.replace(/[^0-9]/g, ''))}
          placeholder="Minimum NGN 100"
          value={amount}
        />
        <SegmentedControl
          accessibilityLabel="Quick deposit amounts"
          onChange={setAmount}
          options={quickAmounts}
          value={quickAmounts.some((option) => option.value === amount) ? amount : ''}
        />
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Before you continue</Text>
        <SummaryLine icon={<CreditCard color={colors.info} size={16} />} label="Funding method" value="Paystack checkout" />
        <SummaryLine icon={<WalletCards color={colors.success} size={16} />} label="Wallet update" value="After confirmation" />
        <SummaryLine icon={<Gauge color={colors.warning} size={16} />} label="Limit check" value="Daily deposit limit applies" />
      </View>

      <InlineAlert
        tone="info"
        title="Confirmation required"
        message="Your wallet balance changes only after the deposit is confirmed."
      />

      <ActionButton
        accessibilityLabel="Continue deposit"
        disabled={!canContinue}
        icon={<ArrowRight color={colors.text} size={18} />}
        label={submitting ? 'Starting' : 'Continue'}
        onPress={() => {
          void handleStartDeposit();
        }}
      />
    </WalletFlowFrame>
  );

  async function handleStartDeposit() {
    const nextError = validateDepositAmount(amount);
    if (nextError) {
      setSubmitError(nextError);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const result = await initializeDeposit({
      amount: nairaToKobo(amount),
      currency: 'NGN',
      provider: 'paystack',
    });

    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitting(false);
      return;
    }

    try {
      await Linking.openURL(result.data.authorizationUrl);
    } catch {
      setSubmitError('Payment checkout could not be opened. Use the pending screen reference to retry safely.');
    }

    setSubmitting(false);
    router.push({
      pathname: '/wallet/deposit-pending',
      params: {
        amount: String(result.data.amount),
        mode: result.data.mode,
        reference: result.data.reference,
      },
    });
  }
}

function SummaryLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <View style={styles.summaryLabelWrap}>
        {icon}
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
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
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  summaryTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  summaryLine: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  summaryLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  summaryLabelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  summaryValue: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});
