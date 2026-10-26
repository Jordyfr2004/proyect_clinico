import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Appointment } from "./appointments";
import { planReminders, REMINDER_ID_PREFIX } from "./reminder-plan";

/**
 * Parte "nativa": habla con expo-notifications para programar avisos LOCALES
 * (viven en el teléfono, no necesitan servidor ni internet para sonar).
 */

const CHANNEL_ID = "citas";
let configured = false;

const isSupported = () => Platform.OS === "android" || Platform.OS === "ios";

const configure = async () => {
  if (configured) return;
  configured = true;
  // Cómo se muestra un aviso si la app está abierta en primer plano.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Recordatorios de citas",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
};

const ensurePermission = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
};

/** Borra solo los avisos de citas (los que empiezan con "cita-"). */
export const cancelAppointmentReminders = async (): Promise<void> => {
  if (!isSupported()) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
};

/**
 * Deja programados exactamente los avisos que corresponden a las citas
 * actuales: borra los anteriores y programa los nuevos.
 * Devuelve cuántos avisos quedaron programados.
 */
export const syncAppointmentReminders = async (
  appointments: Appointment[],
): Promise<number> => {
  if (!isSupported()) return 0;
  await configure();
  if (!(await ensurePermission())) return 0;

  await cancelAppointmentReminders();
  const plan = planReminders(appointments);

  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: { title: reminder.title, body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
        channelId: CHANNEL_ID,
      },
    });
  }
  return plan.length;
};