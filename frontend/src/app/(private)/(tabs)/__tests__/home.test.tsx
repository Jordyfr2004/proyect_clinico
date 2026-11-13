import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Home from '../index';
import { useRemote } from '@/hooks/use-remote';

jest.mock('@/hooks/use-remote', () => ({ useRemote: jest.fn() }));
jest.mock('@/features/auth/auth-context', () => ({ useAuth: () => ({ user: { name: 'Paciente de prueba' } }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));
const appointment = (id: string, date: string, status = 'programada') => ({
  id, date, status, type: 'cita_medica', startTime: '10:30:00', description: `Descripción ${id}`,
});
const renderHome = () => render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><Home /></SafeAreaProvider>);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-11-12T08:00:00').getTime());
});
afterEach(() => jest.restoreAllMocks());

test('shows the nearest future scheduled appointment and its actual details', () => {
  (useRemote as jest.Mock).mockReturnValue({ data: [appointment('later', '2026-12-10'), appointment('cancelled', '2026-11-13', 'cancelada'), appointment('past', '2026-10-01'), appointment('next', '2026-11-14')], loading: false, error: '', reload: jest.fn() });
  renderHome();
  expect(screen.getByText('Hola, Paciente de prueba')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Ver detalles de la cita' }));
  expect(screen.getByText('Descripción next')).toBeTruthy();
  expect(screen.queryByText('Descripción cancelled')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
  fireEvent.press(screen.getByText('Historial'));
  expect(router.push).toHaveBeenCalledWith('/(private)/(tabs)/history');
});

test('does not replace an API error with an empty or invented appointment', () => {
  const reload = jest.fn();
  (useRemote as jest.Mock).mockReturnValue({ data: null, loading: false, error: 'Servidor no disponible', reload });
  renderHome();
  expect(screen.getByText('Servidor no disponible')).toBeTruthy();
  expect(screen.queryByText('No tienes citas próximas programadas.')).toBeNull();
  expect(screen.queryByText('Ver detalles de la cita')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  expect(reload).toHaveBeenCalledTimes(1);
});

test('shows empty and pending states without inventing a schedule', () => {
  (useRemote as jest.Mock).mockReturnValue({ data: [appointment('pending', '', 'pendiente')], loading: false, error: '', reload: jest.fn() });
  renderHome();
  expect(screen.getByText('Tu solicitud está pendiente')).toBeTruthy();
  expect(screen.getByText('No tienes citas próximas para recordar.')).toBeTruthy();
  expect(screen.queryByText('Ver detalles de la cita')).toBeNull();
});
