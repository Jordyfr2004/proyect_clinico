import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  Button,
  EmptyState,
  LoadingState,
  Notice,
  Screen,
} from "@/components/ui/patient-ui";
import { elevation, palette, space, type as typography } from "@/constants/theme";
import { getCategories, getServices, type ClinicService } from "@/features/patient/catalog";
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
const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();

export default function Services() {
  const loadCategories = useCallback(() => getCategories(), []);
  const loadServices = useCallback(() => getServices(), []);
  const categories = useRemote(loadCategories);
  const services = useRemote(loadServices);
  const [selected, setSelected] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<ClinicService | null>(null);
  const selectedCategory = categories.data?.find((item) => item.id === selected);
  const chooseCategory = (id: string | null) => {
    setSelected(id);
    setCategoriesOpen(false);
  };
  const visible = useMemo(
    () =>
      (services.data ?? []).filter(
        (item) => (!selected || item.categoryId === selected) &&
          searchable(`${item.name} ${item.description ?? ""} ${item.category.name}`).includes(searchable(query)),
      ),
    [services.data, selected, query],
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
    <Screen variant="tab" contentStyle={styles.content}
      onRefresh={() => { void Promise.all([categories.reload(), services.reload()]); }}
      refreshing={!initialLoading && (categories.loading || services.loading)}>
      <View style={styles.header}>
        <View style={styles.copy}><Text style={styles.heading}>Servicios</Text><Text style={styles.subtitle}>Conoce el catálogo de la clínica</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filtrar por categoría" accessibilityState={{ expanded: categoriesOpen }} onPress={() => setCategoriesOpen((open) => !open)} style={styles.headerFilter}>
          <MaterialCommunityIcons name="tune-variant" size={25} color={palette.primary} />
        </Pressable>
      </View>
      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={28} color={palette.textMuted} />
        <TextInput accessibilityLabel="Buscar servicio" placeholder="Buscar servicio" placeholderTextColor={palette.textMuted} value={query} onChangeText={setQuery} style={styles.searchInput} autoCorrect={false} returnKeyType="search" />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setQuery("")} style={styles.clear}><MaterialCommunityIcons name="close" size={21} color={palette.textMuted} /></Pressable> : null}
      </View>
      {initialLoading ? (
        <LoadingState />
      ) : (
        <>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <View style={styles.filterBlock}>
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
                    accessibilityLabel={`Filtrar por ${item.name}`}
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
              {visible.map((item, index) => (
                <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Ver servicio: ${item.name}`} onPress={() => setDetail(item)} style={({ pressed }) => [styles.serviceCard, pressed && styles.filterPressed]}>
                  <View style={styles.top}>
                  {safeImageUrl(item.image) ? (
                    <Image
                      source={{ uri: safeImageUrl(item.image)! }}
                      style={styles.serviceImage}
                      contentFit="cover"
                      accessibilityLabel={`Imagen de ${item.name}`}
                    />
                  ) : null}
                    {!safeImageUrl(item.image) ? <View style={[styles.icon, index % 3 === 2 && styles.tealIcon]}>
                      <MaterialCommunityIcons
                        name="tooth-outline"
                        size={28}
                        color={index % 3 === 2 ? palette.teal : palette.primary}
                      />
                    </View> : null}
                    <View style={styles.copy}>
                      <Text style={styles.category}>{item.category.name}</Text>
                      <Text style={styles.name}>{item.name}</Text>
                      {item.description ? <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text> : null}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={27} color={palette.textMuted} />
                  </View>
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
                </Pressable>
              ))}
            </View>
          ) : error ? null : (
            <EmptyState
              icon="tooth-outline"
              title={query.trim() ? "Sin resultados" : "Sin servicios disponibles"}
              detail={query.trim() ? "Prueba otro nombre o cambia la categoría." : "No hay servicios activos en esta categoría."}
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
      <Modal visible={detail !== null} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.backdrop}><View style={styles.modal} accessibilityViewIsModal><ScrollView contentContainerStyle={styles.modalContent}>
          {detail ? <>
            <Text style={styles.category}>{detail.category.name}</Text>
            <Text style={styles.heading}>{detail.name}</Text>
            {safeImageUrl(detail.image) ? <Image source={{ uri: safeImageUrl(detail.image)! }} contentFit="cover" style={styles.detailImage} accessibilityLabel={`Imagen de ${detail.name}`} /> : null}
            <Text style={styles.description}>{detail.description || "Sin descripción registrada."}</Text>
            {detail.durationMinutes !== null ? <Text style={styles.metaText}>Duración: {detail.durationMinutes} min</Text> : null}
            <Text style={styles.price}>{detail.price ? `$${detail.price}` : "Consultar precio"}</Text>
          </> : null}
          <Button title="Cerrar" variant="secondary" onPress={() => setDetail(null)} />
        </ScrollView></View></View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { maxWidth: 780, width: "100%", alignSelf: "center", gap: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  heading: { color: palette.navy, fontSize: 30, lineHeight: 38, fontWeight: "800" },
  subtitle: { color: palette.textMuted, fontSize: 16, lineHeight: 24, marginTop: 4 },
  headerFilter: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.primarySoft, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 62, paddingHorizontal: 18, backgroundColor: palette.surface, borderRadius: 22, borderWidth: 1, borderColor: palette.border, ...elevation },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 16, fontSize: 17, color: palette.navy },
  clear: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  serviceCard: { padding: 12, borderRadius: 18, borderWidth: 1, borderColor: "#E1E8F0", backgroundColor: palette.surface, ...elevation },
  tealIcon: { backgroundColor: palette.tealSoft },
  backdrop: { flex: 1, backgroundColor: palette.scrim, justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { backgroundColor: palette.surface, borderRadius: 24, width: "100%", maxWidth: 540, maxHeight: "85%", overflow: "hidden" },
  modalContent: { padding: 24, gap: 16 },
  detailImage: { width: "100%", height: 200, borderRadius: 16 },
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
  list: { gap: 10 },
  serviceImage: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.primarySoft },
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
  name: { color: palette.navy, fontSize: 17, lineHeight: 22, fontWeight: "700" },
  cardDescription: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
  category: { color: palette.primary, ...typography.caption, textTransform: "uppercase", letterSpacing: 0.7 },
  description: { color: palette.textMuted, ...typography.body },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: space.xs },
  metaText: { color: palette.textMuted, ...typography.body },
  price: { color: palette.navy, fontSize: 15, lineHeight: 22, fontWeight: "700" },
  pricePending: { color: palette.textMuted, ...typography.label },
});
