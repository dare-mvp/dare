import { Text, View, StyleSheet } from 'react-native';

import type { SettlementStatusResponse } from '../../../lib/actions/endpoints';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';

export function formatSettlementDeadline(value: string | null, status: SettlementStatusResponse['dispute']['status']) {
  if (!value) return formatStatus(status);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatStatus(status);
  return `${formatStatus(status)} - ${date.toLocaleString()}`;
}

export function SettlementSummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={settlementStatusPartStyles.summaryLine}>
      <Text style={settlementStatusPartStyles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={settlementStatusPartStyles.summaryValue}>{value}</Text>
    </View>
  );
}

export const settlementStatusPartStyles = StyleSheet.create({
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[14],
  },
  summaryLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});

function formatStatus(value: string) {
  return value.replace(/[_-]/g, ' ').toUpperCase();
}
