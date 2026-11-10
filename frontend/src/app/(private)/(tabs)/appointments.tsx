import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  LoadingState,
  Notice,
  Screen,
  StatusBadge,
} from "@/components/ui/patient-ui";
import { palette, space, type as typography } from "@/constants/theme";
import {
  canChangeAppointment,
  cancelAppointment,
  getAppointments,
  requestAppointment,
  rescheduleAppointment,
  type Appointment,
} from "@/features/patient/appointments";
import { useRemote } from "@/hooks/use-remote";
export default function Appointments() {
  const loader = useCallback(() => getAppointments(), []);
  const { data, loading, error, reload } = useRemote(loader);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [changing, setChanging] = useState<string | null>(null);
  const change = async (
    item: Appointment,
    action: (id: string) => Promise<string>,
  ) => {
    if (changing) return;
    setChanging(item.id);
    setMessage("");
    setSubmitError("");
    try {
      setMessage(await action(item.id));
      await reload();
    } catch (reason) {
      setSubmitError(
        reason instanceof Error
          ? reason.message
          : "No se pudo actualizar la cita.",
      );
    } finally {
      setChanging(null);
    }
  };
  const confirmCancel = (item: Appointment) =>
    Alert.alert(
      "Cancelar cita",
      item.date
        ? `¿Deseas cancelar tu cita del ${item.date}?`
        : "¿Deseas cancelar tu solicitud de cita?",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Cancelar cita",
          style: "destructive",
          onPress: () => void change(item, cancelAppointment),
        },
      ],
    );
  const confirmReschedule = (item: Appointment) =>
    Alert.alert(
      "Reprogramar cita",
      "Se liberará el horario actual y el consultorio te asignará una nueva fecha.",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Reprogramar",
          onPress: () => void change(item, (id) => rescheduleAppointment(id)),
        },
      ],
    );
  const request = async () => {
    setBusy(true);
    setMessage("");
    setSubmitError("");
    try {
      setMessage(await requestAppointment());
      await reload();
    } catch (reason) {
      setSubmitError(
        reason instanceof Error
          ? reason.message
          : "No se pudo solicitar la cita.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen variant="tab">
      <AppHeader
        title="Mis citas"
        subtitle="Consulta tus citas o envía una nueva solicitud."
      />
      {message ? <Notice tone="success">{message}</Notice> : null}
      {submitError || error ? (
        <Notice tone="error">{submitError || error}</Notice>
      ) : null}
      <Button
        title="Solicitar una cita"
        icon="calendar-plus"
        loading={busy}
        onPress={() => void request()}
      />
      {loading ? (
        <LoadingState />
      ) : data?.length ? (
        <View style={styles.list}>
          {data.map((item) => (
            <Card key={item.id}>
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
                    {item.date
                      ? `Cita del ${item.date}`
                      : "Solicitud pendiente de programación"}
                  </Text>
                  <Text style={styles.type}>{item.type}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={styles.meta}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={18}
                  color={palette.textMuted}
                />
                <Text style={styles.metaText}>
                  {item.startTime
                    ? `${item.startTime}${item.endTime ? ` – ${item.endTime}` : ""}`
                    : "Aún sin horario asignado"}
                </Text>
              </View>
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}
              {canChangeAppointment(item) ? (
                <View style={styles.actions}>
                  {item.status === "programada" ? (
                    <Button
                      title="Reprogramar"
                      icon="calendar-sync"
                      variant="secondary"
                      loading={changing === item.id}
                      disabled={changing !== null}
                      onPress={() => confirmReschedule(item)}
                    />
                  ) : null}
                  <Button
                    title={
                      item.status === "pendiente"
                        ? "Cancelar solicitud"
                        : "Cancelar cita"
                    }
                    icon="calendar-remove"
                    variant="danger"
                    loading={changing === item.id}
                    disabled={changing !== null}
                    onPress={() => confirmCancel(item)}
                  />
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="calendar-blank-outline"
          title="Aún no tienes citas"
          detail="Puedes enviar una solicitud desde esta pantalla."
        />
      )}
      <Button
        title="Actualizar citas"
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
