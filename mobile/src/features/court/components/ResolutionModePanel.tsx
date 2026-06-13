import { FileCheck2, Radio, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { CourtSession } from '../types';

type ResolutionModePanelProps = {
  resolutionType: CourtSession['resolutionType'];
};

export function ResolutionModePanel({ resolutionType }: ResolutionModePanelProps) {
  const copy = getResolutionCopy(resolutionType);
  const Icon = copy.icon;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Icon color={colors.primary} size={18} />
        <Text style={styles.kicker}>{copy.label}</Text>
      </View>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
    </View>
  );
}

function getResolutionCopy(resolutionType: CourtSession['resolutionType']) {
  if (resolutionType === 'witnessed') {
    return {
      body: 'Keep both sides present during the attempt. Confirmation depends on the witnessed session and the DARE rules agreed before accept.',
      icon: Radio,
      label: 'Witnessed',
      title: 'Live witnessed resolution',
    };
  }

  if (resolutionType === 'evidence') {
    return {
      body: 'Complete the task and attach evidence through the dispute or evidence flow when required. The rules define what proof is acceptable.',
      icon: FileCheck2,
      label: 'Evidence',
      title: 'Evidence-based resolution',
    };
  }

  return {
    body: 'Submit the answer agreed in the DARE rules. The committed answer key remains hidden until resolution.',
    icon: ShieldCheck,
    label: 'Answer Key',
    title: 'Committed answer resolution',
  };
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.black,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  kicker: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    textTransform: 'uppercase',
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
});
