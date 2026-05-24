export const Colors = {
  bg:             '#F5F0E8',
  surface:        '#FFFFFF',
  surface2:       '#EDE8DE',

  yellow:         '#FFD600',
  yellowLight:    '#FFF8CC',
  coral:          '#FF4D30',
  coralLight:     '#FFE5DF',
  mint:           '#00C896',
  mintLight:      '#CCFAED',
  indigo:         '#3D5AFE',
  indigoLight:    '#E3E8FF',
  purple:         '#8B2FC9',
  purpleLight:    '#EFE0FF',
  orange:         '#FF7700',
  orangeLight:    '#FFE8CC',
  green:          '#00C896',

  textPrimary:    '#0A0A0A',
  textSecondary:  '#5A5A5A',
  textTertiary:   '#9A9A9A',
  textInverse:    '#FFFFFF',

  border:         '#0A0A0A',
  borderLight:    '#D8D0C4',

  // legacy compat
  blue:           '#3D5AFE',
  blueLight:      '#E3E8FF',
  warm:           '#FF7700',
  warmLight:      '#FFE8CC',
  red:            '#FF4D30',
  redLight:       '#FFE5DF',
  surfaceElevated: '#EDE8DE',
} as const

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  xxxl: 44,
} as const

export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 999,
} as const

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   22,
  xxl:  30,
  xxxl: 42,
} as const

export const FontWeight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
  black:    '900' as const,
}

export const Shadow = {
  brutal: {
    shadowColor:   '#0A0A0A',
    shadowOffset:  { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius:  0,
    elevation:     4,
  },
  brutalSm: {
    shadowColor:   '#0A0A0A',
    shadowOffset:  { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  0,
    elevation:     2,
  },
  md: {
    shadowColor:   '#0A0A0A',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     3,
  },
  sm: {
    shadowColor:   '#0A0A0A',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius:  4,
    elevation:     1,
  },
} as const
