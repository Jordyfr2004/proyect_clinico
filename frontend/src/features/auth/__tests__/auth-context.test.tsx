import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Button, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '../auth-context';
import * as authService from '../service';
import * as sessionStorage from '../session-storage';

jest.mock('../service');
jest.mock('../session-storage');
jest.mock('@/api/client', () => ({
  setAccessTokenProvider: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

const user = {
  id: 'user-1',
  name: 'Ana Pérez',
  username: '0102030405',
  email: 'ana@example.com',
  role: 'paciente' as const,
  fotoPerfilUrl: null,
  pacienteId: 'patient-1',
  activo: true as const,
};

function Probe() {
  const auth = useAuth();
  return (
    <View>
      <Text testID="status">{auth.status}</Text>
      <Text testID="name">{auth.user?.name ?? 'sin usuario'}</Text>
      <Button title="Ingresar" onPress={() => auth.signIn('0102030405', 'password123')} />
      <Button title="Salir" onPress={() => auth.signOut()} />
    </View>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sessionStorage.loadAccessToken as jest.Mock).mockResolvedValue(null);
    (sessionStorage.saveAccessToken as jest.Mock).mockResolvedValue(undefined);
    (sessionStorage.clearAccessToken as jest.Mock).mockResolvedValue(undefined);
  });

  test('does not expose a private user until a stored token is validated', async () => {
    (sessionStorage.loadAccessToken as jest.Mock).mockResolvedValue('stored-token');
    (authService.getCurrentUser as jest.Mock).mockResolvedValue(user);

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(screen.getByTestId('status').props.children).toBe('restoring');
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('authenticated'));
    expect(screen.getByTestId('name').props.children).toBe('Ana Pérez');
  });

  test('clears an invalid stored session and becomes anonymous', async () => {
    (sessionStorage.loadAccessToken as jest.Mock).mockResolvedValue('expired-token');
    (authService.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('anonymous'));
    expect(sessionStorage.clearAccessToken).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('name').props.children).toBe('sin usuario');
  });

  test('persists a validated login and clears locally even if remote logout fails', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      accessToken: 'token-1',
      tokenType: 'Bearer',
      user,
    });
    (authService.logoutRemote as jest.Mock).mockRejectedValue(new Error('Offline'));

    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('anonymous'));

    fireEvent.press(screen.getByText('Ingresar'));
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('authenticated'));
    expect(sessionStorage.saveAccessToken).toHaveBeenCalledWith('token-1');

    fireEvent.press(screen.getByText('Salir'));
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('anonymous'));
    expect(sessionStorage.clearAccessToken).toHaveBeenCalled();
  });
});
