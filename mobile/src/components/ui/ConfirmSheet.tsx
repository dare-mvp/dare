import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ReactNode } from 'react';

import { ActionButton } from './ActionButton';
import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type ConfirmSheetProps = {
  body: string;
  children?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

export function ConfirmSheet({
  body,
  children,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
  title,
  visible,
}: ConfirmSheetProps) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <Pressable accessibilityLabel="Dismiss confirmation" onPress={onCancel} style={styles.backdrop} />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {children ? <View style={styles.content}>{children}</View> : null}
        <View style={styles.actions}>
          <ActionButton accessibilityLabel="Cancel" label="Cancel" onPress={onCancel} variant="secondary" />
          <ActionButton
            accessibilityLabel={confirmLabel}
            label={confirmLabel}
            onPress={onConfirm}
            variant={destructive ? 'danger' : 'primary'}
          />
        </View>
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
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  content: {
    marginTop: spacing[4],
  },
  actions: {
    gap: spacing[10],
  },
});
