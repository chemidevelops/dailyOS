import { View, ViewProps, Pressable, PressableProps } from 'react-native'
import { Radius, Shadow, Spacing } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'

type Variant = 'default' | 'elevated' | 'flat' | 'highlighted' | 'yellow'
type Padding = 'none' | 'sm' | 'md' | 'lg'

const paddingMap = { none: 0, sm: Spacing.sm, md: Spacing.lg, lg: Spacing.xl }

interface CardProps extends ViewProps { variant?: Variant; padding?: Padding }
interface PressableCardProps extends PressableProps { variant?: Variant; padding?: Padding }

function useVariantStyle(variant: Variant) {
  const C = useColors()
  const map = {
    default:     { backgroundColor: C.surface,     borderWidth: 1.5, borderColor: C.border, ...Shadow.brutalSm },
    elevated:    { backgroundColor: C.surface,     borderWidth: 1.5, borderColor: C.border, ...Shadow.brutal },
    flat:        { backgroundColor: C.surface2,    borderWidth: 0 },
    highlighted: { backgroundColor: C.yellowLight, borderWidth: 1.5, borderColor: C.border, ...Shadow.brutalSm },
    yellow:      { backgroundColor: C.yellow,      borderWidth: 1.5, borderColor: C.border, ...Shadow.brutal },
  }
  return map[variant]
}

export function Card({ variant = 'default', padding = 'md', style, children, ...props }: CardProps) {
  const variantStyle = useVariantStyle(variant)
  return (
    <View style={[{ borderRadius: Radius.lg, padding: paddingMap[padding] }, variantStyle, style]} {...props}>
      {children}
    </View>
  )
}

export function PressableCard({ variant = 'default', padding = 'md', style, children, onPress, ...props }: PressableCardProps) {
  const variantStyle = useVariantStyle(variant)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { borderRadius: Radius.lg, padding: paddingMap[padding], opacity: pressed ? 0.95 : 1 },
        variantStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  )
}
