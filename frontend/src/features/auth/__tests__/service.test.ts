import { apiRequest } from '@/api/client';
import {
  getCurrentUser,
  login,
  logoutRemote,
  registerPatient,
  requestPasswordReset,
  resetPassword,
} from '../service';

jest.mock('@/api/client', () => ({ apiRequest: jest.fn() }));

const patient = {
  id: 'user-1',
  name: 'Ana Pérez',
  username: '0102030405',
  email: 'ana@example.com',
  role: 'paciente',
  foto_perfil_url: null,
  paciente_id: 'patient-1',
  activo: true,
};

describe('authentication service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('logs in with the exact username/password contract and validates the response', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      access_token: 'token-1',
      token_type: 'Bearer',
      user: patient,
    });

    await expect(login('0102030405', 'password123')).resolves.toMatchObject({
      accessToken: 'token-1',
      user: { role: 'paciente' },
    });
    expect(apiRequest).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { username: '0102030405', password: 'password123' },
    });
  });

  test('registers with only the fields accepted by Laravel', async () => {
    const input = {
      nombres: 'Ana Pérez',
      cedula: '0102030405',
      email: 'ana@example.com',
      telefono: '0999999999',
      direccion: 'Quito',
      fecha_nacimiento: '1990-01-01',
      password: 'password123',
      password_confirmation: 'password123',
    };
    (apiRequest as jest.Mock).mockResolvedValue({
      access_token: 'token-1',
      token_type: 'Bearer',
      user: patient,
    });

    await registerPatient(input);
    expect(apiRequest).toHaveBeenCalledWith('/auth/register-paciente', {
      method: 'POST',
      body: input,
    });
  });

  test('uses the generic server message for password recovery and its exact reset contract', async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce({ message: 'Solicitud procesada.' })
      .mockResolvedValueOnce({ message: 'Contraseña restablecida correctamente.' });

    await expect(requestPasswordReset('ana@example.com')).resolves.toBe('Solicitud procesada.');
    await expect(
      resetPassword({
        email: 'ana@example.com',
        code: '123456',
        password: 'password123',
        password_confirmation: 'password123',
      }),
    ).resolves.toBe('Contraseña restablecida correctamente.');
    expect(apiRequest).toHaveBeenNthCalledWith(1, '/auth/forgot-password', {
      method: 'POST',
      body: { email: 'ana@example.com' },
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/auth/reset-password', {
      method: 'POST',
      body: {
        email: 'ana@example.com',
        code: '123456',
        password: 'password123',
        password_confirmation: 'password123',
      },
    });
  });

  test('validates GET /user and logs out through the authenticated endpoint', async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce(patient).mockResolvedValueOnce({
      message: 'Sesión cerrada correctamente.',
    });

    await expect(getCurrentUser()).resolves.toMatchObject({ id: 'user-1' });
    await logoutRemote();
    expect(apiRequest).toHaveBeenNthCalledWith(1, '/user');
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/auth/logout', { method: 'POST' });
  });
});
