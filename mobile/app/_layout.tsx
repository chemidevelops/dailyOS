import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { api } from '@/constants/api'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'

function AppShell() {
  const router    = useRouter()
  const { isDark } = useTheme()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    api.settings.get().then(s => {
      setChecked(true)
      if (!s.onboarding_done) {
        router.replace('/onboarding')
      }
    }).catch(() => {
      setChecked(true)
    })
  }, [])

  const bg = isDark ? '#0F0E0B' : '#F5F0E8'

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={bg} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="focus"  options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="add"    options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppShell />
      </SafeAreaProvider>
    </ThemeProvider>
  )
}
