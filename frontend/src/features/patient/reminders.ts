import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";
import type { Appointment } from "./appointments";
import { planReminders, REMINDER_ID_PREFIX, REMINDER_LEAD_HOURS } from "./reminder-plan";
import { registerSessionCleanup } from '../auth/session-cleanup';

/**
 * Parte "nativa": habla con expo-notifications para programar avisos LOCALES
 * (viven en el teléfono, no necesitan servidor ni internet para sonar).
 */

const CHANNEL_ID = "citas";
let configured = false;
let generation = 0;
let desired: Appointment[] | null = null;
let desiredCurrent: () => boolean = () => true;
let queue: Promise<unknown> = Promise.resolve();
const enqueue = <T,>(operation: () => Promise<T>): Promise<T> => {
  const pending = queue.catch(() => undefined).then(operation);
  queue = pending;
  return pending;
};

const isSupported = () => Platform.OS === "android" || Platform.OS === "ios";

const configure = async () => {
  if (configured) return;
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
      importance: AndroidImportance.HIGH,
    });
  }
  configured = true;
};

const ensurePermission = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
};

/** Borra solo los avisos de citas (los que empiezan con "cita-"). */
const removeOwnedReminders = async (appointmentId?: string): Promise<void> => {
  if (!isSupported()) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => appointmentId
        ? REMINDER_LEAD_HOURS.some(lead => n.identifier === `${REMINDER_ID_PREFIX}${appointmentId}-${lead}h`)
        : n.identifier.startsWith(REMINDER_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
};
export const cancelAppointmentReminders = (): Promise<void> => {
  generation += 1;
  desired = null;
  return enqueue(() => removeOwnedReminders());
};
registerSessionCleanup(cancelAppointmentReminders);

export const removeAppointmentReminders = (id: string): Promise<unknown> => {
  if (desired) return syncAppointmentReminders(desired.filter(item => item.id !== id), desiredCurrent);
  generation += 1;
  return enqueue(() => removeOwnedReminders(id));
};

/**
 * Deja programados exactamente los avisos que corresponden a las citas
 * actuales: borra los anteriores y programa los nuevos.
 * Devuelve cuántos avisos quedaron programados.
 */
export const syncAppointmentReminders = (
  appointments: Appointment[],
  isCurrent: () => boolean = () => true,
): Promise<number> => {
  desired = appointments;
  desiredCurrent = isCurrent;
  const operation = ++generation;
  const current = () => operation === generation && isCurrent();
  return enqueue(async () => {
    if (!isSupported() || !current()) return 0;
    await removeOwnedReminders();
    if (!current()) return 0;
    await configure();
    if (!current() || !(await ensurePermission()) || !current()) return 0;
    const plan = planReminders(appointments);
    for (const reminder of plan) {
      if (!current()) return 0;
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
  });
};
