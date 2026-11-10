import type { AuthSession, PatientUser } from './types';
import { asBoolean, asOptionalString, asRecord, asString } from '@/validation/primitives';

export const parsePatientUser = (value: unknown): PatientUser => {
  const user = asRecord(value, 'El usuario');
  const role = asString(user, 'role');
  if (role !== 'paciente') {
    throw new Error('Esta aplicación es exclusiva para pacientes.');
  }
  const activo = asBoolean(user, 'activo');
  if (!activo) throw new Error('Esta cuenta se encuentra desactivada.');
  const pacienteId = asOptionalString(user, 'paciente_id');
  if (!pacienteId) throw new Error('La cuenta no está vinculada a un paciente.');

  return {
    id: asString(user, 'id'),
    name: asString(user, 'name'),
    username: asString(user, 'username'),
    email: asOptionalString(user, 'email'),
    role,
    fotoPerfilUrl: asOptionalString(user, 'foto_perfil_url'),
    pacienteId,
    activo: true,
  };
};

export const parseAuthSession = (value: unknown): AuthSession => {
  const response = asRecord(value, 'La respuesta de autenticación');
  const tokenType = asString(response, 'token_type');
  if (tokenType.toLowerCase() !== 'bearer') {
    throw new Error('El servidor devolvió un tipo de sesión no compatible.');
  }

  return {
    accessToken: asString(response, 'access_token'),
    tokenType: 'Bearer',
    user: parsePatientUser(response.user),
  };
};
