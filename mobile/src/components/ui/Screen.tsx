import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../../theme/tokens';

type ScreenProps = PropsWithChildren<{
  padded?: boolean;
  contentContainerStyle?: ViewStyle;
}>;

export function Screen({ children, padded = false, contentContainerStyle }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {padded ? (
        <ScrollView contentContainerStyle={[styles.paddedContent, contentContainerStyle]}>
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  paddedContent: {
    gap: spacing[20],
    padding: spacing[20],
    paddingBottom: spacing[32],
  },
});
