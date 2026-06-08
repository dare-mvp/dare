import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { useMe } from '../../me/useMe';

export const createScreenStyles = StyleSheet.create({
  content: {
    gap: spacing[20],
    padding: spacing[20],
    paddingBottom: spacing[32],
  },
  section: {
    gap: spacing[12],
  },
  sectionTitleWrap: {
    gap: spacing[4],
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[6],
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  pressCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[6],
    padding: spacing[14],
  },
  pressCardSelected: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  pressCardTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  pressCardIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  pressCardCopy: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  pressCardBody: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  rulesInput: {
    minHeight: 110,
  },
});

export function getCreateGate(data: ReturnType<typeof useMe>['data']) {
  if (data.profile.kycStatus === 'pending') {
    return {
      label: 'KYC status',
      message: 'KYC review must finish before you can create money-backed DAREs.',
      route: '/kyc-status' as const,
      title: 'KYC review pending',
    };
  }

  if (data.profile.kycStatus === 'not_started') {
    return {
      label: 'Verify account',
      message: 'Complete KYC before creating money-backed DAREs.',
      route: '/kyc-intro' as const,
      title: 'Verification required',
    };
  }

  return {
    label: 'Review account',
    message: 'Your account, wallet, or limits are not currently eligible to create DAREs.',
    route: '/(tabs)/profile' as const,
    title: 'Create unavailable',
  };
}

export function CreateSectionTitle({ eyebrow, icon, title }: { eyebrow: string; icon: ReactNode; title: string }) {
  return (
    <View style={createScreenStyles.sectionTitleWrap}>
      <View style={createScreenStyles.eyebrowRow}>
        {icon}
        <Text style={createScreenStyles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={createScreenStyles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function CreatePressCard({
  body,
  icon,
  label,
  onPress,
  selected,
}: {
  body?: string;
  icon: ReactNode;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[createScreenStyles.pressCard, selected && createScreenStyles.pressCardSelected]}
    >
      <View style={createScreenStyles.pressCardIcon}>{icon}</View>
      <View style={createScreenStyles.pressCardCopy}>
        <Text style={createScreenStyles.pressCardTitle}>{label}</Text>
        {body ? <Text style={createScreenStyles.pressCardBody}>{body}</Text> : null}
      </View>
    </Pressable>
  );
}
