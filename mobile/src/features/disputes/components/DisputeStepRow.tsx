import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, spacing } from '../../../theme/tokens';

type DisputeStepRowProps = {
  label: string;
  status: 'done' | 'pending' | 'active';
};

const statusLabel = {
  active: 'ACTIVE',
  done: 'DONE',
  pending: 'PENDING',
} as const;

export function DisputeStepRow({ label, status }: DisputeStepRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <StatusBadge label={statusLabel[status]} tone={status === 'done' ? 'success' : 'warning'} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[14],
  },
  label: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
  },
});
