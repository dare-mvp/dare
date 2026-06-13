import { CircleDollarSign, Clock3 } from 'lucide-react-native';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TextField } from '../../../components/ui/TextField';
import { colors, fonts, spacing, typography } from '../../../theme/tokens';
import { createSectionIcons, durationOptions } from '../createVisuals';
import { CreateDareDraft } from '../types';
import { SelectPill } from './SelectPill';

type TimeEscrowSectionProps = {
  dareType: CreateDareDraft['dareType'];
  durationError?: string;
  durationSeconds: number;
  onDurationChange: (value: number) => void;
  onRewardChange: (value: string) => void;
  onStakeChange: (value: string) => void;
  rewardError?: string;
  rewardNaira: string;
  stakeError?: string;
  stakeNaira: string;
};

export function TimeEscrowSection({
  dareType,
  durationError,
  durationSeconds,
  onDurationChange,
  onRewardChange,
  onStakeChange,
  rewardError,
  rewardNaira,
  stakeError,
  stakeNaira,
}: TimeEscrowSectionProps) {
  const isTask = dareType === 'task';

  return (
    <View style={styles.section}>
      <SectionTitle
        eyebrow={isTask ? 'Reward' : 'Stake'}
        icon={createSectionIcons.stake}
        title={isTask ? 'Set time and reward' : 'Set time and stake'}
      />
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
        error={isTask ? rewardError : stakeError}
        keyboardType="numeric"
        label={isTask ? 'Darer reward amount' : 'Stake amount'}
        leftIcon={<CircleDollarSign color={colors.warning} size={16} />}
        onChangeText={(value) => {
          const normalized = value.replace(/[^0-9]/g, '');
          if (isTask) onRewardChange(normalized);
          else onStakeChange(normalized);
        }}
        placeholder={isTask ? 'Minimum reward NGN 100' : 'Minimum stake NGN 100'}
        value={isTask ? rewardNaira : stakeNaira}
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
