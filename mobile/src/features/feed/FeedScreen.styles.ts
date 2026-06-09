import { StyleSheet } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

export const styles = StyleSheet.create({
  content: {
    gap: spacing[12],
    padding: spacing[16],
    paddingBottom: spacing[32],
  },
  header: {
    gap: spacing[14],
  },
  refreshRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lastUpdated: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 0,
  },
  filters: {
    gap: spacing[8],
    paddingRight: spacing[16],
  },
  cta: {
    alignItems: 'center',
    backgroundColor: colors.primaryDim,
    borderColor: colors.primaryGlow,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[14],
  },
  ctaIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.control,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  ctaIconText: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '900',
  },
  ctaCopy: {
    flex: 1,
    minWidth: 0,
  },
  ctaTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  ctaText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    marginTop: 2,
  },
});
