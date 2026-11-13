import type { AuthSession, PatientUser, RegisterPatientInput } from './types';
import { apiRequest } from '@/api/client';
import { asRecord, asString } from '@/validation/primitives';
import { parseAuthSession, parsePatientUser } from './parsers';

export type ResetPasswordInput = {
  email: string;
  code: string;
  password: string;
  password_confirmation: string;
};

const parseMessage = (value: unknown): string =>
  asString(asRecord(value, 'La respuesta del servidor'), 'message');

export const login = async (username: string, password: string): Promise<AuthSession> =>
  parseAuthSession(
    await apiRequest('/auth/login', {
      method: 'POST',
      body: { username, password },
    }),
  );

export const registerPatient = async (input: RegisterPatientInput): Promise<string> => {
  const response = asRecord(await apiRequest('/auth/register-paciente', { method: 'POST', body: input }), 'La respuesta de registro');
  if (response.requires_verification !== true) throw new Error('El servidor no confirmó la verificación pendiente.');
  return asString(response, 'email');
};

export const verifyEmail = async (email: string, code: string): Promise<AuthSession> =>
  parseAuthSession(await apiRequest('/auth/verify-email', { method: 'POST', body: { email, code } }));

export const resendVerificationCode = async (email: string): Promise<string> =>
  parseMessage(await apiRequest('/auth/resend-verification-code', { method: 'POST', body: { email } }));

export const requestPasswordReset = async (email: string): Promise<string> =>
  parseMessage(await apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }));

export const resetPassword = async (input: ResetPasswordInput): Promise<string> =>
  parseMessage(await apiRequest('/auth/reset-password', { method: 'POST', body: input }));

export const getCurrentUser = async (): Promise<PatientUser> =>
  parsePatientUser(await apiRequest('/user'));

export const logoutRemote = async (): Promise<void> => {
  await apiRequest('/auth/logout', { method: 'POST' });
};
