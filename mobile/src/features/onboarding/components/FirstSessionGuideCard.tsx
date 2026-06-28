import { Eye, ListFilter, PlusCircle, X } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { IconButton } from '../../../components/ui/IconButton';
import { colors, fonts, radius, spacing } from '../../../theme/tokens';

type FirstSessionGuideCardProps = {
  canCreate: boolean;
  hasLiveCourt: boolean;
  onCreate: () => void;
  onDismiss: () => void;
  onExploreOpen: () => void;
  onWatchCourt: () => void;
};

export function FirstSessionGuideCard({
  canCreate,
  hasLiveCourt,
  onCreate,
  onDismiss,
  onExploreOpen,
  onWatchCourt,
}: FirstSessionGuideCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Start here</Text>
          <Text style={styles.title}>Choose one low-risk action.</Text>
        </View>
        <IconButton accessibilityLabel="Dismiss first-session guide" icon={<X color={colors.textMuted} size={18} />} onPress={onDismiss} />
      </View>
      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel={canCreate ? 'Create your first DARE' : 'Review account before creating a DARE'}
          disabled={!canCreate}
          icon={<PlusCircle color={colors.text} size={17} />}
          label={canCreate ? 'Create first DARE' : 'Create locked'}
          onPress={onCreate}
        />
        <ActionButton
          accessibilityLabel="Explore open low stake DAREs"
          icon={<ListFilter color={colors.text} size={17} />}
          label="Explore open"
          onPress={onExploreOpen}
          variant="secondary"
        />
        <ActionButton
          accessibilityLabel="Watch a live Court"
          disabled={!hasLiveCourt}
          icon={<Eye color={colors.text} size={17} />}
          label={hasLiveCourt ? 'Watch Court' : 'No Court live'}
          onPress={onWatchCourt}
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing[8],
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[14],
  },
  copy: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 15,
    fontWeight: '900',
  },
});
