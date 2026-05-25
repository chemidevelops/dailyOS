import { Pressable, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { Text } from './Text'
import { Spacing, Radius, Shadow } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props {
  label: string
  onPress: () => void
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  style?: ViewStyle
}

export function Button({ label, onPress, variant = 'primary', size = 'md', loading = false, disabled = false, icon, style }: Props) {
  const C = useColors()
  const variantStyle = {
    primary:   { backgroundColor: C.textPrimary, ...Shadow.brutalSm },
    secondary: { backgroundColor: C.yellow,      ...Shadow.brutalSm },
    ghost:     { backgroundColor: 'transparent' as const },
  }[variant]

  return (
    <Pressable
      onPress={() => { if (!disabled && !loading) onPress() }}
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        { borderColor: C.border },
        variantStyle,
        (disabled || loading) && styles.disabled,
        pressed && { transform: [{ translateX: 1 }, { translateY: 1 }] },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? C.textInverse : C.textPrimary} size="small" />
        : <>{icon}<Text variant={size === 'sm' ? 'captionMedium' : 'bodyMedium'} color={variant === 'primary' ? 'inverse' : 'primary'}>{label}</Text></>
      }
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  disabled: { opacity: 0.35 },
  size_sm: { paddingHorizontal: Spacing.md,  paddingVertical: Spacing.xs + 2, minHeight: 32 },
  size_md: { paddingHorizontal: Spacing.xl,  paddingVertical: Spacing.sm + 4, minHeight: 44 },
  size_lg: { paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md + 2, minHeight: 52 },
})
