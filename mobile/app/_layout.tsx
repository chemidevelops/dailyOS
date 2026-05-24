import { View } from 'react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="focus"  options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="add"    options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </View>
  )
}
