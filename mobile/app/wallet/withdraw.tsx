import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowUpRight, BadgeCheck, Building2, Fingerprint } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { AmountInput } from '../../src/components/ui/AmountInput';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { TextField } from '../../src/components/ui/TextField';
import { MoneyAmount } from '../../src/components/ui/MoneyAmount';
import { useMe } from '../../src/features/me/useMe';
import { requestWithdrawal } from '../../src/lib/actions/endpoints';
import { nairaToKobo, validateWithdrawalInput } from '../../src/features/wallet/validation';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';
import { WalletFlowFrame } from '../../src/features/wallet/components/WalletFlowFrame';

export default function WithdrawScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const [amount, setAmount] = useState('8000');
  const [bankCode, setBankCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumberToken, setAccountNumberToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<WithdrawalField, boolean>>({
    accountName: false,
    accountNumberToken: false,
    amount: false,
    bankCode: false,
  });
  const fieldErrors = getWithdrawalFieldErrors({ accountName, accountNumberToken, amount, bankCode });
  const canReview = Object.keys(fieldErrors).length === 0 && data.capabilities.canWithdraw && !submitting;

  return (
    <WalletFlowFrame
      eyebrow="Withdraw"
      onBack={() => router.back()}
      title="Request withdrawal."
      subtitle="Withdrawals remain pending until provider payout confirmation is received."
    >
      {data.source === 'mock' && !error ? (
        <InlineAlert
          tone="info"
          title={loading ? 'Syncing account' : 'Preview data'}
          message={loading ? 'Withdrawal eligibility is loading.' : 'Live withdrawal checks appear after sign-in and sync.'}
        />
      ) : null}

      {error ? (
        <InlineAlert
          tone="danger"
          title="Withdrawal eligibility unavailable"
          message={error}
        />
      ) : null}

      {submitError ? (
        <InlineAlert
          tone="danger"
          title="Withdrawal request failed"
          message={submitError}
        />
      ) : null}

      <View style={styles.balancePanel}>
        <Text style={styles.balanceLabel}>Available balance</Text>
        <MoneyAmount amountKobo={data.wallet.availableKobo} tone="positive" />
      </View>

      <View style={styles.panel}>
        <AmountInput
          error={touched.amount ? fieldErrors.amount : undefined}
          label="Withdrawal amount"
          onBlur={() => markTouched('amount')}
          onChangeText={(value) => {
            markTouched('amount');
            setAmount(value.replace(/[^0-9]/g, ''));
          }}
          placeholder="Minimum NGN 500"
          value={amount}
        />
        <TextField
          error={touched.bankCode ? fieldErrors.bankCode : undefined}
          leftIcon={<Building2 color={colors.textMuted} size={16} />}
          label="Bank code"
          onBlur={() => markTouched('bankCode')}
          onChangeText={(value) => {
            markTouched('bankCode');
            setBankCode(value.replace(/[^0-9]/g, ''));
          }}
          placeholder="044"
          keyboardType="numeric"
          value={bankCode}
        />
        <TextField
          autoCapitalize="words"
          error={touched.accountName ? fieldErrors.accountName : undefined}
          leftIcon={<BadgeCheck color={colors.textMuted} size={16} />}
          label="Account name"
          onBlur={() => markTouched('accountName')}
          onChangeText={(value) => {
            markTouched('accountName');
            setAccountName(value);
          }}
          placeholder="Kade Adebayo"
          value={accountName}
        />
        <TextField
          autoCapitalize="none"
          error={touched.accountNumberToken ? fieldErrors.accountNumberToken : undefined}
          leftIcon={<Fingerprint color={colors.textMuted} size={16} />}
          label="Account token"
          onBlur={() => markTouched('accountNumberToken')}
          onChangeText={(value) => {
            markTouched('accountNumberToken');
            setAccountNumberToken(value);
          }}
          placeholder="acct_tok_123456"
          value={accountNumberToken}
        />
      </View>

      <InlineAlert
        tone="warning"
        title="Withdrawal checks apply"
        message="KYC, responsible gaming limits, available balance, and pending withdrawals are checked before approval."
      />

      <ActionButton
        accessibilityLabel="Review withdrawal"
        disabled={!canReview}
        icon={<ArrowUpRight color={colors.text} size={18} />}
        label={submitting ? 'Requesting' : 'Request withdrawal'}
        onPress={() => {
          void handleRequestWithdrawal();
        }}
      />
    </WalletFlowFrame>
  );

  function markTouched(field: WithdrawalField) {
    setTouched((current) => current[field] ? current : { ...current, [field]: true });
  }

  async function handleRequestWithdrawal() {
    setTouched({
      accountName: true,
      accountNumberToken: true,
      amount: true,
      bankCode: true,
    });

    const nextError = validateWithdrawalInput({ accountName, accountNumberToken, amount, bankCode }) ??
      (nairaToKobo(amount) > data.wallet.availableKobo ? 'Amount exceeds available balance.' : null);
    if (nextError) {
      setSubmitError(nextError);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const result = await requestWithdrawal({
      amount: nairaToKobo(amount),
      currency: 'NGN',
      destination: {
        accountName: accountName.trim(),
        accountNumberToken: accountNumberToken.trim(),
        bankCode: bankCode.trim(),
        type: 'bank_account',
      },
    });

    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: '/wallet/withdrawal-receipt',
      params: {
        amount: String(result.data.amount),
        destination: `${accountName.trim()} ${bankCode.trim()}`,
        reference: result.data.withdrawalRequestId,
      },
    });
  }
}

type WithdrawalField = 'accountName' | 'accountNumberToken' | 'amount' | 'bankCode';

function getWithdrawalFieldErrors(input: {
  accountName: string;
  accountNumberToken: string;
  amount: string;
  bankCode: string;
}) {
  const errors: Partial<Record<WithdrawalField, string>> = {};
  const amountKobo = nairaToKobo(input.amount);

  if (amountKobo < 50_000) errors.amount = 'Minimum withdrawal is NGN 500.';
  if (amountKobo > 5_000_000) errors.amount = 'Maximum withdrawal is NGN 50,000.';
  if (!/^[0-9]{3,12}$/.test(input.bankCode.trim())) errors.bankCode = 'Use 3 to 12 digits.';
  if (!/^[A-Za-z0-9:_-]{12,128}$/.test(input.accountNumberToken.trim())) {
    errors.accountNumberToken = 'Use a valid token reference.';
  }
  if (input.accountName.trim().length < 2 || input.accountName.trim().length > 120) {
    errors.accountName = 'Use 2 to 120 characters.';
  }

  return errors;
}

const styles = StyleSheet.create({
  balancePanel: {
    backgroundColor: colors.successDim,
    borderColor: colors.success,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[6],
    padding: spacing[16],
  },
  balanceLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
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
});
