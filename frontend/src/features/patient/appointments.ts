import { apiRequest } from "@/api/client";
import { clinicAppointmentStart } from './appointment-display';
import { publishAppointments } from './appointment-events';
import { registerSessionCleanup } from '../auth/session-cleanup';
import {
  asArray,
  asOptionalString,
  asRecord,
  asString,
  parseEnvelope,
} from "@/validation/primitives";

let revision = 0;
let latestList = 0;
registerSessionCleanup(() => { revision += 1; latestList += 1; });
const changed = (appointmentId?: string) => {
  revision += 1;
  publishAppointments({ type: 'changed', appointmentId });
};

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
export const getAppointments = async () => {
  const scope = revision;
  const request = ++latestList;
  const items = parseAppointments(await apiRequest("/agenda/mis-citas"));
  if (scope !== revision) throw new Error('La consulta de citas quedó obsoleta. Actualiza el listado.');
  if (request === latestList) publishAppointments({ type: 'loaded', items });
  return items;
};
const messageOf = (value: unknown): string =>
  asString(asRecord(value, "La respuesta del servidor"), "message");
export const cancelAppointment = async (id: string): Promise<string> => {
  const message = messageOf(
    await apiRequest(`/agenda/mis-citas/${encodeURIComponent(id)}/cancelar`, {
      method: "PUT",
    }),
  );
  changed(id);
  return message;
};
export const rescheduleAppointment = async (
  id: string,
  reason?: string,
): Promise<string> => {
  if ((reason?.trim().length ?? 0) > 255) throw new Error('El motivo no puede superar 255 caracteres.');
  const message = messageOf(
    await apiRequest(
      `/agenda/mis-citas/${encodeURIComponent(id)}/reprogramar`,
      { method: "PUT", body: reason?.trim() ? { motivo: reason.trim() } : {} },
    ),
  );
  changed(id);
  return message;
};
/** La cita se puede cancelar o reprogramar mientras no haya comenzado. */
export const canChangeAppointment = (item: Appointment, now = new Date()) => {
  if (item.status !== "pendiente" && item.status !== "programada")
    return false;
  if (!item.date && !item.startTime) return item.status === "pendiente";
  const start = clinicAppointmentStart(item.date, item.startTime);
  return start !== null && start > now;
};
export const canRescheduleAppointment = (item: Appointment, now = new Date()) =>
  item.status === 'programada' && canChangeAppointment(item, now);
export const requestAppointment = async (): Promise<string> => {
  const r = asRecord(
    await apiRequest("/agenda/solicitar-cita", { method: "POST" }),
    "La respuesta del servidor",
  );
  const message = asString(r, "message");
  changed();
  return message;
};
