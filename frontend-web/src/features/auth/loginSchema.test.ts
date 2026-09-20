import { describe, expect, it } from 'vitest'
import { loginSchema } from './loginSchema'

describe('loginSchema', () => {
  it('rejects an invalid email and a short password', () => {
    const result = loginSchema.safeParse({ email: 'correo-invalido', password: '123' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain('Ingresa un correo válido.')
      expect(result.error.flatten().fieldErrors.password).toContain('La contraseña debe tener al menos 8 caracteres.')
    }
  })

  it('normalizes a valid email without altering the password', () => {
    const result = loginSchema.parse({ email: '  DOCTORA@CLINICA.COM ', password: 'Clave segura 2026' })

    expect(result).toEqual({ email: 'doctora@clinica.com', password: 'Clave segura 2026' })
  })
})

