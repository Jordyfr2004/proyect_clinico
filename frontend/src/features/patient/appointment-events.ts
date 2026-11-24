import type { Appointment } from './appointments';

type Event = { type: 'loaded'; items: Appointment[] } | { type: 'changed'; appointmentId?: string };
const listeners = new Set<(event: Event) => void>();
export const subscribeAppointments = (listener: (event: Event) => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const publishAppointments = (event: Event) => {
  for (const listener of listeners) {
    try { listener(event); } catch { /* A UI subscriber cannot undo a confirmed server write. */ }
  }
};
