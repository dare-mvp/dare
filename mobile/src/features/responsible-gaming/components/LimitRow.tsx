import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';

type LimitRowProps = {
  currentLabel: string;
  label: string;
  pendingIncreaseLabel?: string;
};

export function LimitRow({ currentLabel, label, pendingIncreaseLabel }: LimitRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.current}>{currentLabel}</Text>
        {pendingIncreaseLabel ? <Text style={styles.pending}>{pendingIncreaseLabel}</Text> : null}
      </View>
      {pendingIncreaseLabel ? <StatusBadge label="COOLING" tone="warning" /> : <StatusBadge label="ACTIVE" tone="success" />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    padding: spacing[12],
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  current: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '900',
    marginTop: spacing[4],
  },
  pending: {
    color: colors.warning,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing[4],
  },
});
