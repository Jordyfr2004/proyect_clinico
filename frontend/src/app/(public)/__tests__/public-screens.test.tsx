import { render, screen } from '@testing-library/react-native';
import Register from '../register';
import Login from '../login';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('@/features/auth/auth-context', () => ({ useAuth: () => ({ signIn: jest.fn(), signUp: jest.fn() }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

describe('public screen usability', () => {
  const renderScreen = (screen: React.ReactElement) => render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 720 }, insets: { top: 24, left: 0, right: 0, bottom: 24 } }}>{screen}</SafeAreaProvider>);
  test('registration offers native date selection and visible back navigation', () => {
    renderScreen(<Register />);
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fecha de nacimiento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrarme' })).toBeTruthy();
  });

  test('login groups both secondary actions as accessible links', () => {
    renderScreen(<Login />);
    expect(screen.getByRole('link', { name: 'Crear cuenta de paciente' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Olvidé mi contraseña' })).toBeTruthy();
  });
});
