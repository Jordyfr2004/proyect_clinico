import type { Appointment } from './appointments';

// Local appointment notifications are native-only; avoid loading the native
// push-token listener on Web. Scheduling rules remain testable in reminder-plan.
export const cancelAppointmentReminders = async (): Promise<void> => {};
export const removeAppointmentReminders = async (_id: string): Promise<void> => {};
export const syncAppointmentReminders = async (
  _appointments: Appointment[],
  _isCurrent?: () => boolean,
): Promise<number> => 0;
