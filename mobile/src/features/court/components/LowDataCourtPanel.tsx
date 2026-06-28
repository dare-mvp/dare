import { RadioTower, VideoOff } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { InlineAlert } from '../../../components/ui/InlineAlert';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { getCourtConnectionNotice, getLowDataCourtGuidance } from '../courtConnectivity';
import type { CourtSession } from '../types';

type LowDataCourtPanelProps = {
  session: CourtSession;
};

export function LowDataCourtPanel({ session }: LowDataCourtPanelProps) {
  const connectionNotice = getCourtConnectionNotice(session);
  const guidance = getLowDataCourtGuidance(session);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <RadioTower color={colors.info} size={17} />
          <Text style={styles.title}>Court connection</Text>
        </View>
        <StatusBadge label={guidance.cameraModeLabel.toUpperCase()} tone={guidance.tone} />
      </View>
      <View style={styles.guidanceRow}>
        <VideoOff color={guidance.tone === 'warning' ? colors.warning : colors.info} size={18} />
        <View style={styles.guidanceCopy}>
          <Text style={styles.guidanceTitle}>{guidance.title}</Text>
          <Text style={styles.guidanceBody}>{guidance.body}</Text>
        </View>
      </View>
      {connectionNotice ? (
        <InlineAlert
          message={connectionNotice.message}
          title={connectionNotice.title}
          tone={connectionNotice.tone}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  guidanceBody: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  guidanceCopy: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  guidanceRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: spacing[10],
    padding: spacing[12],
  },
  guidanceTitle: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '900',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing[8],
    minWidth: 0,
  },
});
