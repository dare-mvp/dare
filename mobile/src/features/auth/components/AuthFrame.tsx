import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DareLogo } from '../../../components/brand/DareLogo';
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoider}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <DareLogo size="md" />
            <View style={styles.brandCopy}>
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
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing[24],
    padding: spacing[20],
    paddingBottom: spacing[32] * 2,
    paddingTop: spacing[32],
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[10],
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
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
