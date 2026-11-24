import * as Notifications from 'expo-notifications';
import { cancelAppointmentReminders, removeAppointmentReminders, syncAppointmentReminders } from '../reminders';
import type { Appointment } from '../appointments';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 }, SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(), setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(), cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));
const item: Appointment = { id: 'a', patientId: 'p', date: '2099-10-20', startTime: '10:00:00', endTime: null, status: 'programada', type: 'cita_medica', description: null, createdAt: '', updatedAt: '' };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never);
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([{ identifier: 'cita-old' }, { identifier: 'other-feature' }] as never);
});
test('logout invalidates a sync waiting for notification permissions', async () => {
  let finish!: (value: never) => void;
  jest.mocked(Notifications.getPermissionsAsync).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const sync = syncAppointmentReminders([item]);
  // Let the sync enter its permission request.
  for (let i = 0; i < 8; i++) await Promise.resolve();
  const cleanup = cancelAppointmentReminders();
  finish({ granted: true } as never);
  await Promise.all([sync, cleanup]);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('other-feature');
});
test('a denied permission clears obsolete reminders and leaves the application usable', async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: false } as never);
  await expect(syncAppointmentReminders([])).resolves.toBe(0);
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('cita-old');
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
test('concurrent syncs leave only the latest plan', async () => {
  await Promise.all([syncAppointmentReminders([item]), syncAppointmentReminders([])]);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
test('cancelling one appointment preserves the other confirmed reminders when the next GET fails', async () => {
  await syncAppointmentReminders([item, { ...item, id: 'other' }]);
  jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
  await removeAppointmentReminders('a');
  const scheduled = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([request]) => request.identifier);
  expect(scheduled).toEqual(['cita-other-24h', 'cita-other-2h']);
});
