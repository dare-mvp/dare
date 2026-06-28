import { AlertTriangle, ShieldAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import type { AcceptTrustWarning } from '../acceptTrustWarnings';

type AcceptTrustWarningPanelProps = {
  acknowledged: boolean;
  onAcknowledge: () => void;
  warnings: AcceptTrustWarning[];
};

export function AcceptTrustWarningPanel({
  acknowledged,
  onAcknowledge,
  warnings,
}: AcceptTrustWarningPanelProps) {
  if (warnings.length === 0) return null;

  const hasAcknowledgementWarnings = warnings.some((warning) => warning.acknowledgementRequired && !warning.blocking);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <ShieldAlert color={colors.warning} size={22} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Accept-time warnings</Text>
          <Text style={styles.body}>Review these before funds or time are committed.</Text>
        </View>
      </View>
      {warnings.map((warning) => (
        <View key={warning.code} style={styles.warning}>
          <AlertTriangle color={warning.blocking ? colors.danger : colors.warning} size={16} />
          <View style={styles.warningCopy}>
            <Text style={styles.warningTitle}>{warning.title}</Text>
            <Text style={styles.warningBody}>{warning.message}</Text>
          </View>
        </View>
      ))}
      {hasAcknowledgementWarnings ? (
        <ActionButton
          accessibilityLabel="Acknowledge accept-time risk warnings"
          label={acknowledged ? 'Risk acknowledged' : 'Acknowledge risk'}
          onPress={onAcknowledge}
          variant={acknowledged ? 'secondary' : 'primary'}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.warningDim,
    borderColor: colors.warning,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[10],
  },
  headerCopy: {
    flex: 1,
    gap: spacing[4],
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
  warning: {
    alignItems: 'flex-start',
    borderTopColor: colors.borderStrong,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    paddingTop: spacing[10],
  },
  warningCopy: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  warningTitle: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
  },
  warningBody: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
});
