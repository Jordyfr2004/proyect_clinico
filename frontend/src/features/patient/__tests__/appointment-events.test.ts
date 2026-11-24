import { apiRequest } from '@/api/client';
import { cancelAppointment, getAppointments } from '../appointments';
import { subscribeAppointments } from '../appointment-events';

jest.mock('@/api/client', () => ({ apiRequest: jest.fn() }));
const scheduled = { id: 'a1', paciente_id: 'p1', fecha: '2099-10-20', hora_inicio: '10:00:00', hora_fin: '11:00:00', tipo: 'cita_medica', estado: 'programada', created_at: '', updated_at: '' };
test('an old GET cannot recreate reminders after cancellation has been confirmed and refreshed', async () => {
  const events: string[] = [];
  const unsubscribe = subscribeAppointments(event => { if (event.type === 'loaded') events.push(event.items[0].status); });
  let finish!: (value: unknown) => void;
  jest.mocked(apiRequest).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const old = getAppointments();
  jest.mocked(apiRequest).mockResolvedValueOnce({ message: 'Cita cancelada correctamente.' });
  await cancelAppointment('a1');
  jest.mocked(apiRequest).mockResolvedValueOnce({ data: [{ ...scheduled, estado: 'cancelada' }] });
  await getAppointments();
  finish({ data: [scheduled] });
  await old.catch(() => undefined);
  unsubscribe();
  expect(events).toEqual(['cancelada']);
});
