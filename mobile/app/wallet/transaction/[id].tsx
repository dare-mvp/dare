import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../../src/components/ui/ActionButton';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { InlineAlert } from '../../../src/components/ui/InlineAlert';
import { MoneyAmount } from '../../../src/components/ui/MoneyAmount';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { WalletFlowFrame } from '../../../src/features/wallet/components/WalletFlowFrame';
import { useWalletTransaction } from '../../../src/features/wallet/useWalletTransaction';
import { colors, fonts, radius, spacing, typography } from '../../../src/theme/tokens';

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { error, loading, source, transaction } = useWalletTransaction(id);

  if (!transaction && !loading) {
    return (
      <WalletFlowFrame
        eyebrow="Transaction"
        onBack={() => router.back()}
        title="Transaction not found."
        subtitle="The selected wallet record is not available right now."
      >
        {error ? (
          <InlineAlert
            tone="danger"
            title="Transaction sync failed"
            message={error}
          />
        ) : null}
        <ErrorState
          body="Return to wallet and choose another transaction."
          onRetry={() => router.replace('/(tabs)/wallet')}
          retryLabel="Back to wallet"
          title="Unable to load transaction"
        />
      </WalletFlowFrame>
    );
  }

  if (!transaction) {
    return (
      <WalletFlowFrame
        eyebrow="Transaction"
        onBack={() => router.back()}
        title="Details."
        subtitle="Loading wallet record from confirmed ledger entries."
      >
        <InlineAlert
          tone="info"
          title="Loading transaction"
          message="Fetching the latest ledger record."
        />
      </WalletFlowFrame>
    );
  }

  const signedAmount = transaction.direction === 'credit'
    ? transaction.amountKobo
    : -transaction.amountKobo;

  return (
    <WalletFlowFrame
      eyebrow="Transaction"
      onBack={() => router.back()}
      title="Details."
      subtitle="Wallet records are confirmation-based and cannot be edited from the app."
    >
      {source === 'mock' ? (
        <InlineAlert
          tone="info"
          title="Preview transaction"
          message="Live transaction details appear after sign-in and sync."
        />
      ) : null}

      <View style={styles.hero}>
        <StatusBadge
          label={transaction.status.toUpperCase()}
          tone={transaction.status === 'confirmed' ? 'success' : 'warning'}
        />
        <MoneyAmount
          amountKobo={signedAmount}
          tone={transaction.direction === 'credit' ? 'positive' : 'negative'}
        />
        <Text style={styles.reference}>{transaction.id.toUpperCase()}</Text>
      </View>

      <View style={styles.detailPanel}>
        <DetailLine label="Date" value={transaction.createdLabel} />
        <DetailLine label="Direction" value={transaction.direction} />
        <DetailLine label="Type" value={transaction.type.replace(/_/g, ' ')} />
        <DetailLine label="Status" value={transaction.status} />
      </View>

      <ActionButton accessibilityLabel="Back to wallet" label="Back to wallet" onPress={() => router.replace('/(tabs)/wallet')} />
    </WalletFlowFrame>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[20],
  },
  reference: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  detailPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  detailLine: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[14],
  },
  detailLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '800',
    textAlign: 'right',
    textTransform: 'capitalize',
  },
});
