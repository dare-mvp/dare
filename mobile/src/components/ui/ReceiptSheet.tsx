import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';
import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

export type ReceiptLine = {
  label: string;
  value: string;
};

type ReceiptSheetProps = {
  lines: ReceiptLine[];
  onClose: () => void;
  primaryLabel?: string;
  reference?: string;
  title: string;
  visible: boolean;
};

export function ReceiptSheet({
  lines,
  onClose,
  primaryLabel = 'Done',
  reference,
  title,
  visible,
}: ReceiptSheetProps) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <Pressable accessibilityLabel="Dismiss receipt" onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <Text style={styles.kicker}>Receipt</Text>
        <Text style={styles.title}>{title}</Text>
        {reference ? <Text style={styles.reference}>{reference}</Text> : null}
        <View style={styles.lines}>
          {lines.map((line) => (
            <View key={line.label} style={styles.line}>
              <Text style={styles.label}>{line.label}</Text>
              <Text numberOfLines={1} style={styles.value}>{line.value}</Text>
            </View>
          ))}
        </View>
        <ActionButton accessibilityLabel={primaryLabel} label={primaryLabel} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.62)',
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    bottom: 0,
    gap: spacing[12],
    left: 0,
    padding: spacing[20],
    position: 'absolute',
    right: 0,
  },
  kicker: {
    color: colors.success,
    fontFamily: fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  reference: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  lines: {
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  line: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: spacing[12],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});
