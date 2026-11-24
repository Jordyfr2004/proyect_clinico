import { canChangeAppointment, canRescheduleAppointment, type Appointment } from '../appointments';
import { appointmentStart } from '../reminder-plan';

const item: Appointment = { id: 'a', patientId: 'p', date: '2099-10-20', startTime: '10:00:00', endTime: '11:00:00', status: 'programada', type: 'cita_medica', description: null, createdAt: '', updatedAt: '' };
const now = new Date('2099-10-20T14:59:00Z');

test('uses the clinic timezone even when the phone is abroad', () => {
  expect(appointmentStart(item)?.toISOString()).toBe('2099-10-20T15:00:00.000Z');
  expect(canChangeAppointment(item, now)).toBe(true);
  expect(canChangeAppointment(item, new Date('2099-10-20T15:00:00Z'))).toBe(false);
});
test.each(['2099-02-30', 'invalid', '2099-13-01', '2099-11-24BAD'])('invalid date %s never authorizes changes', date => {
  expect(canChangeAppointment({ ...item, date }, now)).toBe(false);
});
test('a pending request can be cancelled but cannot be rescheduled', () => {
  const pending = { ...item, status: 'pendiente', date: null, startTime: null };
  expect(canChangeAppointment(pending, now)).toBe(true);
  expect(canRescheduleAppointment(pending, now)).toBe(false);
});
test.each(['cancelada', 'completada'])('%s cannot be changed', status => {
  expect(canChangeAppointment({ ...item, status }, now)).toBe(false);
  expect(canRescheduleAppointment({ ...item, status }, now)).toBe(false);
});
