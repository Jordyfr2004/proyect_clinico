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
import { ApiError } from "@/api/errors";
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
  const [refreshWarning, setRefreshWarning] = useState("");
  const [requestConfirmed, setRequestConfirmed] = useState(false);
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
      setRequestConfirmed(
        result.data.some((item) => item.status.toLowerCase() === "pendiente"),
      );
    }
  };

  const request = async () => {
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
      {submitError || refreshWarning || (!initialLoading && error) ? (
        <Notice tone="error">{submitError || refreshWarning || error}</Notice>
      ) : null}
      <Button
        title={pendingOrConfirmed ? "Solicitud pendiente" : "Solicitar una cita"}
        icon="calendar-plus"
        loading={busy}
        disabled={requestDisabled}
        onPress={() => void request()}
      />
      {initialLoading ? (
        <LoadingState />
      ) : unavailable ? null : data?.length ? (
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
      {initialLoading ? null : (
        <Button
          title={unavailable ? "Reintentar" : "Actualizar citas"}
          icon="refresh"
          variant="ghost"
          onPress={() => void refresh()}
        />
      )}
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
