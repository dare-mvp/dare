import { useRouter } from 'expo-router';
import { Medal, ReceiptText } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { useMe } from '../../src/features/me/useMe';
import { WalletFlowFrame } from '../../src/features/wallet/components/WalletFlowFrame';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function WalletCoinsScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const summary = data.wallet;

  return (
    <WalletFlowFrame
      eyebrow="DARE Coins"
      onBack={() => router.back()}
      title="Coins."
      subtitle="DARE Coins are account rewards shown from confirmed wallet and profile data."
    >
      {data.source === 'mock' && !error ? (
        <InlineAlert
          tone="info"
          title={loading ? 'Syncing coins' : 'Preview data'}
          message={loading ? 'Your coin balance is loading.' : 'Live coin data appears after sign-in and sync.'}
        />
      ) : null}

      {error ? (
        <InlineAlert
          tone="danger"
          title="Coin sync failed"
          message={error}
        />
      ) : null}

      <View style={styles.hero}>
        <View style={styles.medal}>
          <Medal color={colors.warning} size={34} />
        </View>
        <Text style={styles.amount}>{summary.dareCoins.toLocaleString()}</Text>
        <Text style={styles.label}>Available DARE Coins</Text>
      </View>

      <View style={styles.panel}>
        <DetailLine label="Trust tier" value={summary.tier} />
        <DetailLine label="Trust score" value={String(summary.trustScore)} />
        <DetailLine label="Total earned" value={formatNgnFromKobo(summary.totalEarnedKobo)} />
        <DetailLine label="Active challenges" value={String(summary.activeChallenges)} />
      </View>

      <InlineAlert
        tone="info"
        title="Coins are not cash balance"
        message="Coins are separate from NGN wallet funds. Cash deposits, escrow, payouts, and withdrawals remain in your wallet ledger."
      />

      <ActionButton
        accessibilityLabel="View wallet transactions"
        icon={<ReceiptText color={colors.text} size={18} />}
        label="View wallet activity"
        onPress={() => router.replace('/(tabs)/wallet')}
      />
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
    gap: spacing[8],
    padding: spacing[20],
  },
  medal: {
    alignItems: 'center',
    backgroundColor: colors.warningDim,
    borderColor: 'rgba(255,176,32,0.28)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  amount: {
    color: colors.warning,
    fontFamily: fonts.display,
    fontSize: 42,
    fontWeight: '900',
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  panel: {
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
