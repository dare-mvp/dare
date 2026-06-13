import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgePlus,
  LockKeyhole,
  RotateCcw,
  Scale,
  Trophy,
  Vote,
  Wrench,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from '../../../components/ui/MoneyAmount';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';
import { WalletTransaction, WalletTransactionType } from '../types';

type TransactionRowProps = {
  onPress?: () => void;
  transaction: WalletTransaction;
};

const transactionIcons: Record<WalletTransactionType, React.ReactNode> = {
  adjustment: <Wrench color={colors.info} size={18} />,
  bonus_credit: <BadgePlus color={colors.success} size={18} />,
  deposit: <ArrowDownLeft color={colors.success} size={18} />,
  jury_reward: <Vote color={colors.purple} size={18} />,
  payout: <Trophy color={colors.warning} size={18} />,
  platform_fee: <Scale color={colors.textMuted} size={18} />,
  reversal: <RotateCcw color={colors.info} size={18} />,
  stake_lock: <LockKeyhole color={colors.warning} size={18} />,
  stake_release: <ArrowDownLeft color={colors.success} size={18} />,
  withdrawal_pending: <ArrowUpRight color={colors.danger} size={18} />,
};

export function TransactionRow({ onPress, transaction }: TransactionRowProps) {
  const signedAmount = transaction.direction === 'credit'
    ? transaction.amountKobo
    : -transaction.amountKobo;

  return (
    <Pressable
      accessibilityLabel={`Open ${transaction.label} transaction`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>{transactionIcons[transaction.type]}</View>
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.label}>{transaction.label}</Text>
        <Text numberOfLines={1} style={styles.description}>{transaction.description}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{transaction.createdLabel}</Text>
          {transaction.status !== 'confirmed' ? (
            <StatusBadge
              label={transaction.status.toUpperCase()}
              tone={transaction.status === 'failed' ? 'danger' : 'warning'}
            />
          ) : null}
        </View>
      </View>
      <MoneyAmount amountKobo={signedAmount} tone={transaction.direction === 'credit' ? 'positive' : 'negative'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    paddingVertical: spacing[12],
  },
  pressed: {
    opacity: 0.78,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
  },
  description: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    marginTop: spacing[4],
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
    marginTop: spacing[4],
  },
  time: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
});
