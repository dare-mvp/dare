import { CreditCard, Landmark, Medal } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from '../../../components/ui/MoneyAmount';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { WalletSummary } from '../types';

type WalletHeroProps = {
  summary: WalletSummary;
};

export function WalletHero({ summary }: WalletHeroProps) {
  return (
    <View style={styles.hero}>
      <View style={styles.top}>
        <View>
          <Text style={styles.label}>Available Balance</Text>
          <MoneyAmount amountKobo={summary.availableKobo} tone="positive" />
        </View>
        <View style={styles.coins}>
          <Text style={styles.coinLabel}>DARE Coins</Text>
          <Text style={styles.coinValue}>{summary.dareCoins.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={styles.escrow}>
        {formatNgn(summary.escrowKobo)} in active escrow
        {summary.heldKobo > 0 ? ` - ${formatNgn(summary.heldKobo)} in dispute hold` : ''}
      </Text>

      <View style={styles.actions}>
        <WalletAction icon={<CreditCard color={colors.textSoft} size={18} />} label="Deposit" />
        <WalletAction icon={<Landmark color={colors.textSoft} size={18} />} label="Withdraw" />
        <WalletAction icon={<Medal color={colors.warning} size={18} />} label="Coins" />
      </View>
    </View>
  );
}

function WalletAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={styles.action}>
      {icon}
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function formatNgn(amountKobo: number) {
  return new Intl.NumberFormat('en-NG', {
    currency: 'NGN',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amountKobo / 100);
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing[16],
    overflow: 'hidden',
    padding: spacing[20],
  },
  top: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: spacing[12],
    textTransform: 'uppercase',
  },
  coins: {
    alignItems: 'flex-end',
  },
  coinLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  coinValue: {
    color: colors.warning,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    marginTop: spacing[4],
  },
  escrow: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[10],
  },
  action: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    flex: 1,
    gap: spacing[6],
    minHeight: 62,
    justifyContent: 'center',
    opacity: 0.72,
  },
  actionLabel: {
    color: colors.textSoft,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
});
