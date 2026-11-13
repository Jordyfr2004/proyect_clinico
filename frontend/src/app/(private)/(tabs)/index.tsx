import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Button, LoadingState, Notice, Screen, StatusBadge } from "@/components/ui/patient-ui";
import { elevation, palette } from "@/constants/theme";
import { useAuth } from "@/features/auth/auth-context";
import { getAppointments, type Appointment } from "@/features/patient/appointments";
import { formatScheduledAppointment } from "@/features/patient/appointment-display";
import { appointmentStart } from "@/features/patient/reminder-plan";
import { useRemote } from "@/hooks/use-remote";

const actions = [
  { title: "Agendar cita", detail: "Solicita tu próxima cita", icon: "calendar-plus", route: "appointments" },
  { title: "Historial", detail: "Consulta tu información clínica", icon: "file-document-plus-outline", route: "history" },
  { title: "Especialidades", detail: "Conoce nuestros servicios", icon: "tooth-outline", route: "services" },
  { title: "Mi perfil", detail: "Revisa tus datos personales", icon: "account-outline", route: "profile" },
] as const;
const visit = (route: string) => router.push(`/(private)/(tabs)/${route}` as Href);
const typeLabel = (item: Appointment) => item.type === "cita_medica" ? "Cita médica" : item.type.replaceAll("_", " ");
const scheduleLabel = (item: Appointment) => formatScheduledAppointment(item.date?.slice(0, 10) ?? null, item.startTime) ?? "Horario por confirmar";

