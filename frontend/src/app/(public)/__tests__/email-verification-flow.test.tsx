import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/features/auth/auth-context';
import { resendVerificationCode } from '@/features/auth/service';
import { ApiError } from '@/api/errors';
import Login from '../login';
import Register from '../register';
import VerifyEmail from '../verify-email';

jest.mock('@/features/auth/auth-context', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/auth/service', () => ({ resendVerificationCode: jest.fn() }));
jest.mock('@/features/auth/validation', () => ({ validateRegistration: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const renderScreen = (element: React.ReactElement) => render(
  <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 720 }, insets: { top: 24, left: 0, right: 0, bottom: 24 } }}>
    {element}
  </SafeAreaProvider>,
);

describe('email verification flow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ email: 'ana@example.com' });
  });

  test('an existing unverified account goes from login to code entry', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      signIn: jest.fn().mockRejectedValue(new ApiError(422, 'Inválido', {}, null, true, 'ana@example.com')),
    });
    renderScreen(<Login />);
    fireEvent.changeText(screen.getByLabelText('Cédula'), '0102030405');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/(public)/verify-email', params: { email: 'ana@example.com' } }));
  });

  test('first registration goes to code entry without a session', async () => {
    (useAuth as jest.Mock).mockReturnValue({ signUp: jest.fn().mockResolvedValue('ana@example.com') });
    renderScreen(<Register />);
    fireEvent.press(screen.getByRole('button', { name: 'Registrarme' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/(public)/verify-email', params: { email: 'ana@example.com' } }));
  });

  test('code entry verifies and can resend to the registered email', async () => {
    const verifyEmail = jest.fn().mockResolvedValue(undefined);
    (useAuth as jest.Mock).mockReturnValue({ verifyEmail });
    (resendVerificationCode as jest.Mock).mockResolvedValue('Código de verificación reenviado correctamente.');
    renderScreen(<VerifyEmail />);
    fireEvent.press(screen.getByRole('link', { name: 'Reenviar código' }));
    await waitFor(() => expect(resendVerificationCode).toHaveBeenCalledWith('ana@example.com'));
    fireEvent.changeText(screen.getByLabelText('Código de 6 dígitos'), '123456');
    fireEvent.press(screen.getByRole('button', { name: 'Verificar correo' }));
    await waitFor(() => expect(verifyEmail).toHaveBeenCalledWith('ana@example.com', '123456'));
  });
});
