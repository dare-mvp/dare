import { ChevronLeft } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/ui/Screen';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';

type ProfileFlowFrameProps = {
  children: ReactNode;
  eyebrow: string;
  onBack: () => void;
  subtitle: string;
  title: string;
};

export function ProfileFlowFrame({ children, eyebrow, onBack, subtitle, title }: ProfileFlowFrameProps) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <ChevronLeft color={colors.textMuted} size={22} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text numberOfLines={2} style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        {children}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[16],
    padding: spacing[20],
    paddingBottom: spacing[32],
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[12],
  },
  backButton: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: {
    flex: 1,
    gap: spacing[6],
    minWidth: 0,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: typography.title.fontSize,
    fontWeight: '900',
    lineHeight: typography.title.lineHeight,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
});
