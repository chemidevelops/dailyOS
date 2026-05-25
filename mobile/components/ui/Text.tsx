import { Text as RNText, TextProps } from 'react-native'
import { FontSize, FontWeight } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'

type Variant =
  | 'displayLarge' | 'displayMedium' | 'title'
  | 'headline' | 'body' | 'bodyMedium'
  | 'caption' | 'captionMedium' | 'micro'

type Color = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'accent'

interface Props extends TextProps {
  variant?: Variant
  color?: Color
  customColor?: string
}

const variantStyles: Record<Variant, object> = {
  displayLarge:  { fontSize: FontSize.xxxl, fontWeight: FontWeight.black,   letterSpacing: -1.5 },
  displayMedium: { fontSize: FontSize.xxl,  fontWeight: FontWeight.black,   letterSpacing: -1 },
  title:         { fontSize: FontSize.xl,   fontWeight: FontWeight.bold,    letterSpacing: -0.5 },
  headline:      { fontSize: FontSize.lg,   fontWeight: FontWeight.bold,    letterSpacing: -0.2 },
  body:          { fontSize: FontSize.md,   fontWeight: FontWeight.regular },
  bodyMedium:    { fontSize: FontSize.md,   fontWeight: FontWeight.semibold },
  caption:       { fontSize: FontSize.sm,   fontWeight: FontWeight.regular },
  captionMedium: { fontSize: FontSize.sm,   fontWeight: FontWeight.semibold },
  micro:         { fontSize: FontSize.xs,   fontWeight: FontWeight.bold,    letterSpacing: 1 },
}

export function Text({ variant = 'body', color = 'primary', customColor, style, ...props }: Props) {
  const C = useColors()
  const colorMap: Record<Color, string> = {
    primary:   C.textPrimary,
    secondary: C.textSecondary,
    tertiary:  C.textTertiary,
    inverse:   C.textInverse,
    accent:    C.blue,
  }
  return (
    <RNText
      style={[variantStyles[variant], { color: customColor ?? colorMap[color] }, style]}
      {...props}
    />
  )
}
