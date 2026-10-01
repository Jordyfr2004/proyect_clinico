import { z } from 'zod'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const createPatientSchema = z.object({
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios.').max(255, 'Máximo 255 caracteres.'),
  cedula: z.string().trim().min(1, 'La cédula es obligatoria.').max(20, 'Máximo 20 caracteres.'),
  telefono: z.string().trim().max(20, 'Máximo 20 caracteres.'),
  direccion: z.string().trim().max(255, 'Máximo 255 caracteres.'),
  fecha_nacimiento: z.union([z.literal(''), z.iso.date()]).refine((value) => !value || value <= today(), 'La fecha de nacimiento no puede ser futura.'),
})

export type CreatePatientFormValues = z.infer<typeof createPatientSchema>
