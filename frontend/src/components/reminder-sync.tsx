import { useEffect } from "react";
import { AppState } from "react-native";
import { getAppointments } from "@/features/patient/appointments";
import { subscribeAppointments } from '@/features/patient/appointment-events';
import {
  cancelAppointmentReminders,
  syncAppointmentReminders,
  removeAppointmentReminders,
} from "@/features/patient/reminders";

/**
 * Componente invisible. Mientras el paciente tiene sesión iniciada:
 *  - al abrir la app y cada vez que vuelve a primer plano, descarga sus citas
 *    y reprograma los recordatorios;
 *  - al cerrar sesión (se desmonta) borra los recordatorios del teléfono.
 * Si algo falla (sin red, sin permiso) NO rompe la app: simplemente no hace nada.
 */
export function ReminderSync() {
  useEffect(() => {
    let active = true;
    let running = false;

    const run = async () => {
      if (!active || running) return;
      running = true;
      try {
        await getAppointments();
      } catch {
        // Sin conexión o sin permiso: se intentará en la próxima apertura.
      } finally { running = false; }
    };

    const unsubscribe = subscribeAppointments(event => {
      if (!active) return;
      if (event.type === 'loaded') void syncAppointmentReminders(event.items, () => active).catch(() => undefined);
      else {
        if (event.appointmentId) void removeAppointmentReminders(event.appointmentId).catch(() => undefined);
        void run();
      }
    });

    void run();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void run();
    });

    return () => {
      active = false;
      unsubscribe();
      subscription.remove();
      void cancelAppointmentReminders().catch(() => undefined);
    };
  }, []);

  return null;
}
