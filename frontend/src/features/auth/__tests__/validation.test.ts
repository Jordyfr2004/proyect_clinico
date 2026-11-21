import { validateRegistration, validateResetPassword } from '../validation';

const valid = { nombres: 'Ana Pérez', cedula: '0102030405', email: 'ana@example.com', telefono: '0999999999', direccion: 'Quito', fecha_nacimiento: '1990-01-01', password: 'password123', password_confirmation: 'password123' };

describe('auth form validation', () => {
  test('accepts a complete patient registration', () => expect(validateRegistration(valid)).toBeNull());
  test('rejects invalid email, future birthdate and mismatched password', () => {
    expect(validateRegistration({ ...valid, email: 'bad', fecha_nacimiento: '2999-01-01', password_confirmation: 'other' })).toMatch(/correo|fecha|coincidir/i);
  });
  test('requires an exact six digit reset code and 8 character password', () => {
    expect(validateResetPassword('a@b.com', '123', 'short', 'short')).not.toBeNull();
    expect(validateResetPassword('a@b.com', '123456', 'password', 'password')).toBeNull();
  });
});
