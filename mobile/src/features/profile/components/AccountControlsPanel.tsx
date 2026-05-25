import { BadgeCheck, Scale, ShieldCheck, SlidersHorizontal } from 'lucide-react-native';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { InlineAlert } from '../../../components/ui/InlineAlert';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';
import { ProfileSummary } from '../types';

type AccountControlsPanelProps = {
  onKycPress?: () => void;
  onJuryPress?: () => void;
  onJuryEligibilityPress?: () => void;
  onResponsibleGamingPress?: () => void;
  profile: ProfileSummary;
};

export function AccountControlsPanel({
  onJuryEligibilityPress,
  onJuryPress,
  onKycPress,
  onResponsibleGamingPress,
  profile,
}: AccountControlsPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>KYC Status</Text>
          <StatusBadge label={profile.kycTier.toUpperCase()} tone="warning" />
        </View>
        <Text style={styles.body}>Higher stakes and withdrawals require verified identity before ready-up or payout.</Text>
        <ActionButton
          accessibilityLabel="Open KYC status"
          icon={<BadgeCheck color={colors.text} size={17} />}
          label="KYC status"
          onPress={onKycPress}
          variant="secondary"
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>Jury Settings</Text>
          <Switch
            accessibilityLabel="Jury opt-in"
            disabled
            thumbColor={profile.juryOptIn ? colors.primary : colors.textGhost}
            trackColor={{ false: colors.surfaceElevated, true: colors.primaryDim }}
            value={profile.juryOptIn}
          />
        </View>
        <Text style={styles.body}>Opt in to jury cases, earn trust for timely votes, and lose trust when assigned votes expire.</Text>
        <View style={styles.chips}>
          {profile.juryCategories.map((category) => (
            <StatusBadge key={category} label={category.toUpperCase()} tone="neutral" />
          ))}
        </View>
        <ActionButton
          accessibilityLabel="Open jury assignments"
          icon={<Scale color={colors.text} size={17} />}
          label="Open jury"
          onPress={onJuryPress}
          variant="secondary"
        />
        <ActionButton
          accessibilityLabel="Open jury eligibility"
          icon={<ShieldCheck color={colors.text} size={17} />}
          label="Eligibility"
          onPress={onJuryEligibilityPress}
          variant="secondary"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Responsible Gaming</Text>
        {profile.limits.map((limit) => (
          <View key={limit.label} style={styles.limitRow}>
            <View style={styles.limitCopy}>
              <Text style={styles.limitLabel}>{limit.label}</Text>
              <Text style={styles.limitValue}>{limit.currentLabel}</Text>
            </View>
            {limit.pendingIncreaseLabel ? (
              <StatusBadge label="COOLING" tone="warning" />
            ) : null}
          </View>
        ))}
        <ActionButton
          accessibilityLabel="Open responsible gaming controls"
          icon={<SlidersHorizontal color={colors.text} size={17} />}
          label="Manage controls"
          onPress={onResponsibleGamingPress}
          variant="secondary"
        />
      </View>

      <InlineAlert
        tone="warning"
        title="Limit increases are delayed"
        message="Cooling-off periods must complete before higher responsible gaming limits affect deposits, stakes, or session time."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[12],
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[6],
  },
  limitRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  limitCopy: {
    flex: 1,
    minWidth: 0,
  },
  limitLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  limitValue: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing[4],
  },
});
