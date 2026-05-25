import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { FontWeight } from '@/constants/tokens'
import { useColors } from '@/hooks/useColors'

export default function TabLayout() {
  const C = useColors()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.textPrimary,
        tabBarInactiveTintColor: C.textTertiary,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.border,
          borderTopWidth: 1.5,
          height: 64,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'HOY',         tabBarIcon: ({ focused }) => <TabDot focused={focused} color={C.yellow} /> }} />
      <Tabs.Screen name="plan"       options={{ title: 'PLAN',        tabBarIcon: ({ focused }) => <TabDot focused={focused} color={C.indigo} /> }} />
      <Tabs.Screen name="activities" options={{ title: 'ACTIVIDADES', tabBarIcon: ({ focused }) => <TabDot focused={focused} color={C.mint} /> }} />
      <Tabs.Screen name="stats"      options={{ title: 'STATS',       tabBarIcon: ({ focused }) => <TabDot focused={focused} color={C.yellow} /> }} />
      <Tabs.Screen name="settings"   options={{ title: 'AJUSTES',     tabBarIcon: ({ focused }) => <TabDot focused={focused} color={C.indigo} /> }} />
    </Tabs>
  )
}

function TabDot({ focused, color }: { focused: boolean; color: string }) {
  const C = useColors()
  return (
    <View style={{
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: focused ? color : 'transparent',
      borderWidth: 1.5, borderColor: focused ? color : C.textTertiary,
    }} />
  )
}
