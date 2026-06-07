import { useRouter } from 'expo-router';
import { Ban, Gauge, ShieldCheck, SlidersHorizontal } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { LimitRow } from '../../src/features/responsible-gaming/components/LimitRow';
import { ResponsibleGamingFrame } from '../../src/features/responsible-gaming/components/ResponsibleGamingFrame';
import { useMe } from '../../src/features/me/useMe';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function ResponsibleGamingScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const isRestricted = data.profile.accountStatus === 'restricted';

  return (
    <ResponsibleGamingFrame
      eyebrow="Responsible gaming"
      onBack={() => router.back()}
      title="Control your limits."
      subtitle="Deposit, stake, session, and exclusion controls help keep play deliberate."
    >
      <View style={styles.hero}>
        <ShieldCheck color={isRestricted ? colors.warning : colors.success} size={28} />
        <View style={styles.heroCopy}>
          <StatusBadge label={isRestricted ? 'RESTRICTED' : 'ACTIVE'} tone={isRestricted ? 'warning' : 'success'} />
          <Text style={styles.heroTitle}>{loading ? 'Loading controls' : 'Limits are active'}</Text>
          <Text style={styles.heroText}>
            Limit increases use a cooling-off period before they affect money-moving actions.
          </Text>
        </View>
      </View>

      {error ? (
        <InlineAlert tone="warning" title="Preview limits shown" message={error} />
      ) : data.source === 'mock' ? (
        <InlineAlert
          tone="info"
          title="Preview limits shown"
          message="Sign in to load your live responsible gaming controls."
        />
      ) : null}

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Gauge color={colors.primary} size={20} />
          <Text style={styles.panelTitle}>Current limits</Text>
        </View>
        {data.profile.limits.map((limit) => (
          <LimitRow
            currentLabel={limit.currentLabel}
            key={limit.label}
            label={limit.label}
            pendingIncreaseLabel={limit.pendingIncreaseLabel}
          />
        ))}
      </View>

      <InlineAlert
        tone="warning"
        title="Higher limits are delayed"
        message="Increases require cooling-off. Decreases can take effect sooner after confirmation."
      />

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="Edit responsible gaming limits"
          icon={<SlidersHorizontal color={colors.text} size={18} />}
          label="Edit limits"
          onPress={() => router.push('/responsible-gaming/edit-limits')}
        />
        <ActionButton
          accessibilityLabel="Start self-exclusion"
          icon={<Ban color={colors.text} size={18} />}
          label="Self-exclusion"
          onPress={() => router.push('/responsible-gaming/self-exclusion')}
          variant="secondary"
        />
      </View>

      <View style={styles.notice}>
        <Ban color={colors.danger} size={18} />
        <Text style={styles.noticeText}>Self-exclusion blocks deposits, DARE creation, and court ready-up for the selected period.</Text>
      </View>
    </ResponsibleGamingFrame>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    backgroundColor: colors.successDim,
    borderColor: colors.success,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[16],
  },
  heroCopy: {
    flex: 1,
    gap: spacing[8],
    minWidth: 0,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  heroText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  panelTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  actions: {
    gap: spacing[10],
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    padding: spacing[12],
  },
  noticeText: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
});
