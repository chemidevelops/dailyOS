import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { Colors, FontWeight } from '@/constants/tokens'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.textPrimary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
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
      <Tabs.Screen name="index"   options={{ title: 'HOY',     tabBarIcon: ({ focused }) => <TabDot focused={focused} color={Colors.yellow} /> }} />
      <Tabs.Screen name="plan"    options={{ title: 'PLAN',    tabBarIcon: ({ focused }) => <TabDot focused={focused} color={Colors.indigo} /> }} />
      <Tabs.Screen name="activities" options={{ title: 'ACTIVIDADES', tabBarIcon: ({ focused }) => <TabDot focused={focused} color={Colors.mint} /> }} />
    </Tabs>
  )
}

function TabDot({ focused, color }: { focused: boolean; color: string }) {
  return (
    <View style={{
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: focused ? color : 'transparent',
      borderWidth: 1.5, borderColor: focused ? color : Colors.textTertiary,
    }} />
  )
}
