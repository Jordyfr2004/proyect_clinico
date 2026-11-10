import type { RegisterPatientInput } from './types';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const passwordBytes = (value: string) => new TextEncoder().encode(value).length;
export const validateRegistration = (input: RegisterPatientInput): string | null => {
  if (Object.values(input).some((value) => !value.trim())) return 'Completa todos los campos.';
  if (!emailPattern.test(input.email)) return 'Ingresa un correo válido.';
  if (!isoDatePattern.test(input.fecha_nacimiento)) return 'La fecha debe usar el formato AAAA-MM-DD.';
  const birthdate = new Date(`${input.fecha_nacimiento}T00:00:00`);
  if (Number.isNaN(birthdate.getTime()) || birthdate > new Date()) return 'La fecha de nacimiento no puede ser futura.';
  if (input.password.length < 8 || passwordBytes(input.password) > 72) return 'La contraseña debe tener entre 8 y 72 bytes.';
  if (input.password !== input.password_confirmation) return 'Las contraseñas deben coincidir.';
  return null;
};
export const validateResetPassword = (email: string, code: string, password: string, confirmation: string): string | null => {
  if (!emailPattern.test(email.trim())) return 'Ingresa un correo válido.';
  if (!/^\d{6}$/.test(code)) return 'El código debe tener 6 dígitos.';
  if (password.length < 8 || passwordBytes(password) > 72) return 'La contraseña debe tener entre 8 y 72 bytes.';
  if (password !== confirmation) return 'Las contraseñas deben coincidir.';
  return null;
};
