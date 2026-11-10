import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'El usuario o cédula es obligatorio.'),
  password: z.string().min(1, 'La contraseña es obligatoria.').min(8, 'La contraseña debe tener al menos 8 caracteres.'),
})

export type LoginValues = z.infer<typeof loginSchema>
