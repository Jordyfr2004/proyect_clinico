import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useCallback, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingState,
  Notice,
  Screen,
  StatusBadge,
} from "@/components/ui/patient-ui";
import { palette, space, type as typography } from "@/constants/theme";
import { ApiError } from "@/api/errors";
import {
  canChangeAppointment,
  canRescheduleAppointment,
  cancelAppointment,
  getAppointments,
  requestAppointment,
  rescheduleAppointment,
  type Appointment,
} from "@/features/patient/appointments";
import { confirmAction } from "@/components/ui/confirm-action";
import { useAppointmentRefresh } from "@/hooks/use-appointment-refresh";
import { useRemote } from "@/hooks/use-remote";
import { formatScheduledAppointment } from "@/features/patient/appointment-display";

const appointmentTypeLabel = (type: string) =>
  type === "cita_medica" ? "Cita médica" : type.replaceAll("_", " ");

export default function Appointments() {
  const loader = useCallback(() => getAppointments(), []);
  const { data, loading, error, reload } = useRemote(loader);
  useAppointmentRefresh(reload);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [refreshWarning, setRefreshWarning] = useState("");
  const [requestConfirmed, setRequestConfirmed] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [reason, setReason] = useState("");
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [acceptedData, setAcceptedData] = useState(data);
  // Reconcile local write guards when a new authoritative list is rendered.
  if (data !== acceptedData && data !== null && !loading && !error) {
    setAcceptedData(data);
    setRequestConfirmed(false);
    setBlockedIds([]);
    setRefreshWarning('');
  }
  const hasPendingRequest =
    data?.some((item) => item.status.toLowerCase() === "pendiente") ?? false;
  const pendingOrConfirmed = hasPendingRequest || requestConfirmed;
  const initialLoading = loading && data === null;
  const unavailable = Boolean(error) && data === null;
  const requestDisabled =
    loading || Boolean(error) || data === null || pendingOrConfirmed;

  const refresh = async () => {
    setRefreshWarning("");
    const result = await reload();
    if (result.ok) {
      setBlockedIds([]);
      setRequestConfirmed(
        result.data.some((item) => item.status.toLowerCase() === "pendiente"),
      );
    }
  };

  const request = async () => {
    if (lock.current || requestDisabled) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setSubmitError("");
    setRefreshWarning("");
    try {
      const confirmation = await requestAppointment();
      setMessage(confirmation);
      setRequestConfirmed(true);
      const result = await reload();
      if (result.ok) {
        setRequestConfirmed(
          result.data.some(
            (item) => item.status.toLowerCase() === "pendiente",
          ),
        );
      } else {
        setRefreshWarning(
          "La solicitud fue registrada, pero no se pudo actualizar el listado. Reintenta la actualización antes de solicitar otra cita.",
        );
      }
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        setRequestConfirmed(true);
      }
      setSubmitError(
        reason instanceof Error
          ? reason.message
          : "No se pudo solicitar la cita.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const change = async (item: Appointment, reschedule: boolean) => {
    if (lock.current || blockedIds.includes(item.id) || error || loading) return;
    if (!(reschedule ? canRescheduleAppointment(item) : canChangeAppointment(item))) return;
    if (reschedule && reason.trim().length > 255) { setSubmitError("El motivo no puede superar 255 caracteres."); return; }
    lock.current = true;
    setBusy(true);
    setMessage(""); setSubmitError(""); setRefreshWarning("");
    try {
      const confirmation = reschedule
        ? await (reason.trim() ? rescheduleAppointment(item.id, reason.trim()) : rescheduleAppointment(item.id))
        : await cancelAppointment(item.id);
      setMessage(confirmation);
      setBlockedIds(ids => [...ids, item.id]);
      if (reschedule) setRequestConfirmed(true);
      setSelected(null); setReason("");
      const result = await reload();
      if (result.ok) {
        setBlockedIds([]);
        setRequestConfirmed(result.data.some(c => c.status === "pendiente"));
      } else setRefreshWarning("El cambio fue realizado, pero no se pudo actualizar el listado. Reintenta solo la consulta.");
    } catch (failure) {
      setSubmitError(failure instanceof ApiError ? Object.values(failure.fieldErrors).flat().join("\n") || failure.message : failure instanceof Error ? failure.message : "No se pudo modificar la cita.");
      if (failure instanceof ApiError && failure.status === 409) {
        setBlockedIds(ids => [...ids, item.id]);
        setRefreshWarning("Actualiza las citas antes de intentar otra operación.");
      }
    } finally { lock.current = false; setBusy(false); }
  };
  const confirmChange = (item: Appointment, reschedule: boolean) => {
    if (lock.current) return;
    if (reschedule) confirmAction("Reprogramar", "La cita volverá a pendiente. La doctora asignará una nueva fecha y hora.", "Reprogramar", () => void change(item, true));
    else confirmAction("Cancelar cita", item.date ? `¿Deseas cancelar tu cita del ${item.date.slice(0, 10)}?` : "¿Deseas cancelar esta solicitud pendiente?", "Cancelar cita", () => void change(item, false), true);
  };
  const actionsFor = (item: Appointment) => !blockedIds.includes(item.id) && !error && canChangeAppointment(item) ? <View style={styles.actions}>
    <Button title="Cancelar cita" variant="danger" disabled={busy || loading} onPress={() => confirmChange(item, false)} />
    {canRescheduleAppointment(item) ? <Button title="Reprogramar" variant="secondary" disabled={busy || loading || pendingOrConfirmed} onPress={() => confirmChange(item, true)} /> : null}
  </View> : null;
  return (
    <Screen variant="tab" onRefresh={() => void refresh()} refreshing={loading && data !== null}>
      <AppHeader
        title="Mis citas"
        subtitle="Consulta tus citas o envía una nueva solicitud."
      />
      {message ? <Notice tone="success">{message}</Notice> : null}
      {submitError || refreshWarning || (!initialLoading && error) ? (
        <Notice tone="error">{submitError || refreshWarning || error}</Notice>
      ) : null}
      <Button
        title={pendingOrConfirmed ? "Solicitud pendiente" : "Solicitar una cita"}
        icon="calendar-plus"
        loading={busy}
        disabled={requestDisabled || Boolean(refreshWarning)}
        onPress={() => void request()}
      />
      {initialLoading ? (
        <LoadingState />
      ) : unavailable ? null : data?.length ? (
        <View style={styles.list}>
          {data.map((item) => {
            const schedule = item.status.toLowerCase() === "programada"
              ? formatScheduledAppointment(item.date, item.startTime)
              : null;
            return <View key={item.id}><Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={schedule ? `Ver cita programada, ${schedule}` : `Ver detalles, ${item.status}`}
              onPress={() => { setSelected(item); setReason(""); }}
            >
              <Card>
              <View style={styles.top}>
                <View style={styles.calendar}>
                  <MaterialCommunityIcons
                    name="calendar-blank-outline"
                    size={24}
                    color={palette.primary}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>
                    {schedule
                      ? "Cita programada"
                      : item.date
                      ? `Cita del ${item.date}`
                      : item.status === 'pendiente' ? "Solicitud pendiente de programación" : `Cita ${item.status}`}
                  </Text>
                  <Text style={styles.type}>
                    {appointmentTypeLabel(item.type)}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              {item.date && item.status === "programada" && !canChangeAppointment(item) ? <Text style={styles.type}>{`Cita del ${item.date.slice(0, 10)}`}</Text> : null}
              <View style={styles.meta}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={18}
                  color={palette.textMuted}
                />
                <Text style={styles.metaText}>
                  {schedule
                    ? "Toca para ver día y hora"
                    : item.startTime
                    ? `${item.startTime}${item.endTime ? ` – ${item.endTime}` : ""}`
                    : item.status === 'pendiente' ? "Aún sin horario asignado" : "Sin horario registrado"}
                </Text>
              </View>
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}
              </Card>
            </Pressable>
            {selected ? null : actionsFor(item)}
            </View>;
          })}
        </View>
      ) : (
        <EmptyState
          icon="calendar-blank-outline"
          title="Aún no tienes citas"
          detail="Puedes enviar una solicitud desde esta pantalla."
        />
      )}
      {!initialLoading && (error || refreshWarning) ? (
        <Button
          title="Reintentar"
          icon="refresh"
          variant="ghost"
          onPress={() => void refresh()}
        />
      ) : null}
      {selected ? (
        <Modal transparent animationType="none" visible onRequestClose={() => { if (!busy) setSelected(null); }}>
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <Pressable accessibilityLabel="Cerrar detalles" style={styles.modalDismiss} disabled={busy} onPress={() => setSelected(null)} />
            <View accessibilityViewIsModal style={styles.modalCard}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
                <View style={styles.modalIcon}><MaterialCommunityIcons name="calendar-check-outline" size={28} color={palette.primary} /></View>
                <Text style={styles.modalTitle}>{selected.status === "programada" ? "Cita agendada" : "Detalles de tu cita"}</Text>
                <StatusBadge status={selected.status} />
                <Text style={styles.modalSchedule}>{formatScheduledAppointment(selected.date?.slice(0, 10) ?? null, selected.startTime) ?? "Sin fecha y horario confirmados"}</Text>
                {selected.endTime ? <Text style={styles.modalSchedule}>Hora de fin: {selected.endTime.slice(0, 5)}</Text> : null}
                <Text style={styles.type}>Hora del consultorio · America/Guayaquil</Text>
                <Text style={styles.description}>{selected.description || "Sin descripción registrada."}</Text>
                {canRescheduleAppointment(selected) ? <Field label="Motivo de reprogramación (opcional)" value={reason} onChangeText={setReason} maxLength={255} multiline editable={!busy} /> : null}
                {submitError ? <Notice tone="error">{submitError}</Notice> : null}
                {actionsFor(selected)}
                <Button title="Cerrar" variant="ghost" disabled={busy} onPress={() => setSelected(null)} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.scrim, padding: space.lg },
  modalDismiss: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  modalCard: { width: "100%", maxWidth: 520, maxHeight: "85%", borderRadius: 22, backgroundColor: palette.surface },
  modalContent: { padding: space.lg, gap: space.md },
  modalClose: { position: "absolute", top: space.sm, right: space.sm, width: 36, height: 36, alignItems: "center", justifyContent: "center", zIndex: 1 },
  modalIcon: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: palette.primarySoft, marginBottom: space.md },
  modalTitle: { color: palette.navy, ...typography.section, textAlign: "center", marginBottom: space.xs },
  modalSchedule: { color: palette.textMuted, ...typography.body, textAlign: "center" },
  list: { gap: space.md },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  calendar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  title: { color: palette.navy, ...typography.label },
  type: {
    color: palette.textMuted,
    textTransform: "capitalize",
    ...typography.caption,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: space.xs },
  metaText: { color: palette.textMuted, ...typography.body },
  description: { color: palette.textMuted, ...typography.body },
  actions: { gap: space.sm },
});
