import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppHeader, Screen } from "@/components/ui/patient-ui";
import {
  elevation,
  palette,
  radius,
  space,
  type as typography,
} from "@/constants/theme";
import { useAuth } from "@/features/auth/auth-context";
const actions = [
  {
    title: "Mis citas",
    detail: "Consulta y solicita tus citas",
    icon: "calendar-month-outline" as const,
    color: palette.primary,
    background: palette.primarySoft,
    href: "/(private)/(tabs)/appointments",
  },
  {
    title: "Historia clínica",
    detail: "Revisa tu información clínica",
    icon: "file-document-outline" as const,
    color: palette.navy,
    background: "#EDF2F7",
    href: "/(private)/(tabs)/history",
  },
  {
    title: "Mis recetas",
    detail: "Medicamentos e indicaciones",
    icon: "pill" as const,
    color: palette.primary,
    background: palette.primarySoft,
    href: "/(private)/(tabs)/prescriptions",
  },
  {
    title: "Mis archivos",
    detail: "Consulta y sube radiografías",
    icon: "file-image-outline" as const,
    color: palette.navy,
    background: "#EDF2F7",
    href: "/(private)/(tabs)/documents",
  },
  {
    title: "Servicios",
    detail: "Conoce el catálogo de la clínica",
    icon: "tooth-outline" as const,
    color: palette.teal,
    background: palette.tealSoft,
    href: "/(private)/(tabs)/services",
  },
];
export default function Home() {
  const { user } = useAuth();
  return (
    <Screen variant="tab">
      <AppHeader
        title={`Hola, ${user?.name ?? ""}`}
        subtitle="¿Qué deseas consultar hoy?"
      />
      <View style={styles.brand}>
        <MaterialCommunityIcons
          name="tooth-outline"
          size={26}
          color={palette.primary}
        />
        <View>
          <Text style={styles.brandTitle}>Portal del paciente</Text>
          <Text style={styles.brandDetail}>
            Tu información, en un solo lugar
          </Text>
        </View>
      </View>
      <Text style={styles.section}>Accesos rápidos</Text>
      {actions.map((action) => (
        <Pressable
          key={action.title}
          accessibilityRole="button"
          onPress={() => router.push(action.href as Href)}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <View style={[styles.icon, { backgroundColor: action.background }]}>
            <MaterialCommunityIcons
              name={action.icon}
              size={27}
              color={action.color}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{action.title}</Text>
            <Text style={styles.detail}>{action.detail}</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={palette.textSoft}
          />
        </Pressable>
      ))}
    </Screen>
  );
}
const styles = StyleSheet.create({
  brand: {
    backgroundColor: palette.navy,
    borderRadius: radius.lg,
    padding: space.md,
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
  },
  brandTitle: { color: palette.white, ...typography.section },
  brandDetail: { color: "#C9D8E7", ...typography.caption },
  section: { color: palette.navy, marginTop: space.xs, ...typography.section },
  action: {
    minHeight: 92,
    padding: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    ...elevation,
  },
  pressed: { opacity: 0.78 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 3 },
  title: { color: palette.navy, ...typography.section },
  detail: { color: palette.textMuted, ...typography.body },
});
