import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { MoneyAmount } from '../../src/components/ui/MoneyAmount';
import { Screen } from '../../src/components/ui/Screen';
import { TopBar } from '../../src/components/ui/TopBar';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { useMe } from '../../src/features/me/useMe';
import { TransactionRow } from '../../src/features/wallet/components/TransactionRow';
import { WalletHero } from '../../src/features/wallet/components/WalletHero';
import { WalletMetricCard } from '../../src/features/wallet/components/WalletMetricCard';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function WalletScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const summary = data.wallet;

  return (
    <Screen>
      <TopBar
        balanceLabel={formatNgnFromKobo(summary.availableKobo)}
        displayInitial={data.profile.avatarInitial}
        subtitle="Escrow and payouts"
        title="Wallet"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {data.source === 'mock' && !error ? (
          <InlineAlert
            tone="info"
            title={loading ? 'Syncing account' : 'Preview data'}
            message={loading ? 'Your account summary is loading.' : 'Live account data appears after sign-in and sync.'}
          />
        ) : null}

        {error ? (
          <InlineAlert
            tone="danger"
            title="Account sync failed"
            message={error}
          />
        ) : null}

        <WalletHero summary={summary} />

        <View style={styles.metricGrid}>
          <WalletMetricCard
            label="In escrow"
            meta={`${summary.activeChallenges} active challenges`}
            progressColor={colors.warning}
            progressValue={32}
            tone="money"
            value={summary.escrowKobo}
          />
          <WalletMetricCard
            label="Trust score"
            meta={`${summary.tier} - Max stake ${summary.maxStakeLabel}`}
            progressColor={colors.primary}
            progressValue={Math.round((summary.trustScore / 999) * 100)}
            tone="score"
            value={String(summary.trustScore)}
          />
        </View>

        <InlineAlert
          tone="info"
          title="Provider confirmation pending"
          message="Deposits and withdrawals stay pending until provider confirmation updates your wallet."
        />

        <View style={styles.actionPanel}>
          <View style={styles.actionCopy}>
            <Text style={styles.panelTitle}>Money actions</Text>
            <Text style={styles.panelText}>
              Deposit and withdrawal requests stay pending until provider confirmation updates your balance.
            </Text>
          </View>
          <View style={styles.actions}>
            <ActionButton
              label="Deposit"
              accessibilityLabel="Start deposit"
              disabled={!data.capabilities.canDeposit}
              icon={<ArrowDownLeft color={colors.text} size={18} />}
              onPress={() => router.push('/wallet/deposit')}
            />
            <ActionButton
              label="Withdraw"
              accessibilityLabel="Request withdrawal"
              disabled={!data.capabilities.canWithdraw}
              icon={<ArrowUpRight color={colors.text} size={18} />}
              onPress={() => router.push('/wallet/withdraw')}
              variant="secondary"
            />
          </View>
        </View>

        <View style={styles.summaryPanel}>
          <Text style={styles.panelTitle}>Earnings summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total earned</Text>
            <MoneyAmount amountKobo={summary.totalEarnedKobo} tone="positive" />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pending withdrawals</Text>
            <MoneyAmount amountKobo={summary.pendingWithdrawalKobo} tone="pending" />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>DARE coins</Text>
            <Text style={styles.coinAmount}>{summary.dareCoins.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.transactionsPanel}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.panelTitle}>Transaction history</Text>
            <Text style={styles.mutedLabel}>Last 20</Text>
          </View>
          {summary.transactions.length > 0 ? (
            summary.transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                onPress={() => router.push(`/wallet/transaction/${transaction.id}`)}
                transaction={transaction}
              />
            ))
          ) : (
            <View style={styles.emptyTransactions}>
              <ReceiptText color={colors.textMuted} size={26} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyText}>
                Confirmed wallet activity will appear here after deposits, withdrawals, escrow, and payouts.
              </Text>
            </View>
          )}
        </View>

        <InlineAlert
          tone="warning"
          title="Balances are confirmation-based"
          message="Wallet balances update only after confirmed ledger, escrow, and withdrawal records are available."
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[16],
    padding: spacing[16],
    paddingBottom: spacing[32],
  },
  metricGrid: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  actionPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[14],
    padding: spacing[16],
  },
  actionCopy: {
    gap: spacing[4],
  },
  panelTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  panelText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  actions: {
    gap: spacing[10],
  },
  summaryPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  summaryRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[12],
  },
  summaryLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  coinAmount: {
    color: colors.warning,
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    fontWeight: '900',
  },
  transactionsPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  transactionsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing[4],
  },
  mutedLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  emptyTransactions: {
    alignItems: 'center',
    gap: spacing[8],
    padding: spacing[20],
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    textAlign: 'center',
  },
});
