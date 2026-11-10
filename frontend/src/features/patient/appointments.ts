import { apiRequest } from "@/api/client";
import {
  asArray,
  asOptionalString,
  asRecord,
  asString,
  parseEnvelope,
} from "@/validation/primitives";

export type Appointment = {
  id: string;
  patientId: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  type: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const parseAppointment = (value: unknown): Appointment => {
  const r = asRecord(value, "La cita");
  return {
    id: asString(r, "id"),
    patientId: asString(r, "paciente_id"),
    date: asOptionalString(r, "fecha"),
    startTime: asOptionalString(r, "hora_inicio"),
    endTime: asOptionalString(r, "hora_fin"),
    type: asString(r, "tipo"),
    description: asOptionalString(r, "descripcion"),
    status: asString(r, "estado"),
    createdAt: asString(r, "created_at"),
    updatedAt: asString(r, "updated_at"),
  };
};

export const parseAppointments = (value: unknown): Appointment[] =>
  parseEnvelope(value, (data) =>
    asArray({ data }, "data").map(parseAppointment),
  );
export const getAppointments = async () =>
  parseAppointments(await apiRequest("/agenda/mis-citas"));
const messageOf = (value: unknown): string =>
  asString(asRecord(value, "La respuesta del servidor"), "message");
export const cancelAppointment = async (id: string): Promise<string> =>
  messageOf(
    await apiRequest(`/agenda/mis-citas/${encodeURIComponent(id)}/cancelar`, {
      method: "PUT",
    }),
  );
export const rescheduleAppointment = async (
  id: string,
  reason?: string,
): Promise<string> =>
  messageOf(
    await apiRequest(
      `/agenda/mis-citas/${encodeURIComponent(id)}/reprogramar`,
      { method: "PUT", body: reason?.trim() ? { motivo: reason.trim() } : {} },
    ),
  );
/** La cita se puede cancelar o reprogramar mientras no haya comenzado. */
export const canChangeAppointment = (item: Appointment, now = new Date()) => {
  if (item.status !== "pendiente" && item.status !== "programada")
    return false;
  if (!item.date || !item.startTime) return item.status === "pendiente";
  const start = new Date(`${item.date.slice(0, 10)}T${item.startTime.slice(0, 5)}:00`);
  return Number.isNaN(start.getTime()) || start > now;
};
export const requestAppointment = async (): Promise<string> => {
  const r = asRecord(
    await apiRequest("/agenda/solicitar-cita", { method: "POST" }),
    "La respuesta del servidor",
  );
  return asString(r, "message");
};
