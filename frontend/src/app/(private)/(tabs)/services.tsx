import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { getCategories, getServices } from "@/features/patient/catalog";
import { useRemote } from "@/hooks/use-remote";

const safeImageUrl = (value: string | null): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};

export default function Services() {
  const loadCategories = useCallback(() => getCategories(), []);
  const loadServices = useCallback(() => getServices(), []);
  const categories = useRemote(loadCategories);
  const services = useRemote(loadServices);
  const [selected, setSelected] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const selectedCategory = categories.data?.find((item) => item.id === selected);
  const chooseCategory = (id: string | null) => {
    setSelected(id);
    setCategoriesOpen(false);
  };
  const visible = useMemo(
    () =>
      (services.data ?? []).filter(
        (item) => !selected || item.categoryId === selected,
      ),
    [services.data, selected],
  );
  const error = categories.error || services.error;
  const initialLoading =
    (categories.loading && categories.data === null) ||
    (services.loading && services.data === null);
  const retry = async () => {
    const requests = [];
    if (categories.error) requests.push(categories.reload());
    if (services.error) requests.push(services.reload());
    await Promise.all(requests);
  };
  return (
    <Screen variant="tab">
      <AppHeader
        title="Servicios"
        subtitle="Catálogo activo publicado por la clínica."
      />
      {initialLoading ? (
        <LoadingState />
      ) : (
        <>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <View style={styles.filterBlock}>
            <Text style={styles.filterHeading}>EXPLORAR SERVICIOS</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Elegir categoría, ${selectedCategory?.name ?? "Todos los servicios"}`}
              accessibilityState={{ expanded: categoriesOpen }}
              onPress={() => setCategoriesOpen((open) => !open)}
              style={({ pressed }) => [styles.filterTrigger, pressed && styles.filterPressed]}
            >
              <View style={styles.filterIcon}>
                <MaterialCommunityIcons name="shape-outline" size={22} color={palette.primary} />
              </View>
              <View style={styles.filterCopy}>
                <Text style={styles.filterLabel}>Categoría</Text>
                <Text style={styles.filterValue} numberOfLines={2}>{selectedCategory?.name ?? "Todos los servicios"}</Text>
              </View>
              <MaterialCommunityIcons
                name={categoriesOpen ? "chevron-up" : "chevron-down"}
                size={25}
                color={palette.navy}
              />
            </Pressable>
            {categoriesOpen ? (
              <View style={styles.filterOptions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: selected === null }}
                  onPress={() => chooseCategory(null)}
                  style={[styles.filterOption, selected === null && styles.filterOptionSelected]}
                >
                  <Text style={[styles.optionText, selected === null && styles.optionTextSelected]}>Todos los servicios</Text>
                  {selected === null ? <MaterialCommunityIcons name="check" size={19} color={palette.primary} /> : null}
                </Pressable>
                {categories.data?.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selected === item.id }}
                    onPress={() => chooseCategory(item.id)}
                    style={[styles.filterOption, selected === item.id && styles.filterOptionSelected]}
                  >
                    <Text style={[styles.optionText, selected === item.id && styles.optionTextSelected]}>{item.name}</Text>
                    {selected === item.id ? <MaterialCommunityIcons name="check" size={19} color={palette.primary} /> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          {visible.length ? (
            <View style={styles.list}>
              {visible.map((item) => (
                <Card key={item.id}>
                  {safeImageUrl(item.image) ? (
                    <Image
                      source={{ uri: safeImageUrl(item.image)! }}
                      style={styles.serviceImage}
                      contentFit="cover"
                      accessibilityLabel={`Imagen de ${item.name}`}
                    />
                  ) : null}
                  <View style={styles.top}>
                    {!safeImageUrl(item.image) ? <View style={styles.icon}>
                      <MaterialCommunityIcons
                        name="tooth-outline"
                        size={26}
                        color={palette.primary}
                      />
                    </View> : null}
                    <View style={styles.copy}>
                      <Text style={styles.category}>{item.category.name}</Text>
                      <Text style={styles.name}>{item.name}</Text>
                    </View>
                  </View>
                  {item.description ? (
                    <Text style={styles.description}>{item.description}</Text>
                  ) : null}
                  <View style={styles.footer}>
                    {item.durationMinutes !== null ? <View style={styles.meta}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={18}
                        color={palette.textMuted}
                      />
                      <Text style={styles.metaText}>
                        {item.durationMinutes} min
                      </Text>
                    </View> : <View />}
                    <Text style={[styles.price, !item.price && styles.pricePending]}>{item.price ? `$${item.price}` : "Consultar precio"}</Text>
                  </View>
                </Card>
              ))}
            </View>
          ) : error ? null : (
            <EmptyState
              icon="tooth-outline"
              title="Sin servicios disponibles"
              detail="No hay servicios activos en esta categoría."
            />
          )}
          {error ? (
            <Button
              title="Reintentar"
              icon="refresh"
              variant="ghost"
              onPress={() => void retry()}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  filterBlock: { gap: space.xs },
  filterHeading: { color: palette.textMuted, ...typography.caption, letterSpacing: 1.2, marginLeft: space.xxs },
  filterTrigger: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  filterPressed: { backgroundColor: palette.surfaceMuted },
  filterIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primarySoft,
  },
  filterCopy: { flex: 1, gap: 2 },
  filterLabel: { color: palette.textMuted, ...typography.caption },
  filterValue: { color: palette.navy, ...typography.control },
  filterOptions: {
    padding: space.xs,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  filterOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: 12,
  },
  filterOptionSelected: { backgroundColor: palette.primarySoft },
  optionText: { flex: 1, color: palette.navySoft, ...typography.body },
  optionTextSelected: { color: palette.primary, fontWeight: "700" },
  list: { gap: space.md },
  serviceImage: { width: "100%", height: 154, borderRadius: 14, marginBottom: space.md, backgroundColor: palette.primarySoft },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: space.xxs },
  name: { color: palette.navy, fontSize: 20, lineHeight: 26, fontWeight: "800" },
  category: { color: palette.primary, ...typography.caption, textTransform: "uppercase", letterSpacing: 0.7 },
  description: { color: palette.textMuted, ...typography.body, marginTop: space.sm },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: space.sm,
    marginTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: space.xs },
  metaText: { color: palette.textMuted, ...typography.body },
  price: { color: palette.navy, fontSize: 19, lineHeight: 25, fontWeight: "800" },
  pricePending: { color: palette.textMuted, ...typography.label },
});
