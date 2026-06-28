import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import type { ConstitutionHealth } from '../constitutionHealth';

type ConstitutionHealthPanelProps = {
  health: ConstitutionHealth;
};

export function ConstitutionHealthPanel({ health }: ConstitutionHealthPanelProps) {
  const isValid = health.status === 'valid';
  const icon = isValid
    ? <CheckCircle2 color={colors.success} size={22} />
    : health.status === 'warning'
    ? <AlertTriangle color={colors.warning} size={22} />
    : <CircleAlert color={colors.danger} size={22} />;

  return (
    <View style={[styles.panel, health.status === 'blocking' && styles.blockingPanel]}>
      <View style={styles.header}>
        {icon}
        <View style={styles.headerCopy}>
          <StatusBadge
            label={isValid ? 'READY TO PUBLISH' : health.status === 'warning' ? `REVIEW ${health.warningCount}` : `FIX ${health.blockingCount}`}
            tone={isValid ? 'success' : health.status === 'warning' ? 'warning' : 'danger'}
          />
          <Text style={styles.title}>{isValid ? 'Constitution health is clear' : 'Constitution health'}</Text>
          <Text style={styles.body}>
            {isValid
              ? 'Rules, proof, timing, and money terms are specific enough for review.'
              : 'Fix blocking items before publishing. Warnings should be tightened before you continue.'}
          </Text>
        </View>
      </View>
      {health.issues.slice(0, 4).map((issue) => (
        <View key={`${issue.code}-${issue.field}`} style={styles.issue}>
          <Text style={styles.issueAction}>{issue.actionLabel}</Text>
          <Text style={styles.issueText}>{issue.message}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  blockingPanel: {
    borderColor: colors.danger,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[12],
  },
  headerCopy: {
    flex: 1,
    gap: spacing[6],
    minWidth: 0,
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
    fontSize: 13,
    lineHeight: 19,
  },
  issue: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[4],
    paddingTop: spacing[10],
  },
  issueAction: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
  },
  issueText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
});
