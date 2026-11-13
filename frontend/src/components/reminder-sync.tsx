import { useEffect } from "react";
import { AppState } from "react-native";
import { getAppointments } from "@/features/patient/appointments";
import {
  cancelAppointmentReminders,
  syncAppointmentReminders,
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

    const run = async () => {
      try {
        const items = await getAppointments();
        if (active) await syncAppointmentReminders(items);
      } catch {
        // Sin conexión o sin permiso: se intentará en la próxima apertura.
      }
    };

    void run();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void run();
    });

    return () => {
      active = false;
      subscription.remove();
      void cancelAppointmentReminders().catch(() => undefined);
    };
  }, []);

  return null;
}