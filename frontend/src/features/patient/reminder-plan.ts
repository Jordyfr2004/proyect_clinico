import type { Appointment } from "./appointments";

/**
 * Lógica PURA de recordatorios: decide QUÉ avisos hay que programar.
 * No importa expo-notifications, así que se puede probar sin celular.
 */

export type PlannedReminder = {
  /** Identificador estable: la misma cita + el mismo adelanto = mismo id. */
  identifier: string;
  /** Momento exacto (hora local del teléfono) en que debe sonar el aviso. */
  fireAt: Date;
  title: string;
  body: string;
};

/** Cuántas horas ANTES de la cita se avisa. */
export const REMINDER_LEAD_HOURS = [24, 2] as const;

/** iOS permite como máximo 64 notificaciones locales pendientes. */
const MAX_REMINDERS = 60;

/** Prefijo para reconocer (y poder borrar) solo NUESTROS avisos. */
export const REMINDER_ID_PREFIX = "cita-";

/** Convierte fecha ("2026-10-20" o ISO) + hora ("10:00:00") en un Date local. */
export const appointmentStart = (item: Appointment): Date | null => {
  if (!item.date || !item.startTime) return null;
  const start = new Date(
    `${item.date.slice(0, 10)}T${item.startTime.slice(0, 5)}:00`,
  );
  return Number.isNaN(start.getTime()) ? null : start;
};

const hourLabel = (item: Appointment) => (item.startTime ?? "").slice(0, 5);

export const planReminders = (
  appointments: Appointment[],
  now: Date = new Date(),
  leadHours: readonly number[] = REMINDER_LEAD_HOURS,
): PlannedReminder[] => {
  const planned: PlannedReminder[] = [];

  for (const item of appointments) {
    // Solo citas ya programadas (no pendientes, canceladas ni completadas).
    if (item.status !== "programada") continue;
    const start = appointmentStart(item);
    if (!start) continue;

    for (const lead of leadHours) {
      const fireAt = new Date(start.getTime() - lead * 60 * 60 * 1000);
      // Si ese momento ya pasó (o es dentro de menos de 1 minuto), se omite.
      if (fireAt.getTime() <= now.getTime() + 60 * 1000) continue;

      planned.push({
        identifier: `${REMINDER_ID_PREFIX}${item.id}-${lead}h`,
        fireAt,
        title: "Recordatorio de cita",
        body:
          lead >= 24
            ? `Mañana a las ${hourLabel(item)} tienes cita en el consultorio.`
            : `En ${lead} horas (${hourLabel(item)}) tienes cita en el consultorio.`,
      });
    }
  }

  return planned
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, MAX_REMINDERS);
};