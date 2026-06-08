import { StyleSheet } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '../../theme/tokens';

export const kycSubmitStyles = StyleSheet.create({
  captureActions: {
    gap: spacing[8],
  },
  captureCopy: {
    flex: 1,
    minWidth: 0,
  },
  captureHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
  },
  capturePanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[14],
  },
  captureText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  captureTitle: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '900',
  },
  fileCopy: {
    flex: 1,
    minWidth: 0,
  },
  fileMeta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: spacing[4],
    textTransform: 'uppercase',
  },
  fileName: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
  },
  fileRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: spacing[10],
    padding: spacing[10],
  },
  form: {
    gap: spacing[12],
  },
});
