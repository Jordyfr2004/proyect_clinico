import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { useWindowDimensions, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette } from "@/constants/theme";
type IconProps = { color: ColorValue; size: number };
const iconColor = (color: ColorValue) => color === null || typeof color === 'number' ? palette.textMuted : color;
function HomeIcon({ color, size }: IconProps) {
  return (
    <MaterialCommunityIcons
      name="home-variant-outline"
      size={size}
      color={iconColor(color)}
    />
  );
}
function EventIcon({ color, size }: IconProps) {
  return (
    <MaterialCommunityIcons
      name="calendar-month-outline"
      size={size}
      color={iconColor(color)}
    />
  );
}
function ServicesIcon({ color, size }: IconProps) {
  return (
    <MaterialCommunityIcons name="tooth-outline" size={size} color={iconColor(color)} />
  );
}
function ProfileIcon({ color, size }: IconProps) {
  return (
    <MaterialCommunityIcons name="account-outline" size={size} color={iconColor(color)} />
  );
}
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, flexShrink: 0, fontWeight: "600" },
        tabBarItemStyle: { paddingTop: 4, paddingBottom: 4 },
        tabBarStyle: {
          height: 68 + Math.max(0, fontScale - 1) * 20 + insets.bottom,
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
      {/* SDK 58 treats href:null as a redirect. Hide only the tab buttons. */}
      <Tabs.Screen name="history" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="documents" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
  );
}
