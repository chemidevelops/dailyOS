import { View, StyleSheet } from 'react-native'
import { Colors, Spacing } from '@/constants/tokens'

export function Divider({ style }: { style?: object }) {
  return <View style={[styles.divider, style]} />
}

export function Spacer({ size = 'md' }: { size?: keyof typeof Spacing }) {
  return <View style={{ height: Spacing[size] }} />
}

export function HStack({ children, gap = 'md', align = 'center', style }: {
  children: React.ReactNode
  gap?: keyof typeof Spacing
  align?: 'center' | 'flex-start' | 'flex-end' | 'stretch'
  style?: object
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: align, gap: Spacing[gap] }, style]}>
      {children}
    </View>
  )
}

export function VStack({ children, gap = 'md', style }: {
  children: React.ReactNode
  gap?: keyof typeof Spacing
  style?: object
}) {
  return (
    <View style={[{ flexDirection: 'column', gap: Spacing[gap] }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
})
