import { Pencil, Share2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';
import { ProfileSummary, ProfileStat } from '../types';

type ProfileHeroProps = {
  onEditPress?: () => void;
  onSharePress?: () => void;
  profile: ProfileSummary;
};

export function ProfileHero({ onEditPress, onSharePress, profile }: ProfileHeroProps) {
  const stats: ProfileStat[] = [
    { label: 'Wins', tone: 'default', value: String(profile.wins) },
    { label: 'Win rate', tone: 'primary', value: profile.winRate },
    { label: 'Earned', tone: 'warning', value: profile.earnedLabel },
    { label: 'Disputes', tone: 'success', value: String(profile.disputes) },
  ];

  return (
    <View style={styles.hero}>
      <View style={styles.banner} />
      <View style={styles.avatarWrap}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.avatarInitial}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.name}>{profile.displayName}</Text>
      <View style={styles.tierBadge}>
        <Text style={styles.tierText}>{profile.tier.toUpperCase()} - Trust Score {profile.trustScore}</Text>
      </View>
      <View style={styles.specialties}>
        {profile.specialties.map((specialty) => (
          <StatusBadge key={specialty} label={specialty.toUpperCase()} tone="neutral" />
        ))}
      </View>
      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="Edit profile"
          icon={<Pencil color={colors.text} size={16} />}
          label="Edit"
          onPress={onEditPress}
          variant="secondary"
        />
        <ActionButton
          accessibilityLabel="Share profile"
          icon={<Share2 color={colors.text} size={16} />}
          label="Share"
          onPress={onSharePress}
          variant="secondary"
        />
      </View>
      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              numberOfLines={1}
              style={[styles.statValue, isLongStatValue(stat.value) && styles.statValueCompact, statToneStyles[stat.tone]]}
            >
              {stat.value}
            </Text>
            <Text numberOfLines={1} style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function isLongStatValue(value: string) {
  return value.length > 6;
}

const statToneStyles = StyleSheet.create({
  default: {
    color: colors.text,
  },
  primary: {
    color: colors.primary,
  },
  success: {
    color: colors.success,
  },
  warning: {
    color: colors.warning,
  },
});

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing[20],
    paddingTop: spacing[32],
  },
  banner: {
    backgroundColor: colors.primaryDim,
    height: 72,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  avatarWrap: {
    marginBottom: spacing[12],
  },
  avatarRing: {
    borderColor: colors.primary,
    borderRadius: radius.pill,
    borderWidth: 2,
    padding: spacing[4],
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  avatarText: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 36,
    fontWeight: '900',
  },
  name: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '900',
  },
  tierBadge: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primaryGlow,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: spacing[6],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[6],
  },
  tierText: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[6],
    justifyContent: 'center',
    marginTop: spacing[12],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[8],
    marginTop: spacing[12],
    width: '100%',
  },
  stats: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing[16],
    rowGap: spacing[10],
    paddingTop: spacing[12],
    width: '100%',
  },
  stat: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    width: '48%',
    minWidth: 0,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[10],
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
    maxWidth: '100%',
    minHeight: 24,
    textAlign: 'center',
  },
  statValueCompact: {
    fontFamily: fonts.displaySemi,
    fontSize: 17,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: spacing[4],
    maxWidth: '100%',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
