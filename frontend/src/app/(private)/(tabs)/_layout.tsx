import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette } from "@/constants/theme";
type IconProps = { color: ColorValue; size: number };
function HomeIcon({ color, size }: IconProps) {
  return (
    <MaterialCommunityIcons
      name="home-variant-outline"
      size={size}
      color={color}
    />
  );
}
function EventIcon({ color, size }: IconProps) {
  return (
    <MaterialCommunityIcons
      name="calendar-month-outline"
      size={size}
      color={color}
    />
  );
}
function ServicesIcon({ color, size }: IconProps) {
  return (
    <MaterialCommunityIcons name="tooth-outline" size={size} color={color} />
  );
}
function ProfileIcon({ color, size }: IconProps) {
  return (
    <MaterialCommunityIcons name="account-outline" size={size} color={color} />
  );
}
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 2,
          borderTopColor: palette.border,
          backgroundColor: palette.surface,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Inicio", tabBarIcon: HomeIcon }}
      />
      <Tabs.Screen
        name="appointments"
        options={{ title: "Citas", tabBarIcon: EventIcon }}
      />
      <Tabs.Screen
        name="services"
        options={{ title: "Servicios", tabBarIcon: ServicesIcon }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Perfil", tabBarIcon: ProfileIcon }}
      />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="prescriptions" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
    </Tabs>
  );
}
