import { useTheme } from '@/contexts/ThemeContext'
import { DarkColors, LightColors } from '@/constants/tokens'

export function useColors() {
  const { isDark } = useTheme()
  return isDark ? DarkColors : LightColors
}
