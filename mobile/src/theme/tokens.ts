export const colors = {
  black: '#08080F',
  background: '#050509',
  surface: '#0E0E1A',
  surfaceElevated: '#141425',
  surfaceRaised: '#1C1C33',
  float: '#242440',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)',
  borderFocus: 'rgba(255,255,255,0.16)',
  primary: '#FF5500',
  primaryPressed: '#FF7733',
  primaryDim: 'rgba(255,85,0,0.10)',
  primaryGlow: 'rgba(255,85,0,0.20)',
  danger: '#FF3366',
  dangerDim: 'rgba(255,51,102,0.10)',
  warning: '#FFB020',
  warningDim: 'rgba(255,176,32,0.10)',
  success: '#00E896',
  successDim: 'rgba(0,232,150,0.10)',
  info: '#4DA6FF',
  infoDim: 'rgba(77,166,255,0.10)',
  purple: '#9B5DE5',
  purpleDim: 'rgba(155,93,229,0.10)',
  text: '#FFFFFF',
  textSoft: '#F0F0FA',
  textMuted: '#8888AA',
  textGhost: '#4A4A6A',
  moneyPositive: '#00E896',
  moneyNegative: '#FF3366',
  escrowLocked: '#FFB020',
  pending: '#FFB020',
} as const;

export const fonts = {
  display: 'Syne_800ExtraBold',
  displaySemi: 'Syne_700Bold',
  body: 'DMSans_500Medium',
  bodyRegular: 'DMSans_400Regular',
  mono: 'JetBrainsMono_600SemiBold',
} as const;

export const spacing = {
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
} as const;

export const radius = {
  control: 10,
  card: 16,
  pill: 999,
} as const;

export const typography = {
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  numeric: {
    fontSize: 20,
    lineHeight: 26,
  },
} as const;
