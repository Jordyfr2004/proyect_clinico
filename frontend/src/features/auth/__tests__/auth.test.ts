import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { parseAuthSession, parsePatientUser } from '../parsers';
import { clearAccessToken, loadAccessToken, saveAccessToken } from '../session-storage';

jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => values.set(key, value)),
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => values.delete(key)),
  };
});

const patient = {
  id: 'user-1',
  name: 'Ana Pérez',
  username: '0102030405',
  email: 'ana@example.com',
  role: 'paciente',
  foto_perfil_url: null,
  paciente_id: 'patient-1',
  email_verified_at: '2026-01-01T00:00:00Z',
  activo: true,
};

describe('authentication contracts', () => {
  test('parses the patient fields returned by login and GET /user', () => {
    expect(parsePatientUser(patient)).toEqual({
      id: 'user-1',
      name: 'Ana Pérez',
      username: '0102030405',
      email: 'ana@example.com',
      role: 'paciente',
      fotoPerfilUrl: null,
      pacienteId: 'patient-1',
      activo: true,
    });
  });

  test('rejects staff roles and inactive or unlinked patient accounts', () => {
    expect(() => parsePatientUser({ ...patient, role: 'doctora' })).toThrow('exclusiva para pacientes');
    expect(() => parsePatientUser({ ...patient, activo: false })).toThrow('desactivada');
    expect(() => parsePatientUser({ ...patient, paciente_id: null })).toThrow('vinculada');
    expect(() => parsePatientUser({ ...patient, email_verified_at: null })).toThrow('verificar');
  });

  test('parses the direct Laravel login response without inventing fields', () => {
    expect(
      parseAuthSession({
        access_token: 'token-1',
        token_type: 'Bearer',
        user: patient,
      }),
    ).toEqual({
      accessToken: 'token-1',
      tokenType: 'Bearer',
      user: expect.objectContaining({ id: 'user-1', role: 'paciente' }),
    });
  });

  test('stores only the access token in SecureStore and removes it on clear', async () => {
    await saveAccessToken('token-1');
    await expect(loadAccessToken()).resolves.toBe('token-1');
    await clearAccessToken();
    await expect(loadAccessToken()).resolves.toBeNull();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('clinic.patient.access-token', 'token-1');
  });

  test('invalidates the stored token if SecureStore cannot delete it', async () => {
    await saveAccessToken('token-1');
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Keystore temporarily unavailable'));

    await expect(clearAccessToken()).resolves.toBeUndefined();
    expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith('clinic.patient.access-token', '');
    await expect(loadAccessToken()).resolves.toBeNull();
  });

  test('Expo Web keeps credentials only in memory without using native storage', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    jest.clearAllMocks();
    await saveAccessToken('web-token');
    await expect(loadAccessToken()).resolves.toBe('web-token');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    await clearAccessToken();
    await expect(loadAccessToken()).resolves.toBeNull();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: original });
  });
});
