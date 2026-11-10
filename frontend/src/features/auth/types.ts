export type PatientUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: 'paciente';
  fotoPerfilUrl: string | null;
  pacienteId: string;
  activo: true;
};

export type AuthSession = {
  accessToken: string;
  tokenType: 'Bearer';
  user: PatientUser;
};

export type RegisterPatientInput = {
  nombres: string;
  cedula: string;
  email: string;
  telefono: string;
  direccion: string;
  fecha_nacimiento: string;
  password: string;
  password_confirmation: string;
};
