import { CreditCard, Landmark, Medal } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from '../../../components/ui/MoneyAmount';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { WalletSummary } from '../types';

type WalletHeroProps = {
  canDeposit?: boolean;
  canWithdraw?: boolean;
  onCoinsPress: () => void;
  onDepositPress: () => void;
  onWithdrawPress: () => void;
  summary: WalletSummary;
};

export function WalletHero({
  canDeposit = true,
  canWithdraw = true,
  onCoinsPress,
  onDepositPress,
  onWithdrawPress,
  summary,
}: WalletHeroProps) {
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
        <WalletAction
          disabled={!canDeposit}
          icon={<CreditCard color={colors.textSoft} size={18} />}
          label="Deposit"
          onPress={onDepositPress}
        />
        <WalletAction
          disabled={!canWithdraw}
          icon={<Landmark color={colors.textSoft} size={18} />}
          label="Withdraw"
          onPress={onWithdrawPress}
        />
        <WalletAction icon={<Medal color={colors.warning} size={18} />} label="Coins" onPress={onCoinsPress} />
      </View>
    </View>
  );
}

function WalletAction({
  disabled = false,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, disabled && styles.actionDisabled, pressed && !disabled && styles.actionPressed]}
    >
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
  },
  actionDisabled: {
    opacity: 0.46,
  },
  actionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  actionLabel: {
    color: colors.textSoft,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
});
