import { CircleDollarSign, Clock3 } from 'lucide-react-native';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TextField } from '../../../components/ui/TextField';
import { colors, fonts, spacing, typography } from '../../../theme/tokens';
import { createSectionIcons, durationOptions } from '../createVisuals';
import { CreateDareDraft } from '../types';
import { SelectPill } from './SelectPill';

type TimeEscrowSectionProps = {
  durationError?: string;
  durationSeconds: number;
  onDurationChange: (value: number) => void;
  onStakeChange: (value: string) => void;
  stakeError?: string;
  stakeNaira: string;
};

export function TimeEscrowSection({
  durationError,
  durationSeconds,
  onDurationChange,
  onStakeChange,
  stakeError,
  stakeNaira,
}: TimeEscrowSectionProps) {
  return (
    <View style={styles.section}>
      <SectionTitle eyebrow="Stake" icon={createSectionIcons.stake} title="Set time and escrow" />
      <View style={styles.pillGrid}>
        {durationOptions.map((duration) => (
          <SelectPill
            icon={duration.icon}
            key={duration.value}
            label={duration.label}
            onSelect={onDurationChange}
            selected={durationSeconds === duration.value}
            value={duration.value}
          />
        ))}
      </View>
      <TextField
        accessibilityLabel="Preferred DARE duration in minutes"
        error={durationError}
        keyboardType="numeric"
        label="Preferred time"
        leftIcon={<Clock3 color={colors.textMuted} size={16} />}
        onChangeText={(value) => onDurationChange(parseMinutes(value))}
        placeholder="1 to 60 minutes"
        value={formatMinutes(durationSeconds)}
      />
      <TextField
        error={stakeError}
        keyboardType="numeric"
        label="Stake amount"
        leftIcon={<CircleDollarSign color={colors.warning} size={16} />}
        onChangeText={(value) => onStakeChange(value.replace(/[^0-9]/g, ''))}
        placeholder="Minimum NGN 100"
        value={stakeNaira}
      />
    </View>
  );
}

type DurationField = Pick<CreateDareDraft, 'durationSeconds'>;

function formatMinutes(durationSeconds: DurationField['durationSeconds']) {
  if (durationSeconds < 60) return '';
  return String(Math.round(durationSeconds / 60));
}

function parseMinutes(value: string) {
  const minutes = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(minutes) ? minutes * 60 : 0;
}

function SectionTitle({ eyebrow, icon, title }: { eyebrow: string; icon: ReactNode; title: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <View style={styles.eyebrowRow}>
        {icon}
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[12],
  },
  sectionTitleWrap: {
    gap: spacing[4],
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[6],
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
});
