import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { api } from '@/constants/api'

export default function RootLayout() {
  const router   = useRouter()
  const segments = useSegments()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    api.settings.get().then(s => {
      setChecked(true)
      if (!s.onboarding_done) {
        router.replace('/onboarding')
      }
    }).catch(() => {
      // Can't reach server — let them in anyway
      setChecked(true)
    })
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor="#F5F0E8" />
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="focus"  options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="add"    options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </View>
  )
}
