import { View, ViewProps, Pressable, PressableProps } from 'react-native'
import { Colors, Radius, Shadow, Spacing } from '@/constants/tokens'

type Variant = 'default' | 'elevated' | 'flat' | 'highlighted' | 'yellow'
type Padding = 'none' | 'sm' | 'md' | 'lg'

const paddingMap = { none: 0, sm: Spacing.sm, md: Spacing.lg, lg: Spacing.xl }

const variantStyleMap = {
  default:     { backgroundColor: Colors.surface,     borderWidth: 1.5, borderColor: Colors.border, ...Shadow.brutalSm },
  elevated:    { backgroundColor: Colors.surface,     borderWidth: 1.5, borderColor: Colors.border, ...Shadow.brutal },
  flat:        { backgroundColor: Colors.surface2,    borderWidth: 0 },
  highlighted: { backgroundColor: Colors.yellowLight, borderWidth: 1.5, borderColor: Colors.border, ...Shadow.brutalSm },
  yellow:      { backgroundColor: Colors.yellow,      borderWidth: 1.5, borderColor: Colors.border, ...Shadow.brutal },
}

interface CardProps extends ViewProps { variant?: Variant; padding?: Padding }
interface PressableCardProps extends PressableProps { variant?: Variant; padding?: Padding }

export function Card({ variant = 'default', padding = 'md', style, children, ...props }: CardProps) {
  return (
    <View style={[{ borderRadius: Radius.lg, padding: paddingMap[padding] }, variantStyleMap[variant], style]} {...props}>
      {children}
    </View>
  )
}

export function PressableCard({ variant = 'default', padding = 'md', style, children, onPress, ...props }: PressableCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { borderRadius: Radius.lg, padding: paddingMap[padding], opacity: pressed ? 0.95 : 1 },
        variantStyleMap[variant],
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  )
}
