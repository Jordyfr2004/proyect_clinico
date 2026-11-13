import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  LoadingState,
  Notice,
  Screen,
} from "@/components/ui/patient-ui";
import { palette, space, type as typography } from "@/constants/theme";
import { getPrescriptions } from "@/features/patient/prescriptions";
import { useRemote } from "@/hooks/use-remote";
export default function Prescriptions() {
  const loader = useCallback(() => getPrescriptions(), []);
  const { data, loading, error, reload } = useRemote(loader);
  return (
    <Screen variant="tab">
      <AppHeader
        title="Mis recetas"
        subtitle="Medicamentos e indicaciones de tus tratamientos."
        onBack={() => router.back()}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {loading ? (
        <LoadingState />
      ) : data?.length ? (
        <View style={styles.list}>
          {data.map((item) => (
            <Card key={item.id}>
              <View style={styles.top}>
                <View style={styles.icon}>
                  <MaterialCommunityIcons
                    name="pill"
                    size={22}
                    color={palette.primary}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>Receta del {item.date}</Text>
                  {item.diagnosis ? (
                    <Text style={styles.muted}>{item.diagnosis}</Text>
                  ) : null}
                </View>
              </View>
              {item.medications.map((medication, index) => (
                <View
                  key={`${item.id}-${index}`}
                  style={[styles.medication, index > 0 && styles.divider]}
                >
                  <Text style={styles.name}>{medication.name}</Text>
                  <Text style={styles.muted}>
                    {medication.dose} · {medication.frequency}
                    {medication.duration ? ` · ${medication.duration}` : ""}
                  </Text>
                  {medication.instructions ? (
                    <Text style={styles.muted}>{medication.instructions}</Text>
                  ) : null}
                </View>
              ))}
              {item.instructions ? (
                <Text style={styles.instructions}>
                  Indicaciones: {item.instructions}
                </Text>
              ) : null}
              {item.issuedBy ? (
                <Text style={styles.caption}>Emitida por {item.issuedBy}</Text>
              ) : null}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="pill"
          title="Aún no tienes recetas"
          detail="Las recetas que emita el consultorio aparecerán aquí."
        />
      )}
      <Button
        title="Actualizar recetas"
        icon="refresh"
        variant="ghost"
        onPress={() => void reload()}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { gap: space.md },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  title: { color: palette.navy, ...typography.label },
  name: { color: palette.navy, ...typography.label },
  muted: { color: palette.textMuted, ...typography.body },
  medication: { gap: 2, paddingVertical: space.xs },
  divider: { borderTopWidth: 1, borderTopColor: palette.border },
  instructions: { color: palette.navy, ...typography.body },
  caption: { color: palette.textMuted, ...typography.caption },
});
