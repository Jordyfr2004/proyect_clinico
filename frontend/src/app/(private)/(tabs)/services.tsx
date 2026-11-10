import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AppHeader,
  Card,
  CategoryChip,
  EmptyState,
  LoadingState,
  Notice,
  Screen,
} from "@/components/ui/patient-ui";
import { palette, space, type as typography } from "@/constants/theme";
import { getCategories, getServices } from "@/features/patient/catalog";
import { useRemote } from "@/hooks/use-remote";
export default function Services() {
  const loadCategories = useCallback(() => getCategories(), []);
  const loadServices = useCallback(() => getServices(), []);
  const categories = useRemote(loadCategories);
  const services = useRemote(loadServices);
  const [selected, setSelected] = useState<string | null>(null);
  const visible = useMemo(
    () =>
      (services.data ?? []).filter(
        (item) => !selected || item.categoryId === selected,
      ),
    [services.data, selected],
  );
  const error = categories.error || services.error;
  return (
    <Screen variant="tab">
      <AppHeader
        title="Servicios"
        subtitle="Catálogo activo publicado por la clínica."
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <CategoryChip
          title="Todos"
          selected={!selected}
          onPress={() => setSelected(null)}
        />
        {categories.data?.map((item) => (
          <CategoryChip
            key={item.id}
            title={item.name}
            selected={selected === item.id}
            onPress={() => setSelected(item.id)}
          />
        ))}
      </ScrollView>
      {services.loading || categories.loading ? (
        <LoadingState />
      ) : visible.length ? (
        <View style={styles.list}>
          {visible.map((item) => (
            <Card key={item.id}>
              <View style={styles.top}>
                <View style={styles.icon}>
                  <MaterialCommunityIcons
                    name="tooth-outline"
                    size={26}
                    color={palette.primary}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.category}>{item.category.name}</Text>
                </View>
              </View>
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}
              <View style={styles.footer}>
                <View style={styles.meta}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={18}
                    color={palette.textMuted}
                  />
                  <Text style={styles.metaText}>
                    {item.durationMinutes !== null
                      ? `${item.durationMinutes} min`
                      : "Duración por confirmar"}
                  </Text>
                </View>
                <Text style={styles.price}>
                  {item.price !== null ? `$${item.price}` : "Consultar"}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="tooth-outline"
          title="Sin servicios disponibles"
          detail="No hay servicios activos en esta categoría."
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  chips: { gap: space.xs, paddingRight: space.lg },
  list: { gap: space.md },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  name: { color: palette.navy, ...typography.section },
  category: { color: palette.textMuted, ...typography.caption },
  description: { color: palette.textMuted, ...typography.body },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: space.xs },
  metaText: { color: palette.textMuted, ...typography.body },
  price: { color: palette.navy, ...typography.section },
});
