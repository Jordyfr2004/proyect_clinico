import { z } from 'zod'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const registerPatientSchema = z.object({
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios.').max(255, 'Máximo 255 caracteres.'),
  cedula: z.string().trim().min(1, 'La cédula es obligatoria.').max(20, 'Máximo 20 caracteres.'),
  telefono: z.string().trim().min(1, 'El teléfono es obligatorio.').max(20, 'Máximo 20 caracteres.'),
  direccion: z.string().trim().min(1, 'La dirección es obligatoria.').max(255, 'Máximo 255 caracteres.'),
  fecha_nacimiento: z.iso.date().refine((value) => value <= today(), 'La fecha de nacimiento no puede ser futura.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  password_confirmation: z.string().min(1, 'Confirma la contraseña.'),
}).refine(({ password, password_confirmation }) => password === password_confirmation, {
  path: ['password_confirmation'],
  message: 'Las contraseñas no coinciden.',
})

export type RegisterPatientValues = z.infer<typeof registerPatientSchema>
