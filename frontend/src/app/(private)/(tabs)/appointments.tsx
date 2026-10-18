import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
  getAppointments,
  requestAppointment,
} from "@/features/patient/appointments";
import { useRemote } from "@/hooks/use-remote";

const appointmentTypeLabel = (type: string) =>
  type === "cita_medica" ? "Cita médica" : type.replaceAll("_", " ");

export default function Appointments() {
  const loader = useCallback(() => getAppointments(), []);
  const { data, loading, error, reload } = useRemote(loader);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const hasPendingRequest =
    data?.some((item) => item.status.toLowerCase() === "pendiente") ?? false;
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
        title={hasPendingRequest ? "Solicitud pendiente" : "Solicitar una cita"}
        icon="calendar-plus"
        loading={busy}
        disabled={hasPendingRequest}
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
                  <Text style={styles.type}>
                    {appointmentTypeLabel(item.type)}
                  </Text>
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
});