export default function Home() {
  const { user } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const loader = useCallback(() => getAppointments(), []);
  const { data, loading, error, reload } = useRemote(loader);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showReminders, setShowReminders] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) firstFocus.current = false;
    else void reload();
  }, [reload]));
  const upcoming = (data ?? []).filter((item) => item.status.toLowerCase() === "programada" && (appointmentStart(item)?.getTime() ?? 0) > now)
    .sort((a, b) => appointmentStart(a)!.getTime() - appointmentStart(b)!.getTime());
  const next = upcoming[0];
  const pending = data?.some((item) => item.status.toLowerCase() === "pendiente");
  const available = data !== null && !error;
  const reminder = (item: Appointment) => (
    <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Ver cita: ${scheduleLabel(item)}`} onPress={() => { setShowReminders(false); setSelected(item); }} style={styles.reminder}>
      <View style={styles.icon}><MaterialCommunityIcons name="calendar-check-outline" size={27} color={palette.primary} /></View>
      <View style={styles.flex}><Text style={styles.cardTitle}>{typeLabel(item)}</Text><Text style={styles.detail}>{scheduleLabel(item)}</Text></View>
      <MaterialCommunityIcons name="chevron-right" size={23} color={palette.primary} />
    </Pressable>
  );
  return (
    <Screen variant="tab" contentStyle={styles.content} onRefresh={() => void reload()} refreshing={loading && data !== null}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="tooth-outline" size={36} color="#29A5D7" />
        <Text style={styles.brand}>Portal del paciente</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver recordatorios de citas" onPress={() => setShowReminders(true)} style={styles.headerButton}><MaterialCommunityIcons name="bell-outline" size={26} color={palette.textMuted} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver mi perfil" onPress={() => visit("profile")} style={[styles.headerButton, styles.avatar]}><MaterialCommunityIcons name="account-outline" size={28} color={palette.navy} /></Pressable>
      </View>
      <View style={styles.greeting}><Text style={styles.greetingTitle}>{user?.name ? `Hola, ${user.name}` : "Hola"}</Text><Text style={styles.subtitle}>Bienvenido a tu portal del paciente</Text></View>
      <View style={styles.hero}>
        <View pointerEvents="none" accessible={false} style={styles.heroDecoration}><MaterialCommunityIcons name="tooth-outline" size={140} color="#D0E7F9" /></View>
        <View style={styles.pill}><MaterialCommunityIcons name="calendar-month-outline" size={20} color={palette.primary} /><Text style={styles.pillText}>Tu próxima cita</Text></View>
        {loading && data === null ? <LoadingState label="Consultando tus citas…" /> : error ? <><Notice tone="error">{error}</Notice><Button title="Reintentar" onPress={() => void reload()} loading={loading} /></> : next ? <>
          <Text style={styles.heroTitle}>{typeLabel(next)}</Text>
          <View style={styles.meta}><MaterialCommunityIcons name="calendar-clock-outline" size={21} color={palette.textMuted} /><Text style={styles.metaText}>{scheduleLabel(next)}</Text></View>
          <StatusBadge status={next.status} />
          <Button title="Ver detalles de la cita" icon="chevron-right" onPress={() => setSelected(next)} />
        </> : <>
          <Text style={styles.heroTitle}>{pending ? "Tu solicitud está pendiente" : "Tu próxima visita empieza aquí"}</Text>
          <Text style={styles.detail}>{pending ? "Cuando la clínica asigne fecha y hora, podrás consultarlas aquí." : "No tienes citas próximas programadas."}</Text>
          <Button title={pending ? "Ver mi solicitud" : "Solicitar una cita"} icon="chevron-right" onPress={() => visit("appointments")} />
        </>}
      </View>
      <View style={styles.grid}>{actions.map((action) => <Pressable key={action.route} accessibilityRole="button" onPress={() => visit(action.route)} style={({ pressed }) => [styles.action, (width < 350 || fontScale > 1.3) && styles.fullWidth, pressed && styles.pressed]}>
        <View style={styles.icon}><MaterialCommunityIcons name={action.icon} size={29} color={palette.primary} /></View>
        <View style={styles.actionTitle}><Text style={[styles.cardTitle, styles.flex]}>{action.title}</Text><MaterialCommunityIcons name="chevron-right" size={23} color={palette.textSoft} /></View>
        <Text style={styles.detail}>{action.detail}</Text>
      </Pressable>)}</View>
      <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, styles.flex]}>Próximos recordatorios</Text><Pressable accessibilityRole="button" onPress={() => setShowReminders(true)} style={styles.allButton}><Text style={styles.link}>Ver todos</Text><MaterialCommunityIcons name="chevron-right" size={20} color={palette.primary} /></Pressable></View>
      {available && next ? reminder(next) : <View style={styles.reminder}><MaterialCommunityIcons name="calendar-blank-outline" size={28} color={palette.primary} /><Text style={[styles.detail, styles.flex]}>{loading ? "Consultando tus citas…" : error ? "Los recordatorios no están disponibles. Reintenta la consulta." : "No tienes citas próximas para recordar."}</Text></View>}
      <Modal visible={Boolean(selected) || showReminders} transparent animationType="fade" onRequestClose={() => { setSelected(null); setShowReminders(false); }}>
        <View style={styles.backdrop}><View accessibilityViewIsModal style={styles.modal}><ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.sectionTitle}>{selected ? "Detalles de tu cita" : "Recordatorios de citas"}</Text>
          {selected ? <><Text style={styles.heroTitle}>{typeLabel(selected)}</Text><Text style={styles.metaText}>{scheduleLabel(selected)}</Text><StatusBadge status={selected.status} />{selected.description ? <Text style={styles.detail}>{selected.description}</Text> : null}</> : <><Text style={styles.detail}>Tus próximas citas programadas.</Text>{available ? upcoming.length ? upcoming.map(reminder) : <Text style={styles.detail}>No tienes citas próximas para recordar.</Text> : <Text style={styles.detail}>{loading ? "Consultando tus citas…" : "No se pudieron consultar tus citas."}</Text>}</>}
          <Button title="Cerrar" variant="secondary" onPress={() => { setSelected(null); setShowReminders(false); }} />
        </ScrollView></View></View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { maxWidth: 780, width: "100%", alignSelf: "center", gap: 20, paddingTop: 16 },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { flex: 1, borderLeftWidth: 1, borderLeftColor: palette.borderStrong, paddingLeft: 10, marginLeft: 2, fontSize: 16, fontWeight: "700", color: palette.navy },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  avatar: { borderRadius: 24, backgroundColor: "#DFEFFF" },
  greeting: { gap: 5, paddingVertical: 6 },
  greetingTitle: { fontSize: 28, lineHeight: 35, fontWeight: "800", color: palette.navy },
  subtitle: { fontSize: 16, lineHeight: 24, color: palette.textMuted },
  hero: { overflow: "hidden", padding: 20, gap: 15, borderRadius: 24, borderWidth: 1, borderColor: "#CEE1F3", backgroundColor: "#F0F8FF", ...elevation },
  heroDecoration: { position: "absolute", right: -48, top: -32, width: 220, height: 220, borderRadius: 110, backgroundColor: "#E6F3FD", alignItems: "center", justifyContent: "center", opacity: 0.6 },
  pill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 30, backgroundColor: "#DDEEFF" },
  pillText: { color: "#125391", fontSize: 14, fontWeight: "600" },
  heroTitle: { color: palette.navy, fontSize: 24, lineHeight: 31, fontWeight: "700", textTransform: "capitalize" },
  meta: { flexDirection: "row", alignItems: "center", gap: 9 },
  metaText: { flexShrink: 1, color: palette.navySoft, fontSize: 16, lineHeight: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  action: { width: "48%", padding: 16, gap: 6, minHeight: 164, borderRadius: 20, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, ...elevation },
  fullWidth: { width: "100%" },
  pressed: { opacity: 0.7 },
  icon: { width: 50, height: 46, borderRadius: 18, backgroundColor: "#E3F2FF", alignItems: "center", justifyContent: "center", marginBottom: 3 },
  actionTitle: { flexDirection: "row", alignItems: "center", gap: 3 },
  cardTitle: { color: palette.navy, fontSize: 18, lineHeight: 24, fontWeight: "700", textTransform: "capitalize" },
  detail: { color: palette.textMuted, fontSize: 14, lineHeight: 21 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" },
  sectionTitle: { fontSize: 20, lineHeight: 27, fontWeight: "700", color: palette.navy },
  allButton: { minHeight: 44, flexDirection: "row", alignItems: "center" },
  link: { color: palette.primary, fontSize: 14, fontWeight: "600" },
  reminder: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#EAF5FF", borderRadius: 18, padding: 16 },
  backdrop: { flex: 1, backgroundColor: palette.scrim, justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { width: "100%", maxWidth: 520, maxHeight: "85%", borderRadius: 24, backgroundColor: palette.surface, overflow: "hidden" },
  modalContent: { padding: 24, gap: 18 },
});
