import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111111',
        tabBarInactiveTintColor: '#a8a29e',
        tabBarLabelStyle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="catalogo" options={{ title: 'Catálogo' }} />
      <Tabs.Screen name="portal" options={{ title: 'Portal' }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais' }} />
    </Tabs>
  )
}
