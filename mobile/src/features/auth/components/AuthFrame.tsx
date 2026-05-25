import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/ui/Screen';
import { colors, fonts, spacing, typography } from '../../../theme/tokens';

type AuthFrameProps = {
  children: ReactNode;
  eyebrow: string;
  footer?: ReactNode;
  subtitle: string;
  title: string;
};

export function AuthFrame({ children, eyebrow, footer, subtitle, title }: AuthFrameProps) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Text style={styles.markText}>D</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.wordmark}>DARE</Text>
            <Text style={styles.brandSub}>Challenge Everything</Text>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.body}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[24],
    padding: spacing[20],
    paddingBottom: spacing[32],
    paddingTop: spacing[32],
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  markText: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '900',
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  wordmark: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '900',
  },
  brandSub: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  header: {
    gap: spacing[8],
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
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  body: {
    gap: spacing[14],
  },
  footer: {
    gap: spacing[10],
  },
});
