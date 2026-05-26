import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';

type CourtPhaseCardProps = {
  body: string;
  children?: ReactNode;
  statusLabel: string;
  statusTone?: 'danger' | 'neutral' | 'success' | 'warning';
  title: string;
};

export function CourtPhaseCard({
  body,
  children,
  statusLabel,
  statusTone = 'neutral',
  title,
}: CourtPhaseCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <StatusBadge label={statusLabel} tone={statusTone} />
      </View>
      <Text style={styles.body}>{body}</Text>
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    flex: 1,
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
    gap: spacing[10],
  },
});
