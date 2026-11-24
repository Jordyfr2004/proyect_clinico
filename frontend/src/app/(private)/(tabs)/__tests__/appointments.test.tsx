import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Appointments from '../appointments';
import { cancelAppointment, getAppointments, rescheduleAppointment } from '@/features/patient/appointments';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn(), router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/features/patient/appointments', () => ({
  ...jest.requireActual('@/features/patient/appointments'),
  getAppointments: jest.fn(),
  cancelAppointment: jest.fn(),
  rescheduleAppointment: jest.fn(),
  requestAppointment: jest.fn(),
}));

const scheduled = { id: 'a1', patientId: 'p1', date: '2099-10-20', startTime: '10:00:00', endTime: '11:00:00', type: 'cita_medica', description: null, status: 'programada', createdAt: '', updatedAt: '' };
const renderScreen = () => render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 720 }, insets: { top: 24, left: 0, right: 0, bottom: 24 } }}><Appointments /></SafeAreaProvider>);
const pressAlertButton = async (text: string) => {
  const buttons = (jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? []) as { text?: string; onPress?: () => void }[];
  await act(async () => { buttons.find((button) => button.text === text)?.onPress?.(); });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

describe('patient appointments', () => {
  test('asks for confirmation before cancelling and then cancels', async () => {
    jest.mocked(getAppointments).mockResolvedValue([scheduled]);
    jest.mocked(cancelAppointment).mockResolvedValue('Cita cancelada correctamente.');
    renderScreen();
    fireEvent.press(await screen.findByRole('button', { name: 'Cancelar cita' }));
    expect(Alert.alert).toHaveBeenCalledWith('Cancelar cita', '¿Deseas cancelar tu cita del 2099-10-20?', expect.any(Array));
    expect(cancelAppointment).not.toHaveBeenCalled();
    await pressAlertButton('Cancelar cita');
    expect(cancelAppointment).toHaveBeenCalledWith('a1');
    expect(await screen.findByText('Cita cancelada correctamente.')).toBeTruthy();
  });

  test('requests a reschedule for a scheduled appointment', async () => {
    jest.mocked(getAppointments).mockResolvedValue([scheduled]);
    jest.mocked(rescheduleAppointment).mockResolvedValue('Solicitud de reprogramación enviada.');
    renderScreen();
    fireEvent.press(await screen.findByRole('button', { name: 'Reprogramar' }));
    await pressAlertButton('Reprogramar');
    expect(rescheduleAppointment).toHaveBeenCalledWith('a1');
  });

  test('offers no changes for completed or past appointments', async () => {
    jest.mocked(getAppointments).mockResolvedValue([
      { ...scheduled, id: 'a2', status: 'completada' },
      { ...scheduled, id: 'a3', date: '2020-01-01' },
    ]);
    renderScreen();
    expect(await screen.findAllByText('Cita del 2020-01-01')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancelar cita' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).toBeNull();
  });

  test('a cancelled pending request never looks like a new pending booking', async () => {
    jest.mocked(getAppointments).mockResolvedValue([{ ...scheduled, status: 'cancelada', date: null, startTime: null, endTime: null }]);
    renderScreen();
    await screen.findByText('Cita cancelada');
    expect(screen.queryByText('Solicitud pendiente de programación')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar cita' })).toBeNull();
  });

  test('shows the server message when the change is rejected', async () => {
    jest.mocked(getAppointments).mockResolvedValue([scheduled]);
    jest.mocked(cancelAppointment).mockRejectedValue(new Error('La cita ya comenzó o ya pasó; comunícate con el consultorio.'));
    renderScreen();
    fireEvent.press(await screen.findByRole('button', { name: 'Cancelar cita' }));
    await pressAlertButton('Cancelar cita');
    expect(await screen.findByText('La cita ya comenzó o ya pasó; comunícate con el consultorio.')).toBeTruthy();
  });

  test('a confirmed cancellation followed by refresh failure only offers a read retry', async () => {
    jest.mocked(getAppointments).mockResolvedValueOnce([scheduled]).mockRejectedValueOnce(new Error('Sin conexión'));
    jest.mocked(cancelAppointment).mockResolvedValue('Cita cancelada correctamente.');
    renderScreen();
    fireEvent.press(await screen.findByRole('button', { name: 'Cancelar cita' }));
    await pressAlertButton('Cancelar cita');
    await screen.findByText(/El cambio fue realizado/);
    expect(screen.queryByRole('button', { name: 'Cancelar cita' })).toBeNull();
    jest.mocked(getAppointments).mockResolvedValue([]);
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Aún no tienes citas');
    expect(cancelAppointment).toHaveBeenCalledTimes(1);
  });

  test('the optional rescheduling reason is sent without allowing a new date', async () => {
    jest.mocked(getAppointments).mockResolvedValue([scheduled]);
    jest.mocked(rescheduleAppointment).mockResolvedValue('Solicitud enviada.');
    renderScreen();
    fireEvent.press(await screen.findByRole('button', { name: /Ver cita programada/ }));
    fireEvent.changeText(screen.getByLabelText('Motivo de reprogramación (opcional)'), '  Viaje  ');
    fireEvent.press(screen.getByRole('button', { name: 'Reprogramar' }));
    await pressAlertButton('Reprogramar');
    await waitFor(() => expect(rescheduleAppointment).toHaveBeenCalledWith('a1', 'Viaje'));
  });
});
