import { useRouter } from 'expo-router';
import { FolderOpen, Scale, Vote } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { JuryFlowFrame } from '../../src/features/jury/components/JuryFlowFrame';
import { useJurySummary } from '../../src/features/jury/useJurySummary';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function JuryHomeScreen() {
  const router = useRouter();
  const jurySummary = useJurySummary();

  return (
    <JuryFlowFrame
      eyebrow="Jury"
      onBack={() => router.back()}
      title="Review blind cases."
      subtitle="Jury votes use anonymized evidence packets. Timely votes can improve trust."
    >
      {jurySummary.source === 'mock' && !jurySummary.error ? (
        <InlineAlert
          tone="info"
          title={jurySummary.loading ? 'Syncing jury' : 'Preview jury'}
          message={jurySummary.loading ? 'Jury eligibility is loading.' : 'Live jury assignments appear after sign-in and sync.'}
        />
      ) : null}

      {jurySummary.error ? (
        <InlineAlert
          tone="danger"
          title="Jury sync failed"
          message={jurySummary.error}
        />
      ) : null}

      <View style={styles.hero}>
        <Vote color={colors.purple} size={30} />
        <View style={styles.heroCopy}>
          <StatusBadge
            label={jurySummary.eligibility.toUpperCase()}
            tone={jurySummary.eligibility === 'Eligible' ? 'success' : 'warning'}
          />
          <Text style={styles.heroTitle}>Jury opt-in active</Text>
          <Text style={styles.heroText}>You can receive assignments in your selected categories.</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="Active" value={String(jurySummary.activeAssignments)} />
        <Stat label="Votes" value={String(jurySummary.completedVotes)} />
        <Stat label="Trust earned" value={`+${jurySummary.trustEarned}`} />
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Scale color={colors.purple} size={20} />
          <Text style={styles.panelTitle}>Categories</Text>
        </View>
        <View style={styles.chips}>
          {jurySummary.categories.map((category) => (
            <StatusBadge key={category} label={category.toUpperCase()} tone="neutral" />
          ))}
        </View>
      </View>

      <InlineAlert
        tone="warning"
        title="Votes are final"
        message="Review both packets before voting. Submitted jury votes cannot be changed."
      />

      <ActionButton
        accessibilityLabel="Open jury assignment"
        icon={<FolderOpen color={colors.text} size={17} />}
        label="Open assignment"
        onPress={() => router.push('/jury/assignment')}
      />
    </JuryFlowFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    backgroundColor: colors.purpleDim,
    borderColor: colors.purple,
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
  stats: {
    flexDirection: 'row',
    gap: spacing[10],
  },
  stat: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: spacing[12],
  },
  statValue: {
    color: colors.purple,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[6],
  },
});
