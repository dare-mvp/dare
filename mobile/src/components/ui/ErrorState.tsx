import { AlertTriangle } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';
import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

type ErrorStateProps = {
  body: string;
  onRetry?: () => void;
  retryLabel?: string;
  title: string;
};

export function ErrorState({ body, onRetry, retryLabel = 'Try again', title }: ErrorStateProps) {
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <AlertTriangle color={colors.danger} size={24} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <ActionButton accessibilityLabel={retryLabel} label={retryLabel} onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[20],
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    color: colors.textSoft,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing[4],
    width: '100%',
  },
});
