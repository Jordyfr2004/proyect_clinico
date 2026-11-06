import { formatScheduledAppointment } from '../appointment-display';

describe('scheduled appointment display', () => {
  test('shows the assigned local calendar day and start time in Spanish', () => {
    expect(formatScheduledAppointment('2026-11-11', '13:00:00'))
      .toBe('Miércoles 11 de noviembre, 13:00');
  });

  test('does not invent a schedule when date or time is missing', () => {
    expect(formatScheduledAppointment(null, '13:00:00')).toBeNull();
    expect(formatScheduledAppointment('2026-11-11', null)).toBeNull();
  });
});
